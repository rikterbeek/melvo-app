import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { PASS, FAIL, DEVIATION, runChecklist, gateOutcome } from '../src/checks.js'

/** Evidence for a site that passes every PRD §18 check. */
function passingEvidence (overrides = {}) {
  return {
    url: 'https://hello.example.app/',
    checkedAt: '2026-10-28T09:00:00.000Z',
    checker: 'site owner',
    https: {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      rawHead: 'HTTP/2 200\ncontent-type: text/html; charset=utf-8',
      body: '<!DOCTYPE html><html lang="en"><head><title>Hello, world!</title></head><body><h1>Hello, world!</h1></body></html>'
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
    secondCheck: {
      performed: true,
      network: 'mobile tethering, different device',
      status: 200,
      helloWorldVisible: true
    },
    ...overrides
  }
}

function checkById (result, id) {
  const found = result.checks.find((c) => c.id === id)
  assert.ok(found, `expected check ${id} in the checklist`)
  return found
}

describe('PRD §18 launch checklist', () => {
  test('AC-1 · a live URL serving 200 with text/html passes the status check', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-1').status, PASS)
  })

  test('AC-1 · a non-200 status fails the status check', () => {
    const evidence = passingEvidence()
    evidence.https.status = 404
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-1').status, FAIL)
  })

  test('AC-1 · a non-HTML content-type fails the status check', () => {
    const evidence = passingEvidence()
    evidence.https.headers['content-type'] = 'application/octet-stream'
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-1').status, FAIL)
  })

  test('AC-1 · a missing content-type header fails the status check', () => {
    const evidence = passingEvidence()
    delete evidence.https.headers['content-type']
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-1').status, FAIL)
  })

  test('SEC-1 · plain HTTP redirecting to the HTTPS origin passes the redirect check', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-2').status, PASS)
  })

  test('SEC-1 · plain HTTP answering 200 instead of redirecting fails the redirect check', () => {
    const evidence = passingEvidence()
    evidence.http = { status: 200, headers: {} }
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-2').status, FAIL)
  })

  test('SEC-1 · a redirect to a plain-HTTP location fails the redirect check', () => {
    const evidence = passingEvidence()
    evidence.http = { status: 302, headers: { location: 'http://hello.example.app/' } }
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-2').status, FAIL)
  })

  test('SEC-1 · a valid certificate passes the certificate check', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-3').status, PASS)
  })

  test('SEC-1 · a certificate error fails the certificate check', () => {
    const evidence = passingEvidence()
    evidence.tls = { valid: false, error: 'CERT_HAS_EXPIRED' }
    const result = runChecklist(evidence)
    const check = checkById(result, 'CHK-3')
    assert.equal(check.status, FAIL)
    assert.match(check.detail, /CERT_HAS_EXPIRED/)
  })

  test('AC-1 · "Hello, world!" visible at 375 px and ≥ 1280 px with no horizontal scroll passes the render check', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-4').status, PASS)
  })

  test('AC-1 · a viewport where the greeting is not visible fails the render check', () => {
    const evidence = passingEvidence()
    evidence.browser.viewports[0].helloWorldVisible = false
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-4').status, FAIL)
  })

  test('AC-1 · horizontal scroll at any viewport fails the render check', () => {
    const evidence = passingEvidence()
    evidence.browser.viewports[1].horizontalScroll = true
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-4').status, FAIL)
  })

  test('AC-1 · missing the 375 px or the ≥ 1280 px viewport fails the render check', () => {
    const evidence = passingEvidence()
    evidence.browser.viewports = [{ width: 375, helloWorldVisible: true, horizontalScroll: false }]
    const result = runChecklist(evidence)
    const check = checkById(result, 'CHK-4')
    assert.equal(check.status, FAIL)
    assert.match(check.detail, /1280/)
  })

  test('AC-1 · an empty console passes the console check', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-5').status, PASS)
  })

  test('AC-1 · any console error fails the console check', () => {
    const evidence = passingEvidence()
    evidence.browser.consoleErrors = ['Refused to load the script …']
    const result = runChecklist(evidence)
    const check = checkById(result, 'CHK-5')
    assert.equal(check.status, FAIL)
    assert.match(check.detail, /Refused to load/)
  })

  test('D2 · exactly one request to the origin passes the request check', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-6').status, PASS)
  })

  test('PRD Q3 · a browser-initiated /favicon.ico 404 does not fail the request check', () => {
    const evidence = passingEvidence()
    evidence.browser.requests.push({ url: 'https://hello.example.app/favicon.ico', status: 404 })
    const result = runChecklist(evidence)
    const check = checkById(result, 'CHK-6')
    assert.equal(check.status, PASS)
    assert.match(check.detail, /favicon/)
  })

  test('D2 · a request to a host other than the origin fails the request check', () => {
    const evidence = passingEvidence()
    evidence.browser.requests.push({ url: 'https://fonts.googleapis.com/css', status: 200 })
    const result = runChecklist(evidence)
    const check = checkById(result, 'CHK-6')
    assert.equal(check.status, FAIL)
    assert.match(check.detail, /fonts\.googleapis\.com/)
  })

  test('D2 · a second same-origin request beyond the document fails the request check', () => {
    const evidence = passingEvidence()
    evidence.browser.requests.push({ url: 'https://hello.example.app/app.js', status: 200 })
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-6').status, FAIL)
  })

  test('D2 · a request URL that is not absolute is treated as a foreign host, not ignored', () => {
    const evidence = passingEvidence()
    evidence.browser.requests.push({ url: 'data:image/gif;base64,R0lGOD', status: 200 })
    const result = runChecklist(evidence)
    const check = checkById(result, 'CHK-6')
    assert.equal(check.status, FAIL)
    assert.match(check.detail, /data:image/)
  })

  test('D2 · an unparseable evidence URL fails the request check instead of throwing', () => {
    const evidence = passingEvidence()
    evidence.url = 'not-a-url'
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-6').status, FAIL)
  })

  test('R5 · a page with no script tag passes the host-injection check', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-7').status, PASS)
  })

  test('R5 · a host-injected script is recorded as a deviation, not a failure', () => {
    const evidence = passingEvidence()
    evidence.https.body = evidence.https.body.replace(
      '</body>',
      '<script src="/_vercel/insights/script.js"></script></body>'
    )
    const result = runChecklist(evidence)
    const check = checkById(result, 'CHK-7')
    assert.equal(check.status, DEVIATION)
    assert.match(check.detail, /insights\/script\.js/)
    assert.deepEqual(result.deviations.map((d) => d.id), ['CHK-7'])
  })

  test('GA gate · an independent second check passes the second-check requirement', () => {
    const result = runChecklist(passingEvidence())
    assert.equal(checkById(result, 'CHK-8').status, PASS)
  })

  test('GA gate · a second check that was never performed fails the second-check requirement', () => {
    const evidence = passingEvidence()
    evidence.secondCheck = { performed: false }
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-8').status, FAIL)
  })

  test('GA gate · a second check that did not see the greeting fails the second-check requirement', () => {
    const evidence = passingEvidence()
    evidence.secondCheck = { performed: true, network: 'mobile', status: 200, helloWorldVisible: false }
    const result = runChecklist(evidence)
    assert.equal(checkById(result, 'CHK-8').status, FAIL)
  })
})

describe('gate outcome', () => {
  test('AC-1 · every check passing yields a PASS gate', () => {
    assert.equal(gateOutcome(runChecklist(passingEvidence())), PASS)
  })

  test('R5 · a recorded deviation alone still yields a PASS gate', () => {
    const evidence = passingEvidence()
    evidence.https.body = evidence.https.body.replace('</body>', '<script src="/host.js"></script></body>')
    assert.equal(gateOutcome(runChecklist(evidence)), PASS)
  })

  test('AC-1 · a single failing check yields a FAIL gate', () => {
    const evidence = passingEvidence()
    evidence.https.status = 500
    assert.equal(gateOutcome(runChecklist(evidence)), FAIL)
  })
})
