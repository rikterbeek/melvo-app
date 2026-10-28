/**
 * The PRD-1 §18 / RFC-1 §10 launch checklist, expressed as pure functions over
 * captured evidence. Nothing here touches the network — `probe.js` gathers the
 * evidence, this module decides what it means, so every verdict is reproducible
 * from the recorded evidence alone.
 */

export const PASS = 'PASS'
export const FAIL = 'FAIL'
export const DEVIATION = 'DEVIATION'
export const BLOCKED = 'BLOCKED'

/** Widths PRD §18 requires: a phone and a desktop viewport. */
const NARROW_WIDTH = 375
const WIDE_MIN_WIDTH = 1280

/** PRD Q3: the browser asks for this by itself, so a 404 for it is not a failure. */
const BROWSER_INITIATED_PATHS = ['/favicon.ico']

const verdict = (id, title, ok, detail) => ({ id, title, status: ok ? PASS : FAIL, detail })

function checkStatusAndContentType ({ https }) {
  const title = 'GET / over HTTPS returns 200 with content-type text/html'
  const contentType = https?.headers?.['content-type'] ?? ''
  const statusOk = https?.status === 200
  const typeOk = contentType.toLowerCase().startsWith('text/html')
  return verdict(
    'CHK-1',
    title,
    statusOk && typeOk,
    `status ${https?.status ?? 'none'}, content-type ${contentType || 'none'}`
  )
}

function checkHttpsRedirect ({ http }) {
  const title = 'Plain HTTP redirects to HTTPS'
  const status = http?.status
  const location = http?.headers?.location ?? ''
  const isRedirect = typeof status === 'number' && status >= 300 && status < 400
  const toHttps = location.toLowerCase().startsWith('https://')
  return verdict(
    'CHK-2',
    title,
    isRedirect && toHttps,
    `status ${status ?? 'none'}, location ${location || 'none'}`
  )
}

function checkCertificate ({ tls }) {
  const title = 'TLS certificate is valid for the origin (SEC-1)'
  const detail = tls?.valid
    ? `valid, issuer ${tls.issuer ?? 'unknown'}, expires ${tls.validTo ?? 'unknown'}`
    : `invalid: ${tls?.error ?? 'no certificate evidence captured'}`
  return verdict('CHK-3', title, tls?.valid === true, detail)
}

function checkRendering ({ browser }) {
  const title = '"Hello, world!" renders at 375 px and ≥ 1280 px with no horizontal scroll'
  const viewports = browser?.viewports ?? []
  const narrow = viewports.find((v) => v.width === NARROW_WIDTH)
  const wide = viewports.find((v) => v.width >= WIDE_MIN_WIDTH)

  const missing = []
  if (!narrow) missing.push(`${NARROW_WIDTH} px`)
  if (!wide) missing.push(`≥ ${WIDE_MIN_WIDTH} px`)
  if (missing.length > 0) {
    return verdict('CHK-4', title, false, `no evidence captured at ${missing.join(' and ')}`)
  }

  const problems = [narrow, wide]
    .filter((v) => !v.helloWorldVisible || v.horizontalScroll)
    .map((v) => `${v.width} px: ${v.helloWorldVisible ? 'horizontal scroll present' : 'greeting not visible'}`)

  return verdict(
    'CHK-4',
    title,
    problems.length === 0,
    problems.length === 0 ? `${narrow.width} px and ${wide.width} px both clean` : problems.join('; ')
  )
}

function checkConsole ({ browser }) {
  const title = 'Devtools console shows zero errors'
  const errors = browser?.consoleErrors ?? []
  return verdict(
    'CHK-5',
    title,
    errors.length === 0,
    errors.length === 0 ? 'console empty' : `${errors.length} error(s): ${errors.join(' | ')}`
  )
}

function isBrowserInitiated (requestUrl, origin) {
  try {
    const parsed = new URL(requestUrl)
    return parsed.origin === origin && BROWSER_INITIATED_PATHS.includes(parsed.pathname)
  } catch {
    return false
  }
}

/** A host to name in the record; falls back to the raw URL for hostless schemes like `data:`. */
function hostOf (requestUrl) {
  try {
    return new URL(requestUrl).host || requestUrl
  } catch {
    return requestUrl
  }
}

function checkRequests (evidence) {
  const title = 'Exactly one request, no host other than the origin (D2)'
  const origin = originOf(evidence.url)
  const requests = evidence.browser?.requests ?? []

  const exempt = requests.filter((r) => isBrowserInitiated(r.url, origin))
  const counted = requests.filter((r) => !isBrowserInitiated(r.url, origin))
  const foreign = counted.filter((r) => {
    try {
      return new URL(r.url).origin !== origin
    } catch {
      return true
    }
  })

  const notes = []
  if (exempt.length > 0) {
    notes.push(`ignored browser-initiated ${exempt.map((r) => `${new URL(r.url).pathname} (${r.status})`).join(', ')} per PRD Q3`)
  }

  if (foreign.length > 0) {
    const hosts = [...new Set(foreign.map((r) => hostOf(r.url)))]
    return verdict('CHK-6', title, false, [`request(s) to foreign host(s): ${hosts.join(', ')}`, ...notes].join('; '))
  }

  if (counted.length !== 1) {
    return verdict('CHK-6', title, false, [`${counted.length} counted request(s), expected exactly 1`, ...notes].join('; '))
  }

  return verdict('CHK-6', title, true, ['1 request to the origin document', ...notes].join('; '))
}

const SCRIPT_TAG = /<script\b[^>]*>/gi
const SCRIPT_SRC = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi

function checkHostInjection ({ https }) {
  const title = 'No host-injected script in the served document (R5)'
  const body = https?.body ?? ''
  const tags = body.match(SCRIPT_TAG) ?? []
  if (tags.length === 0) {
    return verdict('CHK-7', title, true, 'served document contains no <script> tag')
  }

  const sources = [...body.matchAll(SCRIPT_SRC)].map((m) => m[1])
  const described = sources.length > 0 ? sources.join(', ') : 'inline script'
  return {
    id: 'CHK-7',
    title,
    status: DEVIATION,
    detail: `host-injected script recorded as a known deviation (R5): ${described}`
  }
}

function checkSecondCheck ({ secondCheck }) {
  const title = 'Independent second check from another device or network (GA gate)'
  if (!secondCheck?.performed) {
    return verdict('CHK-8', title, false, 'no independent second check recorded')
  }
  const ok = secondCheck.status === 200 && secondCheck.helloWorldVisible === true
  return verdict(
    'CHK-8',
    title,
    ok,
    `${secondCheck.network ?? 'unspecified network'}: status ${secondCheck.status ?? 'none'}, greeting ${secondCheck.helloWorldVisible ? 'visible' : 'not visible'}`
  )
}

const CHECKS = [
  checkStatusAndContentType,
  checkHttpsRedirect,
  checkCertificate,
  checkRendering,
  checkConsole,
  checkRequests,
  checkHostInjection,
  checkSecondCheck
]

/** The origin a request must belong to in order to count as same-host. */
export function originOf (url) {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

/**
 * Evaluate every PRD §18 check against the captured evidence.
 * @returns {{url: string, checkedAt: string, checker: string, checks: Array, deviations: Array}}
 */
export function runChecklist (evidence) {
  const checks = CHECKS.map((check) => check(evidence))
  return {
    url: evidence.url,
    checkedAt: evidence.checkedAt,
    checker: evidence.checker,
    evidence,
    checks,
    deviations: checks.filter((c) => c.status === DEVIATION)
  }
}

/** PASS only when no check failed; recorded deviations do not block the gate (R5). */
export function gateOutcome (result) {
  return result.checks.some((c) => c.status === FAIL) ? FAIL : PASS
}
