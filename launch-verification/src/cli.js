#!/usr/bin/env node
/**
 * launch-verify — runs the PRD-1 §18 / RFC-1 §10 launch checklist against the
 * deployed URL and writes the dated verification record.
 *
 *   node src/cli.js --url https://<url>/ --evidence evidence.json --out record.md
 *
 * `--evidence` carries the observations only a human with a browser can make
 * (viewport rendering, console errors, request list, the independent second
 * check). Omit it and those checks fail as "no evidence captured" — never pass.
 * Omit `--url` and the run is BLOCKED (RFC-1 T2).
 */

import fs from 'node:fs/promises'

import { probe } from './probe.js'
import { runChecklist, gateOutcome, PASS } from './checks.js'
import { renderReport, renderBlockedReport } from './report.js'

export const EXIT_PASS = 0
export const EXIT_FAIL = 1
export const EXIT_BLOCKED = 2

const DEFAULT_OUT = 'docs/launch-verification-RFC-1.md'

export function parseArgs (argv) {
  const args = { url: null, evidence: null, out: DEFAULT_OUT, offline: false }
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (flag === '--url') args.url = argv[++i] ?? null
    else if (flag === '--evidence') args.evidence = argv[++i] ?? null
    else if (flag === '--out') args.out = argv[++i] ?? DEFAULT_OUT
    else if (flag === '--offline') args.offline = true
  }
  return args
}

async function readManualEvidence (file) {
  if (!file) return {}
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

/**
 * @param {string[]} argv
 * @param {{log?: (line: string) => void, now?: () => Date}} [io]
 * @returns {Promise<number>} the process exit code
 */
export async function main (argv, io = {}) {
  const log = io.log ?? console.log
  const now = io.now ?? (() => new Date())
  const args = parseArgs(argv)

  if (!args.url) {
    const manual = await readManualEvidence(args.evidence)
    const markdown = renderBlockedReport({
      checkedAt: now().toISOString(),
      checker: manual.checker,
      note: manual.note
    })
    await fs.writeFile(args.out, markdown)
    log(`BLOCKED — no deployed URL (RFC-1 T2). Record written to ${args.out}`)
    return EXIT_BLOCKED
  }

  const manual = await readManualEvidence(args.evidence)
  const probed = args.offline
    ? {
        url: args.url,
        checkedAt: manual.checkedAt ?? now().toISOString(),
        https: manual.https ?? { status: null, headers: {}, rawHead: '', body: '' },
        http: manual.http ?? { status: null, headers: {} },
        tls: manual.tls ?? { valid: false, error: 'no certificate evidence supplied' }
      }
    : await probe(args.url, { now })
  const evidence = {
    ...probed,
    checker: manual.checker ?? 'unknown',
    browser: manual.browser ?? { viewports: [], consoleErrors: [], requests: [] },
    secondCheck: manual.secondCheck ?? { performed: false }
  }

  const result = runChecklist(evidence)
  const outcome = gateOutcome(result)
  await fs.writeFile(args.out, renderReport(result, { note: manual.note }))
  log(`${outcome} — ${result.checks.filter((c) => c.status !== PASS).length} check(s) not passing. Record written to ${args.out}`)
  return outcome === PASS ? EXIT_PASS : EXIT_FAIL
}

/* c8 ignore next 3 -- process entry point, exercised via main() in tests */
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  process.exit(await main(process.argv.slice(2)))
}
