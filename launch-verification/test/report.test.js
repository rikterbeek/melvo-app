import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { runChecklist, PASS, FAIL } from '../src/checks.js'
import { renderReport, renderBlockedReport } from '../src/report.js'

function evidence () {
  return {
    url: 'https://hello.example.app/',
    checkedAt: '2026-10-28T09:00:00.000Z',
    checker: 'site owner',
    https: {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      rawHead: 'HTTP/2 200\ncontent-type: text/html; charset=utf-8',
      body: '<!DOCTYPE html><html><body><h1>Hello, world!</h1></body></html>'
    },
    http: { status: 301, headers: { location: 'https://hello.example.app/' } },
    tls: { valid: true, issuer: "Let's Encrypt", validTo: '2027-01-26T00:00:00.000Z', error: null },
    browser: {
      viewports: [
        { width: 375, helloWorldVisible: true, horizontalScroll: false },
        { width: 1280, helloWorldVisible: true, horizontalScroll: false }
      ],
      consoleErrors: [],
      requests: [{ url: 'https://hello.example.app/', status: 200 }]
    },
    secondCheck: { performed: true, network: 'mobile tethering', status: 200, helloWorldVisible: true }
  }
}

describe('verification record', () => {
  test('AC-1 · the record states the gate outcome, the URL, the date and the checker', () => {
    const markdown = renderReport(runChecklist(evidence()))
    assert.match(markdown, /\*\*Outcome\*\* \| PASS/)
    assert.match(markdown, /https:\/\/hello\.example\.app\//)
    assert.match(markdown, /2026-10-28T09:00:00\.000Z/)
    assert.match(markdown, /site owner/)
  })

  test('AC-1 · the record contains a row per check with its verdict', () => {
    const markdown = renderReport(runChecklist(evidence()))
    for (const id of ['CHK-1', 'CHK-2', 'CHK-3', 'CHK-4', 'CHK-5', 'CHK-6', 'CHK-7', 'CHK-8']) {
      assert.match(markdown, new RegExp(`\\| ${id} \\|`), `expected a row for ${id}`)
    }
  })

  test('AC-1 · the record embeds the raw curl response head as evidence', () => {
    const markdown = renderReport(runChecklist(evidence()))
    assert.match(markdown, /content-type: text\/html; charset=utf-8/)
  })

  test('AC-2 · the record names the independent second check', () => {
    const markdown = renderReport(runChecklist(evidence()))
    assert.match(markdown, /mobile tethering/)
  })

  test('AC-1 · a failing check surfaces in the outcome and the failure list', () => {
    const failing = evidence()
    failing.https.status = 503
    const markdown = renderReport(runChecklist(failing))
    assert.match(markdown, /\*\*Outcome\*\* \| FAIL/)
    assert.match(markdown, /503/)
  })

  test('R5 · a host-injected script appears under known deviations', () => {
    const deviating = evidence()
    deviating.https.body = deviating.https.body.replace('</body>', '<script src="/_host/analytics.js"></script></body>')
    const markdown = renderReport(runChecklist(deviating))
    assert.match(markdown, /Known deviations/)
    assert.match(markdown, /_host\/analytics\.js/)
    assert.match(markdown, /\*\*Outcome\*\* \| PASS/)
  })

  test('R5 · a clean page states that no deviation was found', () => {
    const markdown = renderReport(runChecklist(evidence()))
    assert.match(markdown, /no host-injected script/i)
  })

  test("AC-1 · the checker's note is carried into the judged record", () => {
    const markdown = renderReport(runChecklist(evidence()), { note: 'checked from the office LAN on Firefox 142' })
    assert.match(markdown, /checked from the office LAN on Firefox 142/)
  })

  test("T2 · the checker's note is carried into the blocked record", () => {
    const markdown = renderBlockedReport({
      checkedAt: '2026-10-28T09:00:00.000Z',
      checker: 'site owner',
      note: 'searched the repository for a published URL and found none'
    })
    assert.match(markdown, /searched the repository for a published URL and found none/)
  })

  test('T2 · with no deployed URL the record is BLOCKED and names RFC-1 T2', () => {
    const markdown = renderBlockedReport({ checkedAt: '2026-10-28T09:00:00.000Z', checker: 'site owner' })
    assert.match(markdown, /\*\*Outcome\*\* \| BLOCKED/)
    assert.match(markdown, /T2/)
    assert.doesNotMatch(markdown, new RegExp(PASS))
    assert.doesNotMatch(markdown, new RegExp(`\\b${FAIL}\\b`))
  })
})
