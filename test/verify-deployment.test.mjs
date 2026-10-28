import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveObservedUrl,
  checkRootResponse,
  checkHttpsRedirect,
  verifyDeployment,
  formatEvidence,
} from '../src/verify-deployment.mjs'

const successfulRun = {
  conclusion: 'success',
  status: 'completed',
  html_url: 'https://github.com/rikterbeek/melvo-app/actions/runs/1234567890',
  outputs: { page_url: 'https://rikterbeek.github.io/melvo-app/' },
}

const okRoot = {
  status: 200,
  headers: { 'content-type': 'text/html; charset=utf-8' },
  body: '<!DOCTYPE html><html lang="en"><body><h1>Hello, world!</h1></body></html>',
  tls: { authorized: true, protocol: 'TLSv1.3', issuer: 'Sectigo', validTo: 'Dec 31 2026 GMT' },
}

const okRedirect = {
  status: 301,
  headers: { location: 'https://rikterbeek.github.io/melvo-app/' },
}

describe('FR-DEPLOY-1 the observed URL comes from the deploy run output', () => {
  test('intent FR-DEPLOY-1: the host-assigned page_url emitted by the deploy run is the observed URL', () => {
    assert.equal(resolveObservedUrl(successfulRun), 'https://rikterbeek.github.io/melvo-app/')
  })

  test('intent FR-DEPLOY-1: a URL missing from the run output is an error, never derived from the git remote', () => {
    assert.throws(
      () => resolveObservedUrl({ ...successfulRun, outputs: {} }),
      /did not emit a page_url/i,
    )
  })

  test('intent FR-DEPLOY-2: a run that did not conclude successfully yields no observed URL', () => {
    assert.throws(
      () => resolveObservedUrl({ ...successfulRun, conclusion: 'failure' }),
      /did not complete successfully/i,
    )
  })

  test('intent SEC-1: a non-HTTPS page_url is rejected', () => {
    assert.throws(
      () => resolveObservedUrl({ ...successfulRun, outputs: { page_url: 'http://example.com/' } }),
      /must be https/i,
    )
  })

  test('intent FR-DEPLOY-1: the observed URL is normalised to a trailing slash so GET / is unambiguous', () => {
    const run = { ...successfulRun, outputs: { page_url: 'https://rikterbeek.github.io/melvo-app' } }
    assert.equal(resolveObservedUrl(run), 'https://rikterbeek.github.io/melvo-app/')
  })
})

describe('AC: GET / returns 200 text/html containing "Hello, world!"', () => {
  test('intent FR-DEPLOY-3: a 200 HTML response containing the greeting passes', () => {
    const result = checkRootResponse(okRoot)
    assert.equal(result.ok, true)
    assert.equal(result.status, 200)
    assert.equal(result.contentType, 'text/html; charset=utf-8')
    assert.equal(result.containsHello, true)
    assert.deepEqual(result.failures, [])
  })

  test('intent FR-DEPLOY-3: a non-200 status fails the check', () => {
    const result = checkRootResponse({ ...okRoot, status: 404 })
    assert.equal(result.ok, false)
    assert.match(result.failures.join(' '), /expected HTTP 200, got 404/i)
  })

  test('intent FR-DEPLOY-3: a non-HTML content type fails the check', () => {
    const result = checkRootResponse({ ...okRoot, headers: { 'content-type': 'application/json' } })
    assert.equal(result.ok, false)
    assert.equal(result.isHtml, false)
    assert.match(result.failures.join(' '), /text\/html/i)
  })

  test('intent FR-DEPLOY-3: a body without the greeting fails the check', () => {
    const result = checkRootResponse({ ...okRoot, body: '<html><body>Goodbye</body></html>' })
    assert.equal(result.ok, false)
    assert.equal(result.containsHello, false)
    assert.match(result.failures.join(' '), /Hello, world!/)
  })

  test('intent SEC-1: an untrusted TLS certificate fails the check', () => {
    const result = checkRootResponse({ ...okRoot, tls: { authorized: false, error: 'self signed' } })
    assert.equal(result.ok, false)
    assert.match(result.failures.join(' '), /certificate/i)
  })
})

describe('SEC-1: plain HTTP redirects to HTTPS', () => {
  test('intent SEC-1: a 301 to the https URL passes', () => {
    const result = checkHttpsRedirect(okRedirect, 'https://rikterbeek.github.io/melvo-app/')
    assert.equal(result.ok, true)
    assert.equal(result.redirectsToHttps, true)
    assert.equal(result.location, 'https://rikterbeek.github.io/melvo-app/')
  })

  test('intent SEC-1: a 200 served over plain HTTP fails — no redirect happened', () => {
    const result = checkHttpsRedirect({ status: 200, headers: {} }, 'https://rikterbeek.github.io/melvo-app/')
    assert.equal(result.ok, false)
    assert.match(result.failures.join(' '), /redirect/i)
  })

  test('intent SEC-1: a redirect to another plain-HTTP location fails', () => {
    const result = checkHttpsRedirect(
      { status: 302, headers: { location: 'http://rikterbeek.github.io/melvo-app/' } },
      'https://rikterbeek.github.io/melvo-app/',
    )
    assert.equal(result.ok, false)
    assert.equal(result.redirectsToHttps, false)
  })

  test('intent SEC-1: a chain that ends on https is accepted even if the first hop is a redirect to another host', () => {
    const result = checkHttpsRedirect(
      { status: 301, headers: { location: 'https://www.example.com/melvo-app/' } },
      'https://rikterbeek.github.io/melvo-app/',
    )
    assert.equal(result.redirectsToHttps, true)
    assert.equal(result.ok, true)
  })
})

describe('AC: the verifier produces a recordable evidence bundle', () => {
  const httpGet = async (url, options = {}) => {
    if (url.startsWith('https://')) return okRoot
    if (url.startsWith('http://')) {
      assert.equal(options.followRedirects, false, 'the plain-HTTP probe must not follow redirects')
      return okRedirect
    }
    throw new Error(`unexpected url ${url}`)
  }

  test('intent FR-DEPLOY-4: a healthy deployment yields an ok evidence record carrying the run link and headers', async () => {
    const record = await verifyDeployment({ runSummary: successfulRun, httpGet })
    assert.equal(record.ok, true)
    assert.equal(record.url, 'https://rikterbeek.github.io/melvo-app/')
    assert.equal(record.runUrl, successfulRun.html_url)
    assert.equal(record.root.ok, true)
    assert.equal(record.redirect.ok, true)
    assert.equal(record.tls.authorized, true)
  })

  test('intent FR-DEPLOY-4: the plain-HTTP probe targets the same host and path over http', async () => {
    const seen = []
    await verifyDeployment({
      runSummary: successfulRun,
      httpGet: async (url, options) => {
        seen.push(url)
        return url.startsWith('https://') ? okRoot : okRedirect
      },
    })
    assert.deepEqual(seen, [
      'https://rikterbeek.github.io/melvo-app/',
      'http://rikterbeek.github.io/melvo-app/',
    ])
  })

  test('intent FR-DEPLOY-4: a failing root check makes the whole record not ok', async () => {
    const record = await verifyDeployment({
      runSummary: successfulRun,
      httpGet: async (url) => (url.startsWith('https://') ? { ...okRoot, status: 500 } : okRedirect),
    })
    assert.equal(record.ok, false)
  })

  test('intent SEC-1: an untrusted certificate is recorded as a failure, not an uncaught crash', async () => {
    const record = await verifyDeployment({
      runSummary: successfulRun,
      httpGet: async (url) => {
        if (url.startsWith('https://')) throw Object.assign(new Error('self-signed certificate'), { code: 'DEPTH_ZERO_SELF_SIGNED_CERT' })
        return okRedirect
      },
    })
    assert.equal(record.ok, false)
    assert.match(record.root.failures.join(' '), /self-signed certificate/)
    assert.match(formatEvidence(record), /self-signed certificate/)
  })

  test('intent FR-DEPLOY-4: an unreachable site is recorded as a failure, not an uncaught crash', async () => {
    const record = await verifyDeployment({
      runSummary: successfulRun,
      httpGet: async () => {
        throw Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' })
      },
    })
    assert.equal(record.ok, false)
    assert.equal(record.root.status, 0)
    assert.match(record.redirect.failures.join(' '), /ENOTFOUND|redirect/i)
  })

  test('intent FR-DEPLOY-4: the evidence formats to markdown containing the URL, run link and response headers', async () => {
    const record = await verifyDeployment({ runSummary: successfulRun, httpGet })
    const markdown = formatEvidence(record)
    assert.match(markdown, /https:\/\/rikterbeek\.github\.io\/melvo-app\//)
    assert.match(markdown, /actions\/runs\/1234567890/)
    assert.match(markdown, /content-type: text\/html; charset=utf-8/i)
    assert.match(markdown, /301/)
  })
})
