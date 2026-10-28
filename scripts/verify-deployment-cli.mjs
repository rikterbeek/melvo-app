#!/usr/bin/env node
/**
 * Observes the deployed site and prints the evidence block for the verification record.
 *
 * Input comes from the deploy run itself — PAGE_URL is the deploy job's `page_url` output —
 * so the URL under test is the one the host assigned, not one derived from the git remote.
 *
 *   PAGE_URL=... RUN_URL=... RUN_CONCLUSION=success node scripts/verify-deployment-cli.mjs
 *
 * Exits non-zero when any acceptance criterion fails.
 */

import { verifyDeployment, formatEvidence } from '../src/verify-deployment.mjs'
import { request } from '../src/http-client.mjs'

const runSummary = {
  conclusion: process.env.RUN_CONCLUSION ?? 'success',
  status: 'completed',
  html_url: process.env.RUN_URL ?? null,
  outputs: { page_url: process.env.PAGE_URL },
}

const record = await verifyDeployment({ runSummary, httpGet: request })

console.log('### Deploy verification — Hello, world! site\n')
console.log(formatEvidence(record))

if (!record.ok) process.exitCode = 1
