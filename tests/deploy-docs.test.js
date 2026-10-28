// Intents for TASK-xqt8v6f8b7x7 — PRD-1 G5, RFC-1 §9, closes RFC-1 T1/T2.
// Zero-dependency: Node's built-in test runner, so the repository keeps no
// build tooling and no dependencies (ADR-001 §4).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const readme = readFileSync(`${repoRoot}README.md`, 'utf8')

/** Section body for a `## `/`### ` heading, so a claim is asserted in context. */
const section = (heading) => {
  const lines = readme.split('\n')
  const start = lines.findIndex((line) => line.trim() === heading)
  assert.notEqual(start, -1, `README is missing the heading ${heading}`)
  const depth = heading.match(/^#+/)[0].length
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => {
    const level = line.match(/^(#+) /)
    return level !== null && level[1].length <= depth
  })
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

test('FR-DOC-1: README names the static host that serves the site', () => {
  assert.match(section('## Deploy'), /GitHub Pages/)
})

test('FR-DOC-2: README states the exact deploy step', () => {
  const deploy = section('## Deploy')
  assert.match(deploy, /push to the default branch/i)
  assert.match(deploy, /`main`/)
})

test('FR-DOC-3: README states the canonical deployed HTTPS URL', () => {
  assert.match(
    section('## Deploy'),
    /https:\/\/rikterbeek\.github\.io\/melvo-app\//,
  )
})

test('FR-DOC-4: README records the publish source that maps / to index.html', () => {
  const deploy = section('## Deploy')
  assert.match(deploy, /index\.html/)
  assert.match(deploy, /\/ \(root\)/)
})

test('FR-DOC-5: README reproduces a deploy from a clean checkout', () => {
  const reproduce = section('### Deploy from a clean checkout')
  assert.match(reproduce, /git clone https:\/\/github\.com\/rikterbeek\/melvo-app/)
  // Ordered, numbered steps a reader can follow without any other document.
  assert.match(reproduce, /^1\. /m)
  assert.match(reproduce, /^2\. /m)
  assert.match(reproduce, /^3\. /m)
})

test('FR-DOC-6: runbook covers a 404 at / as a publish-directory mapping fault', () => {
  const runbook = section('### Troubleshooting')
  assert.match(runbook, /404/)
  assert.match(runbook, /publish directory|publish source/i)
  assert.match(runbook, /root document|root-document/i)
})

test('FR-DOC-7: runbook covers a TLS warning as a certificate not yet provisioned', () => {
  const runbook = section('### Troubleshooting')
  assert.match(runbook, /TLS|certificate/)
  assert.match(runbook, /not yet (been )?provisioned/i)
})

test('FR-DOC-8: runbook documents exactly the two cases from RFC-1 §9', () => {
  const cases = section('### Troubleshooting').match(/^\| /gm) ?? []
  // Header row, separator row, then one row per case.
  assert.equal(cases.length, 4)
})
