#!/usr/bin/env node
/**
 * Records the deployed URL by fetching it, then re-renders the documentation from the result.
 *
 *   npm run record:deploy -- --url https://<host>/<path>/ --run-url https://github.com/<o>/<r>/actions/runs/<id>
 *
 * The URL is only written if the fetch returns 200 and the body is the page we deployed, so
 * `deploy-observation.json` can never hold a URL that nobody has loaded.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = fileURLToPath(new URL('..', import.meta.url))

const args = parseArgs(process.argv.slice(2))
if (!args.url || !args['run-url']) {
  console.error('Usage: npm run record:deploy -- --url <deployed-url> --run-url <actions-run-url>')
  process.exit(2)
}

const url = args.url.endsWith('/') ? args.url : `${args.url}/`
if (!url.startsWith('https://')) {
  console.error(`Refusing to record a non-HTTPS URL: ${url}`)
  process.exit(1)
}

const response = await fetch(url, { redirect: 'follow' })
const body = await response.text()

if (response.status !== 200) {
  console.error(`GET ${url} returned ${response.status} — see the "404 at /" runbook in docs/hosting.md`)
  process.exit(1)
}
if (!body.includes('Hello, world!')) {
  console.error(`GET ${url} returned 200 but did not serve this site's index.html — nothing recorded`)
  process.exit(1)
}

const observation = JSON.parse(readFileSync(`${root}deploy-observation.json`, 'utf8'))
writeFileSync(
  `${root}deploy-observation.json`,
  `${JSON.stringify(
    {
      ...observation,
      source: 'deploy-run',
      canonicalUrl: url,
      finalUrl: response.url,
      httpStatus: response.status,
      observedAt: new Date().toISOString(),
      runUrl: args['run-url'],
    },
    null,
    2,
  )}\n`,
)

execFileSync(process.execPath, [`${root}scripts/sync-docs.mjs`], { stdio: 'inherit' })
console.log(`Recorded ${url} (${response.status}) as observed deploy output.`)

function parseArgs(argv) {
  const parsed = {}
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue
    parsed[argv[i].slice(2)] = argv[i + 1]
    i += 1
  }
  return parsed
}
