import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { request } from '../src/http-client.mjs'

const indexHtml = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')

/** Serves the real index.html, and a /redirect path that bounces elsewhere. */
function startServer(handler) {
  const server = http.createServer(handler)
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

describe('the verifier speaks real HTTP against a served index.html', () => {
  let site
  let origin

  before(async () => {
    site = await startServer((req, res) => {
      if (req.url === '/redirect-loop') {
        res.writeHead(302, { location: '/redirect-loop' })
        res.end()
        return
      }
      if (req.url === '/moved') {
        res.writeHead(301, { location: '/' })
        res.end()
        return
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(indexHtml)
    })
    origin = `http://127.0.0.1:${site.address().port}`
  })

  after(() => site.close())

  test('intent FR-DEPLOY-3: GET / returns the status, content type and body the evidence record needs', async () => {
    const response = await request(`${origin}/`)
    assert.equal(response.status, 200)
    assert.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    assert.match(response.body, /Hello, world!/)
  })

  test('intent SEC-1: a redirect is reported un-followed when followRedirects is false', async () => {
    const response = await request(`${origin}/moved`, { followRedirects: false })
    assert.equal(response.status, 301)
    assert.equal(response.headers.location, '/')
  })

  test('intent FR-DEPLOY-3: redirects are followed to the final document when asked', async () => {
    const response = await request(`${origin}/moved`, { followRedirects: true })
    assert.equal(response.status, 200)
    assert.match(response.body, /Hello, world!/)
  })

  test('intent FR-DEPLOY-3: a redirect loop terminates instead of hanging', async () => {
    const response = await request(`${origin}/redirect-loop`)
    assert.equal(response.status, 302, 'gives up and reports the last redirect')
  })

  test('intent FR-DEPLOY-3: a plain-HTTP response carries no TLS details', async () => {
    const response = await request(`${origin}/`)
    assert.deepEqual(response.tls, {})
  })

  test('intent FR-DEPLOY-3: a host that never responds times out instead of hanging the deploy run', async () => {
    const stalled = await startServer(() => {
      /* deliberately never responds */
    })
    const stalledOrigin = `http://127.0.0.1:${stalled.address().port}`
    await assert.rejects(() => request(`${stalledOrigin}/`, { timeoutMs: 100 }), /timed out after 100ms/)
    stalled.close()
  })

  test('intent FR-DEPLOY-3: an unreachable host rejects rather than reporting a false pass', async () => {
    const closed = await startServer(() => {})
    const deadOrigin = `http://127.0.0.1:${closed.address().port}`
    await new Promise((resolve) => closed.close(resolve))
    await assert.rejects(() => request(`${deadOrigin}/`))
  })
})
