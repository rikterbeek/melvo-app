import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const indexPath = fileURLToPath(new URL('../index.html', import.meta.url))

describe('FR-PAGE-1 index.html is the document served at /', () => {
  test('intent FR-PAGE-1: an index.html exists at the repository root so the host can serve it at /', () => {
    assert.equal(existsSync(indexPath), true, 'index.html must exist at the repository root')
  })

  test('intent FR-PAGE-2: the page renders the literal text "Hello, world!"', () => {
    assert.match(readFileSync(indexPath, 'utf8'), /Hello, world!/)
  })

  test('intent FR-PAGE-3: the document is a valid HTML5 document with doctype, utf-8 charset and a title', () => {
    const html = readFileSync(indexPath, 'utf8')
    assert.match(html, /^<!DOCTYPE html>/i, 'must open with <!DOCTYPE html>')
    assert.match(html, /<meta\s+charset=["']utf-8["']\s*\/?>/i, 'must declare a utf-8 charset')
    assert.match(html, /<title>[^<]+<\/title>/i, 'must declare a non-empty <title>')
    assert.match(html, /<html[^>]*\slang=/i, 'must declare a document language')
  })

  test('intent FR-PAGE-4: the page is legible at mobile widths via a viewport meta tag', () => {
    assert.match(
      readFileSync(indexPath, 'utf8'),
      /<meta\s+name=["']viewport["']\s+content=["']width=device-width,\s*initial-scale=1["']\s*\/?>/i,
    )
  })

  test('intent SEC-2: the page makes no external requests and runs no script', () => {
    const html = readFileSync(indexPath, 'utf8')
    assert.doesNotMatch(html, /<script/i, 'must contain no <script> tags')
    assert.doesNotMatch(html, /https?:\/\//i, 'must reference no absolute http(s) URLs')
  })
})
