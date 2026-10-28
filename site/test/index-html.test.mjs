import { test } from 'node:test'
import assert from 'node:assert/strict'

import { read } from './helpers.mjs'

const html = read('index.html')

test('RFC-1 §1.1 · the page is a valid HTML5 document that renders "Hello, world!"', () => {
  assert.match(html, /^<!DOCTYPE html>/i, 'the document must open with <!DOCTYPE html>')
  assert.match(html, /<html lang="en">/, 'the document must declare its language')
  assert.match(html, /<meta charset="utf-8"\s*\/?>/i, 'the document must declare UTF-8')
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1"\s*\/?>/, 'the document must set the viewport')
  assert.match(html, /<title>[^<]+<\/title>/, 'the document must have a title')
  assert.match(html, /<h1>Hello, world!<\/h1>/, 'the body must render the literal text')
})

test('RFC-1 §1.2 · the page makes no external request and runs no script', () => {
  assert.ok(!/<script/i.test(html), 'the page must contain no <script> tag')
  assert.ok(!/https?:\/\//i.test(html), 'the page must reference no external host')
})
