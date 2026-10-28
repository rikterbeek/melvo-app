/**
 * Deploy verification for the Hello, world! site (RFC-1 §12 M0/M2, PRD-1 §6.4 FR-DEPLOY-1, §10 SEC-1).
 *
 * The observed URL is read from the deploy run's own `page_url` output. It is deliberately never
 * derived from the git remote: the point of the task is to record the URL the *host* assigned.
 */

const GREETING = 'Hello, world!'

/**
 * Extract the host-assigned site URL from a completed deploy run.
 *
 * @param {{conclusion?: string, html_url?: string, outputs?: {page_url?: string}}} runSummary
 * @returns {string} the normalised https URL, with a trailing slash
 */
export function resolveObservedUrl(runSummary) {
  const conclusion = runSummary?.conclusion
  if (conclusion !== 'success') {
    throw new Error(`The deploy run did not complete successfully (conclusion: ${conclusion ?? 'unknown'}).`)
  }

  const pageUrl = runSummary?.outputs?.page_url
  if (!pageUrl) {
    throw new Error(
      'The deploy run did not emit a page_url output; the site URL must be observed from the run, not derived from the git remote.',
    )
  }

  if (!pageUrl.startsWith('https://')) {
    throw new Error(`The host-assigned page_url must be https, got: ${pageUrl}`)
  }

  return pageUrl.endsWith('/') ? pageUrl : `${pageUrl}/`
}

/**
 * Check a `GET /` response against the acceptance criteria: 200, HTML content type,
 * the greeting in the body, and a certificate the TLS stack trusted.
 *
 * @param {{status: number, headers: Record<string,string>, body: string, tls?: {authorized?: boolean, error?: string}}} response
 */
export function checkRootResponse(response) {
  const failures = []

  const status = response.status
  if (status !== 200) failures.push(`expected HTTP 200, got ${status}`)

  const contentType = response.headers?.['content-type'] ?? ''
  const isHtml = contentType.toLowerCase().startsWith('text/html')
  if (!isHtml) failures.push(`expected a text/html content type, got "${contentType || '(none)'}"`)

  const containsHello = (response.body ?? '').includes(GREETING)
  if (!containsHello) failures.push(`expected the body to contain "${GREETING}"`)

  const tls = response.tls ?? {}
  if (tls.authorized !== true) {
    failures.push(`expected a valid, trusted TLS certificate${tls.error ? ` (${tls.error})` : ''}`)
  }

  return { ok: failures.length === 0, status, contentType, isHtml, containsHello, failures }
}

/**
 * Check that a plain-HTTP request redirects to HTTPS (SEC-1).
 *
 * @param {{status: number, headers: Record<string,string>}} response the un-followed http:// response
 * @param {string} expectedUrl the observed https URL, used only for reporting
 */
export function checkHttpsRedirect(response, expectedUrl) {
  const failures = []
  const status = response.status
  const location = response.headers?.location ?? null

  const isRedirect = status >= 300 && status < 400
  if (!isRedirect) failures.push(`expected a redirect status (3xx), got ${status} — plain HTTP was served directly`)

  const redirectsToHttps = Boolean(location && location.startsWith('https://'))
  if (isRedirect && !redirectsToHttps) {
    failures.push(`expected the redirect to target https, got "${location ?? '(no Location header)'}"`)
  }

  return { ok: failures.length === 0, status, location, redirectsToHttps, expectedUrl, failures }
}

/**
 * Run the full observation against a deployed site and return a recordable evidence bundle.
 *
 * @param {{runSummary: object, httpGet: (url: string, options?: {followRedirects?: boolean}) => Promise<object>}} args
 */
export function verifyDeployment({ runSummary, httpGet }) {
  const url = resolveObservedUrl(runSummary)
  const plainHttpUrl = `http://${url.slice('https://'.length)}`

  // A refused connection or a rejected certificate is evidence of a failed criterion, not a crash:
  // the record must still be produced so the failure can be filed in the verification record.
  const probe = (target, options) =>
    Promise.resolve()
      .then(() => httpGet(target, options))
      .catch((error) => ({
        status: 0,
        headers: {},
        body: '',
        tls: { authorized: false, error: error.message },
        error: error.message,
      }))

  return probe(url, { followRedirects: true }).then((rootResponse) =>
    probe(plainHttpUrl, { followRedirects: false }).then((redirectResponse) => {
      const root = checkRootResponse(rootResponse)
      const redirect = checkHttpsRedirect(redirectResponse, url)

      return {
        ok: root.ok && redirect.ok,
        url,
        plainHttpUrl,
        runUrl: runSummary?.html_url ?? null,
        observedAt: new Date().toISOString(),
        root,
        redirect,
        tls: rootResponse.tls ?? {},
        rootHeaders: rootResponse.headers ?? {},
        redirectHeaders: redirectResponse.headers ?? {},
      }
    }),
  )
}

/** Render an evidence bundle as the markdown block pasted into the verification record. */
export function formatEvidence(record) {
  const headerLines = (headers) =>
    Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n') || '(none)'

  return [
    `- **Observed URL (host-assigned):** ${record.url}`,
    `- **Deploy run:** ${record.runUrl ?? '(not recorded)'}`,
    `- **Observed at:** ${record.observedAt}`,
    `- **Overall:** ${record.ok ? 'PASS' : `FAIL — ${[...record.root.failures, ...record.redirect.failures].join('; ')}`}`,
    '',
    `\`GET ${record.url}\` → **${record.root.status}**`,
    '',
    '```http',
    headerLines(record.rootHeaders),
    '```',
    '',
    `\`GET ${record.plainHttpUrl}\` (redirects not followed) → **${record.redirect.status}**`,
    '',
    '```http',
    headerLines(record.redirectHeaders),
    '```',
    '',
    `- **TLS:** ${record.tls.authorized === true ? 'valid, trusted' : 'NOT valid'}` +
      (record.tls.protocol ? ` · ${record.tls.protocol}` : '') +
      (record.tls.issuer ? ` · issuer ${record.tls.issuer}` : '') +
      (record.tls.validTo ? ` · valid to ${record.tls.validTo}` : ''),
    `- **Body contains "${GREETING}":** ${record.root.containsHello ? 'yes' : 'no'}`,
  ].join('\n')
}
