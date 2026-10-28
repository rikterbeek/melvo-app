// Intents for the artefact the README teaches a reader to deploy: the single
// static document RFC-1 §1/§3 specifies, served at `/`.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const html = readFileSync(`${repoRoot}index.html`, 'utf8')

test('FR-SITE-1: the root document is a valid HTML5 document', () => {
  assert.match(html, /^<!DOCTYPE html>/i)
  assert.match(html, /<html[^>]*\slang="en"/)
  assert.match(html, /<meta\s+charset="utf-8"\s*\/?>/i)
  assert.match(html, /<title>[^<]+<\/title>/)
})

test('FR-SITE-2: the page renders the literal text "Hello, world!"', () => {
  assert.match(html, /<h1>Hello, world!<\/h1>/)
})

test('FR-SITE-3: the page is legible at mobile viewport widths', () => {
  assert.match(
    html,
    /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"\s*\/?>/,
  )
})

test('FR-SITE-4: the page makes no external request and runs no script', () => {
  assert.doesNotMatch(html, /<script/i)
  assert.doesNotMatch(html, /https?:\/\//i)
})
