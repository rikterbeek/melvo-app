import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { probe } from '../src/probe.js'

/** A stand-in for the deployed static host, so the probe is exercised against real HTTP. */
let server
let base

const PAGE = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Hello, world!</title></head><body><h1>Hello, world!</h1></body></html>'

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(PAGE)
      return
    }
    if (req.url === '/redirecting') {
      res.writeHead(301, { location: 'https://hello.example.app/' })
      res.end()
      return
    }
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

describe('live probe', () => {
  test('AC-1 · the probe captures status, content-type and a raw response head', async () => {
    const evidence = await probe(`${base}/`)
    assert.equal(evidence.https.status, 200)
    assert.equal(evidence.https.headers['content-type'], 'text/html; charset=utf-8')
    assert.match(evidence.https.rawHead, /200/)
    assert.match(evidence.https.rawHead, /content-type: text\/html/)
  })

  test('AC-1 · the probe captures the response body so the greeting can be asserted', async () => {
    const evidence = await probe(`${base}/`)
    assert.match(evidence.https.body, /Hello, world!/)
  })

  test('AC-1 · the probe records a non-200 status instead of throwing', async () => {
    const evidence = await probe(`${base}/missing`)
    assert.equal(evidence.https.status, 404)
  })

  test('SEC-1 · the probe records the plain-HTTP response so the redirect can be judged', async () => {
    const evidence = await probe(`${base}/redirecting`)
    assert.equal(evidence.http.status, 301)
    assert.equal(evidence.http.headers.location, 'https://hello.example.app/')
  })

  test('SEC-1 · probing a non-HTTPS URL records the certificate as unverified', async () => {
    const evidence = await probe(`${base}/`)
    assert.equal(evidence.tls.valid, false)
    assert.match(evidence.tls.error, /not https/i)
  })

  test('SEC-1 · a TLS failure is recorded as a certificate error, not a crash', async () => {
    const failing = async () => { throw new Error('unable to verify the first certificate') }
    const evidence = await probe('https://expired.example.app/', { fetchImpl: failing })
    assert.equal(evidence.tls.valid, false)
    assert.match(evidence.tls.error, /unable to verify the first certificate/)
    assert.equal(evidence.https.status, null)
  })

  test('AC-1 · the probe stamps the URL and a UTC check time on the evidence', async () => {
    const evidence = await probe(`${base}/`, { now: () => new Date('2026-10-28T09:30:00.000Z') })
    assert.equal(evidence.url, `${base}/`)
    assert.equal(evidence.checkedAt, '2026-10-28T09:30:00.000Z')
  })
})
