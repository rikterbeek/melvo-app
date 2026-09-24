import { describe, expect, vi } from 'vitest'

import {
  PRIMARY_CTA_SAFE_FALLBACK_DESTINATION,
  PrimaryCtaConfigurationError,
  resolvePrimaryCtaDestination,
} from '@/config/cta'
import { intent } from '../support/intent'

describe('primary CTA destination configuration', () => {
  intent('AC4-CFG-1', 'a configured absolute destination is used verbatim', () => {
    expect(
      resolvePrimaryCtaDestination({
        rawValue: 'https://app.melvo.dev/signup',
        strict: true,
      }),
    ).toEqual({ destination: 'https://app.melvo.dev/signup', usedFallback: false })
  })

  intent('AC4-CFG-2', 'a configured root-relative destination is accepted', () => {
    expect(
      resolvePrimaryCtaDestination({ rawValue: '/signup', strict: true }).destination,
    ).toBe('/signup')
  })

  intent('AC4-CFG-3', 'surrounding whitespace is trimmed from the configured value', () => {
    expect(
      resolvePrimaryCtaDestination({ rawValue: '  https://app.melvo.dev/signup  ', strict: true })
        .destination,
    ).toBe('https://app.melvo.dev/signup')
  })

  intent('AC4-CFG-4', 'a missing destination fails the build in strict mode', () => {
    expect(() => resolvePrimaryCtaDestination({ rawValue: undefined, strict: true })).toThrow(
      PrimaryCtaConfigurationError,
    )
  })

  intent('AC4-CFG-5', 'an empty destination fails the build in strict mode', () => {
    expect(() => resolvePrimaryCtaDestination({ rawValue: '   ', strict: true })).toThrow(
      PrimaryCtaConfigurationError,
    )
  })

  intent('AC4-CFG-6', 'a malformed destination fails the build in strict mode', () => {
    for (const rawValue of ['signup', 'javascript:alert(1)', 'ftp://melvo.dev', '//evil.example']) {
      expect(() => resolvePrimaryCtaDestination({ rawValue, strict: true })).toThrow(
        PrimaryCtaConfigurationError,
      )
    }
  })

  intent('AC4-CFG-7', 'the failure names the environment variable so the build output is actionable', () => {
    expect(() => resolvePrimaryCtaDestination({ rawValue: '', strict: true })).toThrow(
      /NEXT_PUBLIC_PRIMARY_CTA_DESTINATION/,
    )
  })

  intent('AC4-CFG-8', 'a missing destination falls back to the documented safe route outside strict mode', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const resolved = resolvePrimaryCtaDestination({ rawValue: undefined, strict: false })

    expect(resolved).toEqual({
      destination: PRIMARY_CTA_SAFE_FALLBACK_DESTINATION,
      usedFallback: true,
    })
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  intent('AC4-CFG-9', 'the safe fallback is a root-relative route that the site itself serves', () => {
    expect(PRIMARY_CTA_SAFE_FALLBACK_DESTINATION).toMatch(/^\/[a-z0-9-]*$/)
  })
})
