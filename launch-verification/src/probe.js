/**
 * Gathers the machine-checkable half of the PRD §18 checklist from a live URL:
 * the HTTPS response head and body, the plain-HTTP redirect, and whether TLS
 * terminated without a certificate error. The browser-observable half (viewport
 * rendering, console, request count) cannot be probed here and is supplied as
 * manual evidence — see `cli.js`.
 */

/** Render a response head the way `curl -sI` shows it, for the record. */
function rawHead (status, headers) {
  const lines = [`HTTP ${status}`]
  for (const [name, value] of Object.entries(headers)) {
    lines.push(`${name}: ${value}`)
  }
  return lines.join('\n')
}

function headersToObject (headers) {
  const result = {}
  for (const [name, value] of headers.entries()) {
    result[name.toLowerCase()] = value
  }
  return result
}

async function request (url, fetchImpl) {
  const response = await fetchImpl(url, { redirect: 'manual' })
  const headers = headersToObject(response.headers)
  return {
    status: response.status,
    headers,
    rawHead: rawHead(response.status, headers),
    response
  }
}

/** The same resource over plain HTTP, so the HTTPS redirect (SEC-1) can be judged. */
function plainHttpUrl (url) {
  const parsed = new URL(url)
  parsed.protocol = 'http:'
  return parsed.toString()
}

/**
 * @param {string} url the deployed URL to check
 * @param {{fetchImpl?: Function, now?: () => Date}} [options]
 */
export async function probe (url, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const now = options.now ?? (() => new Date())
  const isHttps = new URL(url).protocol === 'https:'

  const evidence = {
    url,
    checkedAt: now().toISOString(),
    https: { status: null, headers: {}, rawHead: '', body: '' },
    http: { status: null, headers: {} },
    tls: { valid: false, issuer: null, validTo: null, error: null }
  }

  try {
    const primary = await request(url, fetchImpl)
    evidence.https = {
      status: primary.status,
      headers: primary.headers,
      rawHead: primary.rawHead,
      body: await primary.response.text()
    }
    evidence.tls = isHttps
      ? { valid: true, issuer: 'presented by the host (confirm in the browser)', validTo: null, error: null }
      : { valid: false, issuer: null, validTo: null, error: 'probed URL is not https — certificate not verified' }
  } catch (error) {
    evidence.tls = { valid: false, issuer: null, validTo: null, error: error.message }
    return evidence
  }

  try {
    const plain = await request(plainHttpUrl(url), fetchImpl)
    evidence.http = { status: plain.status, headers: plain.headers }
  } catch (error) {
    evidence.http = { status: null, headers: {}, error: error.message }
  }

  return evidence
}
