import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

import { read, repoRoot } from './helpers.mjs'
import { renderCanonicalUrl, renderRfc1T2 } from '../scripts/lib/render.mjs'

const observation = JSON.parse(read('deploy-observation.json'))
const readme = read('README.md')
const hosting = read('docs/hosting.md')

const OBSERVED = observation.source === 'deploy-run'

test('FR-DEPLOY-2 · the recorded URL carries deploy-run provenance, never a git-remote derivation', () => {
  assert.ok(
    ['deploy-run', 'not-yet-observed'].includes(observation.source),
    `deploy-observation.json source must be "deploy-run" or "not-yet-observed", got ${JSON.stringify(observation.source)}`,
  )

  if (!OBSERVED) {
    assert.equal(observation.canonicalUrl, null, 'an unobserved record must not carry a URL')
    return
  }

  assert.match(observation.canonicalUrl, /^https:\/\/\S+\/$/, 'canonical URL must be an https URL ending in /')
  assert.equal(observation.httpStatus, 200, 'the observation must record a 200 from GET /')
  assert.match(observation.observedAt, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/, 'observedAt must be a UTC instant')
  assert.match(observation.runUrl, /^https:\/\/github\.com\/\S+\/actions\/runs\/\d+$/, 'the observation must cite the deploy run')
  assert.equal(observation.finalUrl, observation.canonicalUrl, 'the observed final URL must be the canonical URL')
})

test('FR-DEPLOY-2 · the recorded URL is not the URL derived from the git remote unless a deploy run observed it', () => {
  if (!OBSERVED) return
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: repoRoot, encoding: 'utf8' }).trim()
  const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
  assert.ok(match, `could not parse the git remote: ${remote}`)
  const derived = `https://${match[1].toLowerCase()}.github.io/${match[2]}/`
  if (observation.canonicalUrl === derived) {
    assert.equal(
      observation.source,
      'deploy-run',
      'a URL equal to the git-remote derivation may only be recorded when a deploy run actually observed it',
    )
    assert.ok(observation.runUrl, 'such a URL must cite the deploy run that observed it')
  }
})

test('FR-DEPLOY-2 · the README records the canonical URL and labels it as observed deploy output', () => {
  const block = generatedBlock(readme, 'canonical-url')
  assert.equal(block, renderCanonicalUrl(observation).trim(), 'README canonical-url block is out of sync with deploy-observation.json')

  if (OBSERVED) {
    assert.ok(block.includes(observation.canonicalUrl), 'the README must show the observed URL verbatim')
    assert.match(block, /observed/i, 'the README must note that the URL is observed deploy output')
    assert.ok(block.includes(observation.runUrl), 'the README must cite the deploy run the URL came from')
  } else {
    assert.match(block, /not yet observed/i, 'with no observation the README must say so rather than show a URL')
  }
  assert.match(block, /not derived from the git remote/i, 'the README must state the URL is not a git-remote derivation')
})

test('RFC-1 T2 · the deployed-URL question is recorded resolved with the observed URL', () => {
  const block = generatedBlock(hosting, 'rfc1-t2')
  assert.equal(block, renderRfc1T2(observation).trim(), 'RFC-1 T2 block is out of sync with deploy-observation.json')
  assert.match(block, /RFC-1 T2/, 'the block must name RFC-1 T2')

  if (OBSERVED) {
    assert.match(block, /\bResolved\b/, 'with an observation, T2 must be recorded as resolved')
    assert.ok(block.includes(observation.canonicalUrl), 'T2 must be resolved with the observed URL')
  } else {
    assert.match(block, /\bOpen\b/, 'without an observation, T2 must stay open rather than claim a URL')
  }
})

test('FR-DEPLOY-2 · every document that states the canonical URL states the same one', () => {
  if (!OBSERVED) return
  const urls = new Set()
  for (const doc of [readme, hosting]) {
    for (const url of doc.match(/https:\/\/[a-z0-9-]+\.github\.io\/\S*/gi) ?? []) {
      // Strip the markdown/punctuation the URL is wrapped in: <url>, `url`, (url), "url," …
      urls.add(url.replace(/[)>,.`'"*\]]+$/, ''))
    }
  }
  assert.deepEqual([...urls], [observation.canonicalUrl], 'the docs name more than one deployed URL')
})

function generatedBlock(markdown, name) {
  const match = markdown.match(
    new RegExp(`<!-- BEGIN generated:${name} -->\\n([\\s\\S]*?)\\n<!-- END generated:${name} -->`),
  )
  assert.ok(match, `missing generated:${name} block`)
  return match[1].trim()
}
