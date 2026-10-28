/**
 * Minimal, dependency-free HTTP(S) client used to observe the deployed site.
 *
 * It captures what the evidence record needs and nothing more: status, headers, body and the
 * TLS peer details. Certificates are validated normally — an untrusted certificate rejects.
 */

import http from 'node:http'
import https from 'node:https'

const MAX_REDIRECTS = 5
const DEFAULT_TIMEOUT_MS = 15_000

function tlsDetails(socket) {
  if (!socket.encrypted) return {}

  const peerCert = typeof socket.getPeerCertificate === 'function' ? socket.getPeerCertificate() : null
  return {
    authorized: socket.authorized === true,
    error: socket.authorizationError ? String(socket.authorizationError) : undefined,
    protocol: socket.getProtocol?.() ?? undefined,
    issuer: peerCert?.issuer?.O ?? peerCert?.issuer?.CN ?? undefined,
    validTo: peerCert?.valid_to ?? undefined,
  }
}

/**
 * GET a URL.
 *
 * @param {string} url
 * @param {{followRedirects?: boolean, timeoutMs?: number, redirectsLeft?: number}} options
 * @returns {Promise<{status: number, headers: Record<string, string>, body: string, tls: object}>}
 */
export function request(url, options = {}) {
  const { followRedirects = true, timeoutMs = DEFAULT_TIMEOUT_MS, redirectsLeft = MAX_REDIRECTS } = options
  const client = url.startsWith('https://') ? https : http

  return new Promise((resolve, reject) => {
    const req = client.get(url, { headers: { 'user-agent': 'melvo-pages-verifier' } }, (res) => {
      const tls = tlsDetails(res.socket)
      const location = res.headers.location
      const isRedirect = res.statusCode >= 300 && res.statusCode < 400 && Boolean(location)

      if (followRedirects && isRedirect && redirectsLeft > 0) {
        res.resume()
        const next = new URL(location, url).toString()
        resolve(request(next, { ...options, redirectsLeft: redirectsLeft - 1 }))
        return
      }

      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body, tls }))
    })

    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`timed out after ${timeoutMs}ms requesting ${url}`))
    })
  })
}
