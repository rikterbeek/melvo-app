import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { main, EXIT_PASS, EXIT_FAIL, EXIT_BLOCKED } from '../src/cli.js'

let server
let base
let workdir

const PAGE = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Hello, world!</title></head><body><h1>Hello, world!</h1></body></html>'

const MANUAL_EVIDENCE = {
  checker: 'site owner',
  browser: {
    viewports: [
      { width: 375, helloWorldVisible: true, horizontalScroll: false },
      { width: 1440, helloWorldVisible: true, horizontalScroll: false }
    ],
    consoleErrors: [],
    requests: [{ url: 'PLACEHOLDER', status: 200 }]
  },
  secondCheck: { performed: true, network: 'mobile tethering', status: 200, helloWorldVisible: true }
}

before(async () => {
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(PAGE)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

beforeEach(async () => {
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'launch-verify-'))
})

async function writeEvidence (overrides = {}) {
  const evidence = structuredClone(MANUAL_EVIDENCE)
  evidence.browser.requests = [{ url: `${base}/`, status: 200 }]
  Object.assign(evidence, overrides)
  const file = path.join(workdir, 'evidence.json')
  await fs.writeFile(file, JSON.stringify(evidence))
  return file
}

const silent = () => {}

describe('launch-verify CLI', () => {
  test('T2 · with no deployed URL the run is BLOCKED and writes a blocked record', async () => {
    const out = path.join(workdir, 'record.md')
    const code = await main(['--out', out], { log: silent })
    assert.equal(code, EXIT_BLOCKED)
    const written = await fs.readFile(out, 'utf8')
    assert.match(written, /BLOCKED/)
    assert.match(written, /T2/)
  })

  test('AC-1 · a live URL probe writes a record with every check and the checker', async () => {
    const out = path.join(workdir, 'record.md')
    await main(['--url', `${base}/`, '--evidence', await writeEvidence(), '--out', out], { log: silent })
    const written = await fs.readFile(out, 'utf8')
    assert.match(written, /\| CHK-1 \|/)
    assert.match(written, /site owner/)
  })

  test('SEC-1 · a plain-HTTP origin exits FAIL on the redirect and certificate checks', async () => {
    const out = path.join(workdir, 'record.md')
    const code = await main(['--url', `${base}/`, '--evidence', await writeEvidence(), '--out', out], { log: silent })
    assert.equal(code, EXIT_FAIL)
    const written = await fs.readFile(out, 'utf8')
    assert.match(written, /CHK-3.*not https/)
  })

  test('AC-2 · --offline renders a record from evidence captured elsewhere and exits PASS', async () => {
    const out = path.join(workdir, 'record.md')
    const origin = 'https://hello.example.app'
    const evidence = structuredClone(MANUAL_EVIDENCE)
    evidence.browser.requests = [{ url: `${origin}/`, status: 200 }]
    evidence.https = {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      rawHead: 'HTTP 200\ncontent-type: text/html; charset=utf-8',
      body: '<!DOCTYPE html><html><body><h1>Hello, world!</h1></body></html>'
    }
    evidence.http = { status: 308, headers: { location: `${origin}/` } }
    evidence.tls = { valid: true, issuer: "Let's Encrypt", validTo: '2027-01-26T00:00:00.000Z', error: null }
    const file = path.join(workdir, 'offline.json')
    await fs.writeFile(file, JSON.stringify(evidence))

    const code = await main(['--url', `${origin}/`, '--evidence', file, '--offline', '--out', out], { log: silent })
    assert.equal(code, EXIT_PASS)
    assert.match(await fs.readFile(out, 'utf8'), /\*\*Outcome\*\* \| PASS/)
  })

  test('GA gate · a missing second check exits FAIL', async () => {
    const out = path.join(workdir, 'record.md')
    const evidenceFile = await writeEvidence({ secondCheck: { performed: false } })
    const code = await main(['--url', `${base}/`, '--evidence', evidenceFile, '--out', out], { log: silent })
    assert.equal(code, EXIT_FAIL)
    assert.match(await fs.readFile(out, 'utf8'), /FAIL/)
  })

  test('AC-1 · without manual browser evidence the browser checks fail rather than silently pass', async () => {
    const out = path.join(workdir, 'record.md')
    const code = await main(['--url', `${base}/`, '--out', out], { log: silent })
    assert.equal(code, EXIT_FAIL)
    const written = await fs.readFile(out, 'utf8')
    assert.match(written, /no evidence captured/)
  })

  test("AC-1 · the evidence file's note reaches the judged record", async () => {
    const out = path.join(workdir, 'record.md')
    const evidenceFile = await writeEvidence({ note: 'checked from the office LAN on Firefox 142' })
    await main(['--url', `${base}/`, '--evidence', evidenceFile, '--out', out], { log: silent })
    assert.match(await fs.readFile(out, 'utf8'), /checked from the office LAN on Firefox 142/)
  })

  test("T2 · the evidence file's note reaches the blocked record", async () => {
    const out = path.join(workdir, 'record.md')
    const evidenceFile = await writeEvidence({ note: 'no URL published in the repository' })
    const code = await main(['--evidence', evidenceFile, '--out', out], { log: silent })
    assert.equal(code, EXIT_BLOCKED)
    assert.match(await fs.readFile(out, 'utf8'), /no URL published in the repository/)
  })

  test('AC-1 · the CLI prints the outcome so a run is readable without opening the record', async () => {
    const lines = []
    await main(['--url', `${base}/`, '--evidence', await writeEvidence(), '--out', path.join(workdir, 'r.md')], {
      log: (line) => lines.push(line)
    })
    assert.match(lines.join('\n'), /^(PASS|FAIL) — /m)
  })
})
