import { afterEach, describe, expect, vi } from 'vitest'

import { intent } from '../support/intent'

/**
 * The resolver is unit-tested next door. These tests cover the wiring that
 * actually protects a deploy: evaluating `@/config/cta` is what `next build`
 * does when it renders the homepage, so a strict environment with no
 * configured destination must fail *there*, not silently ship a dead link.
 */
async function importCtaConfigWith(
  env: Record<string, string | undefined>,
): Promise<typeof import('@/config/cta')> {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      vi.stubEnv(key, undefined as unknown as string)
    } else {
      vi.stubEnv(key, value)
    }
  }
  return import('@/config/cta')
}

describe('primary CTA build gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  intent('AC4-GATE-1', 'a production build with no configured destination fails to evaluate', async () => {
    await expect(
      importCtaConfigWith({
        NODE_ENV: 'production',
        CI: undefined,
        NEXT_PUBLIC_PRIMARY_CTA_DESTINATION: undefined,
      }),
    ).rejects.toThrow(/NEXT_PUBLIC_PRIMARY_CTA_DESTINATION/)
  })

  intent('AC4-GATE-2', 'a CI build with an empty destination fails to evaluate', async () => {
    await expect(
      importCtaConfigWith({
        NODE_ENV: 'test',
        CI: 'true',
        NEXT_PUBLIC_PRIMARY_CTA_DESTINATION: '   ',
      }),
    ).rejects.toThrow(/NEXT_PUBLIC_PRIMARY_CTA_DESTINATION/)
  })

  intent('AC4-GATE-3', 'a production build with a configured destination uses it', async () => {
    const { PRIMARY_CTA_DESTINATION } = await importCtaConfigWith({
      NODE_ENV: 'production',
      CI: undefined,
      NEXT_PUBLIC_PRIMARY_CTA_DESTINATION: 'https://app.melvo.dev/signup',
    })

    expect(PRIMARY_CTA_DESTINATION).toBe('https://app.melvo.dev/signup')
  })

  intent('AC4-GATE-4', 'local development falls back to the documented safe destination', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { PRIMARY_CTA_DESTINATION, PRIMARY_CTA_SAFE_FALLBACK_DESTINATION } =
      await importCtaConfigWith({
        NODE_ENV: 'development',
        CI: undefined,
        NEXT_PUBLIC_PRIMARY_CTA_DESTINATION: undefined,
      })

    expect(PRIMARY_CTA_DESTINATION).toBe(PRIMARY_CTA_SAFE_FALLBACK_DESTINATION)
    expect(warn).toHaveBeenCalledOnce()
  })

  intent('AC4-GATE-5', 'the strict-environment rule covers production and CI, and only those', async () => {
    const { isStrictCtaEnvironment } = await importCtaConfigWith({})

    expect(isStrictCtaEnvironment({ NODE_ENV: 'production' })).toBe(true)
    expect(isStrictCtaEnvironment({ CI: 'true' })).toBe(true)
    expect(isStrictCtaEnvironment({ CI: '1' })).toBe(true)
    expect(isStrictCtaEnvironment({ NODE_ENV: 'development' })).toBe(false)
    expect(isStrictCtaEnvironment({})).toBe(false)
  })
})
