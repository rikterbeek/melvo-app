/**
 * Single source of truth for where every primary CTA on the site points.
 *
 * The destination comes from configuration, never from markup. A missing,
 * empty or malformed value fails the build in strict environments (production
 * builds and CI) so a dead link can never be deployed; outside those it
 * resolves to the documented safe fallback below, which is a route this site
 * serves itself.
 */

export const PRIMARY_CTA_DESTINATION_ENV_VAR = 'NEXT_PUBLIC_PRIMARY_CTA_DESTINATION'

/** Documented safe fallback: the contact route, which this site always serves. */
export const PRIMARY_CTA_SAFE_FALLBACK_DESTINATION = '/contact'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export class PrimaryCtaConfigurationError extends Error {
  constructor(reason: string) {
    super(
      `${PRIMARY_CTA_DESTINATION_ENV_VAR} ${reason}. ` +
        'Set it to an absolute https URL or a root-relative path (for example ' +
        `"https://app.melvo.dev/signup" or "${PRIMARY_CTA_SAFE_FALLBACK_DESTINATION}").`,
    )
    this.name = 'PrimaryCtaConfigurationError'
  }
}

export interface ResolvedPrimaryCtaDestination {
  readonly destination: string
  readonly usedFallback: boolean
}

export interface ResolvePrimaryCtaDestinationOptions {
  readonly rawValue: string | undefined
  /** Strict environments fail the build instead of falling back. */
  readonly strict: boolean
}

function isRootRelativePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//')
}

function isAllowedAbsoluteUrl(value: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}

/**
 * Resolves the configured destination, or explains precisely why it cannot.
 */
export function resolvePrimaryCtaDestination({
  rawValue,
  strict,
}: ResolvePrimaryCtaDestinationOptions): ResolvedPrimaryCtaDestination {
  const candidate = rawValue?.trim() ?? ''

  if (candidate === '') {
    return fallbackOrFail('is not set', strict)
  }

  if (!isRootRelativePath(candidate) && !isAllowedAbsoluteUrl(candidate)) {
    return fallbackOrFail(`is not a usable destination (received "${candidate}")`, strict)
  }

  return { destination: candidate, usedFallback: false }
}

function fallbackOrFail(reason: string, strict: boolean): ResolvedPrimaryCtaDestination {
  if (strict) {
    throw new PrimaryCtaConfigurationError(reason)
  }

  console.warn(
    `[cta] ${PRIMARY_CTA_DESTINATION_ENV_VAR} ${reason}; ` +
      `falling back to "${PRIMARY_CTA_SAFE_FALLBACK_DESTINATION}". ` +
      'A production build fails instead of falling back.',
  )

  return { destination: PRIMARY_CTA_SAFE_FALLBACK_DESTINATION, usedFallback: true }
}

/** Production builds and CI must never ship an unconfigured CTA. */
export function isStrictCtaEnvironment(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV === 'production' || env.CI === 'true' || env.CI === '1'
}

/**
 * Evaluated when the app boots (and therefore during `next build`), so a
 * misconfigured production build fails before it can be deployed.
 */
export const PRIMARY_CTA_DESTINATION: string = resolvePrimaryCtaDestination({
  rawValue: process.env.NEXT_PUBLIC_PRIMARY_CTA_DESTINATION,
  strict: isStrictCtaEnvironment(),
}).destination
