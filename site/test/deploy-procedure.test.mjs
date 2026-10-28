import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { read, repoRoot, section, numberedSteps } from './helpers.mjs'

const readme = read('README.md')
const hosting = read('docs/hosting.md')

/** Every Pages source GitHub offers. Exactly one of these may be named as *the* source. */
const PAGES_SOURCES = ['GitHub Actions', 'Deploy from a branch']

test('FR-DEPLOY-2 · exactly one Pages source is named, and only docs/hosting.md names it', () => {
  const declarations = [...hosting.matchAll(/^\*\*Pages source:\*\* (.+)$/gm)].map((m) => m[1].trim())
  assert.equal(declarations.length, 1, 'docs/hosting.md must declare the Pages source exactly once')
  assert.ok(PAGES_SOURCES.includes(declarations[0]), `unknown Pages source: ${declarations[0]}`)

  const canonical = declarations[0]
  const others = PAGES_SOURCES.filter((s) => s !== canonical)
  for (const [name, doc] of [['README.md', readme], ['docs/hosting.md', hosting]]) {
    for (const other of others) {
      assert.ok(!doc.includes(other), `${name} still names the rejected Pages source "${other}"`)
    }
    for (const stale of ['gh-pages', 'branch source', '/docs folder']) {
      assert.ok(!doc.includes(stale), `${name} still carries contradictory branch-source wording: "${stale}"`)
    }
  }

  assert.ok(!readme.includes(canonical), 'the README must reference docs/hosting.md, not restate the Pages source')
})

test('FR-DEPLOY-2 · the declared Pages source matches the deploy mechanism that actually exists', () => {
  const workflow = join(repoRoot, '.github/workflows/deploy-pages.yml')
  assert.ok(existsSync(workflow), 'the GitHub Actions deploy workflow must exist')
  assert.ok(hosting.includes('.github/workflows/deploy-pages.yml'), 'docs/hosting.md must name the workflow file')
})

test('FR-DEPLOY-2 · the README points at the single deploy procedure instead of restating it', () => {
  const deploy = section(readme, 'Deploy')
  assert.ok(deploy, 'the README must have a Deploy section')
  assert.match(deploy, /docs\/hosting\.md/, 'the README Deploy section must link to docs/hosting.md')
  for (const restated of ['git push', 'Settings', 'workflow_dispatch', '1.']) {
    assert.ok(!deploy.includes(restated), `the README Deploy section restates the procedure ("${restated}")`)
  }
})

test('FR-DEPLOY-2 · the deploy procedure runs from a clean checkout with no implicit step', () => {
  const deploy = section(hosting, 'Deploy')
  assert.ok(deploy, 'docs/hosting.md must have a Deploy section')

  const steps = numberedSteps(deploy)
  assert.ok(steps.length >= 5, `expected a numbered procedure, found ${steps.length} steps`)
  steps.forEach((step, index) => {
    assert.match(
      step,
      /`[^`]+`|\(GitHub UI\)/,
      `step ${index + 1} leaves the action implicit — give a command in backticks or mark it (GitHub UI)`,
    )
  })
  assert.deepEqual(
    steps.map((s) => Number(s.match(/^(\d+)\./)[1])),
    steps.map((_, i) => i + 1),
    'the procedure steps must be numbered consecutively from 1',
  )

  for (const required of [/git clone/, /Settings/, /Pages/, /git push/, /Run workflow|workflow_dispatch/]) {
    assert.match(deploy, required, `the procedure is missing a step matching ${required}`)
  }
})

test('RFC-1 §9 · the 404 and TLS runbook sits next to the deploy step', () => {
  const deploy = section(hosting, 'Deploy')
  const runbook = section(deploy, 'Runbook')
  assert.ok(runbook, 'the runbook must be a subsection of the Deploy section, not a separate document')

  const case404 = section(runbook, '404')
  assert.ok(case404, 'the runbook must cover: 404 at /')
  assert.match(case404, /`[^`]+`/, 'the 404 case must give a concrete check or command')

  const caseTls = section(runbook, 'TLS not provisioned')
  assert.ok(caseTls, 'the runbook must cover: TLS not provisioned')
  assert.match(caseTls, /`[^`]+`/, 'the TLS case must give a concrete check or command')
})
