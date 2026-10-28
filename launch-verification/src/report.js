/**
 * Renders the dated verification record required by the task: the artifact a
 * reviewer reads to see which PRD §18 checks ran, what they saw, and whether
 * the GA gate opened.
 */

import { DEVIATION, FAIL, BLOCKED, gateOutcome } from './checks.js'

const TITLE = '# Launch verification — PRD-1 §18 / RFC-1 §10'

function metaTable (rows) {
  return ['| | |', '|---|---|', ...rows.map(([k, v]) => `| **${k}** | ${v} |`)].join('\n')
}

function checkTable (checks) {
  return [
    '| ID | Check | Verdict | Observed |',
    '|---|---|---|---|',
    ...checks.map((c) => `| ${c.id} | ${c.title} | ${c.status} | ${c.detail} |`)
  ].join('\n')
}

function deviationSection (result) {
  const deviations = result.checks.filter((c) => c.status === DEVIATION)
  if (deviations.length === 0) {
    return '## Known deviations (R5)\n\nNone — no host-injected script was found in the served document.'
  }
  return [
    '## Known deviations (R5)',
    '',
    'Recorded, not treated as a gate failure:',
    '',
    ...deviations.map((d) => `- **${d.id}** — ${d.detail}`)
  ].join('\n')
}

function failureSection (result) {
  const failures = result.checks.filter((c) => c.status === FAIL)
  if (failures.length === 0) return ''
  return [
    '',
    '## Failures',
    '',
    ...failures.map((f) => `- **${f.id}** ${f.title} — ${f.detail}`),
    ''
  ].join('\n')
}

function noteSection (note) {
  return note ? ['', "## Checker's note", '', note, ''].join('\n') : ''
}

/**
 * @param {ReturnType<import('./checks.js').runChecklist>} result
 * @param {{note?: string}} [options]
 */
export function renderReport (result, options = {}) {
  const outcome = gateOutcome(result)
  const evidence = result.evidence ?? {}

  return [
    TITLE,
    '',
    metaTable([
      ['Outcome', outcome],
      ['URL', result.url ?? 'unknown'],
      ['Checked at', result.checkedAt ?? 'unknown'],
      ['Checker', result.checker ?? 'unknown'],
      ['Second check', evidence.secondCheck?.performed
        ? `${evidence.secondCheck.network ?? 'unspecified'} — status ${evidence.secondCheck.status}`
        : 'not performed'],
      ['Task', 'TASK-vgrjnspaarw6 (RFC-1 M2)']
    ]),
    '',
    '## Checklist',
    '',
    checkTable(result.checks),
    failureSection(result),
    '',
    '## Raw response head',
    '',
    '```http',
    evidence.https?.rawHead || '(none captured)',
    '```',
    '',
    deviationSection(result),
    noteSection(options.note),
    ''
  ].join('\n')
}

/**
 * The record written when the deployed URL is still open (RFC-1 T2): the gate
 * cannot be judged, so it is reported blocked rather than passed.
 */
export function renderBlockedReport ({ checkedAt, checker, note }) {
  return [
    TITLE,
    '',
    metaTable([
      ['Outcome', BLOCKED],
      ['URL', 'not published — RFC-1 open question T2'],
      ['Checked at', checkedAt ?? new Date().toISOString()],
      ['Checker', checker ?? 'unknown'],
      ['Task', 'TASK-vgrjnspaarw6 (RFC-1 M2)']
    ]),
    '',
    '## Why this gate could not run',
    '',
    'The verification gate requires a live HTTPS URL. RFC-1 open question **T2 (deployed URL)**',
    'is unresolved and no URL is published in this repository, so none of the PRD §18 checks could',
    'be executed against a live origin. Reporting the gate as unjudged is the correct outcome:',
    'an un-run check must never be recorded as a passing one.',
    '',
    '## What unblocks it',
    '',
    '1. Resolve RFC-1 **T1** (host choice) and deploy `index.html` (RFC-1 M1).',
    '2. Record the resulting URL as RFC-1 **T2**.',
    '3. Re-run `node launch-verification/src/cli.js --url <url> --evidence <file> --out docs/launch-verification-RFC-1.md`,',
    '   which overwrites this record with the judged checklist.',
    noteSection(note),
    ''
  ].join('\n')
}
