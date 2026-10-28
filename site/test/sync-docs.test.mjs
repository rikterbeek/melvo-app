import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { root } from './helpers.mjs'

const OBSERVED = {
  source: 'deploy-run',
  canonicalUrl: 'https://example.github.io/demo/',
  finalUrl: 'https://example.github.io/demo/',
  httpStatus: 200,
  observedAt: '2026-10-28T09:15:00.000Z',
  runUrl: 'https://github.com/example/demo/actions/runs/42',
}

/** A throwaway copy of the site with the given observation already recorded, already synced. */
function syncedCopy(observation) {
  const dir = mkdtempSync(join(tmpdir(), 'site-'))
  cpSync(root, dir, { recursive: true, filter: (src) => !src.includes('node_modules') })
  writeFileSync(join(dir, 'deploy-observation.json'), `${JSON.stringify(observation, null, 2)}\n`)
  execFileSync(process.execPath, [join(dir, 'scripts/sync-docs.mjs')], { stdio: 'pipe' })
  return dir
}

test('FR-DEPLOY-2 · recording an observation publishes the same URL into every document', (t) => {
  const dir = syncedCopy(OBSERVED)
  t.after(() => rmSync(dir, { recursive: true, force: true }))

  const readme = readFileSync(join(dir, 'README.md'), 'utf8')
  const hosting = readFileSync(join(dir, 'docs/hosting.md'), 'utf8')

  for (const [name, doc] of [['README.md', readme], ['docs/hosting.md', hosting]]) {
    assert.ok(doc.includes(OBSERVED.canonicalUrl), `${name} does not state the observed URL`)
    assert.ok(doc.includes(OBSERVED.runUrl), `${name} does not cite the deploy run`)
    assert.ok(!doc.includes('not yet observed'), `${name} still says the URL is unobserved`)
  }
  assert.match(hosting, /RFC-1 T2 \(deployed URL\) — Resolved: <https:\/\/example\.github\.io\/demo\/>/)
})

test('FR-DEPLOY-2 · docs:check passes on synced docs and fails once the observation moves on', (t) => {
  const dir = syncedCopy(OBSERVED)
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const check = () => execFileSync(process.execPath, [join(dir, 'scripts/sync-docs.mjs'), '--check'], { stdio: 'pipe' })

  check()

  writeFileSync(
    join(dir, 'deploy-observation.json'),
    `${JSON.stringify({ ...OBSERVED, canonicalUrl: 'https://example.github.io/other/' }, null, 2)}\n`,
  )
  assert.throws(check, /out of date/, 'a stale document must fail docs:check')
})
