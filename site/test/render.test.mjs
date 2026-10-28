import { test } from 'node:test'
import assert from 'node:assert/strict'

import { renderCanonicalUrl, renderRfc1T2 } from '../scripts/lib/render.mjs'

const observed = {
  source: 'deploy-run',
  canonicalUrl: 'https://example.github.io/demo/',
  finalUrl: 'https://example.github.io/demo/',
  httpStatus: 200,
  observedAt: '2026-10-28T09:15:00.000Z',
  runUrl: 'https://github.com/example/demo/actions/runs/42',
}

const unobserved = {
  source: 'not-yet-observed',
  canonicalUrl: null,
  finalUrl: null,
  httpStatus: null,
  observedAt: null,
  runUrl: null,
}

test('FR-DEPLOY-2 · an observed record renders the URL with its observation evidence', () => {
  const block = renderCanonicalUrl(observed)
  assert.match(block, /https:\/\/example\.github\.io\/demo\//)
  assert.match(block, /observed/i)
  assert.match(block, /2026-10-28T09:15:00\.000Z/)
  assert.match(block, /200/)
  assert.match(block, /actions\/runs\/42/)
  assert.match(block, /not derived from the git remote/i)
})

test('FR-DEPLOY-2 · an unobserved record renders no URL at all', () => {
  const block = renderCanonicalUrl(unobserved)
  assert.match(block, /not yet observed/i)
  assert.ok(!/github\.io/.test(block), 'an unobserved record must not render a guessed URL')
  assert.match(block, /npm run record:deploy/, 'it must say how to record one')
})

test('RFC-1 T2 · resolution tracks the observation', () => {
  assert.match(renderRfc1T2(observed), /Resolved.*https:\/\/example\.github\.io\/demo\//s)
  assert.match(renderRfc1T2(unobserved), /Open/)
  assert.ok(!/github\.io/.test(renderRfc1T2(unobserved)))
})
