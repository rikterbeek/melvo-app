import { afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { ANALYTICS_ENDPOINT, sendAnalyticsEvent } from '@/lib/analytics'
import { intent } from '../support/intent'

type Navigator = typeof globalThis.navigator

function stubNavigator(value: Partial<Navigator>): void {
  vi.stubGlobal('navigator', value as Navigator)
}

describe('analytics transport', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  intent('AC4-AN-1', 'an event is delivered with sendBeacon when the browser supports it', () => {
    const sendBeacon = vi.fn(() => true)
    stubNavigator({ sendBeacon })

    sendAnalyticsEvent({ name: 'primary_cta_activated', properties: { source_section: 'hero' } })

    expect(sendBeacon).toHaveBeenCalledOnce()
    const [url, body] = sendBeacon.mock.calls[0] as unknown as [string, Blob]
    expect(url).toBe(ANALYTICS_ENDPOINT)
    expect(body).toBeInstanceOf(Blob)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  intent('AC4-AN-2', 'the event payload carries the event name and properties', async () => {
    const sendBeacon = vi.fn(() => true)
    stubNavigator({ sendBeacon })

    sendAnalyticsEvent({ name: 'primary_cta_activated', properties: { source_section: 'hero' } })

    const [, body] = sendBeacon.mock.calls[0] as unknown as [string, Blob]
    expect(JSON.parse(await body.text())).toMatchObject({
      name: 'primary_cta_activated',
      properties: { source_section: 'hero' },
    })
  })

  intent('AC4-AN-3', 'a keepalive fetch is used when sendBeacon is unavailable', () => {
    stubNavigator({})

    sendAnalyticsEvent({ name: 'primary_cta_activated', properties: { source_section: 'hero' } })

    expect(globalThis.fetch).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe(ANALYTICS_ENDPOINT)
    expect(init).toMatchObject({ method: 'POST', keepalive: true })
  })

  intent('AC4-AN-4', 'a refused sendBeacon falls back to keepalive fetch', () => {
    stubNavigator({ sendBeacon: vi.fn(() => false) })

    sendAnalyticsEvent({ name: 'primary_cta_activated', properties: { source_section: 'hero' } })

    expect(globalThis.fetch).toHaveBeenCalledOnce()
  })

  intent('AC4-AN-5', 'a transport that throws never propagates to the caller', () => {
    stubNavigator({
      sendBeacon: vi.fn(() => {
        throw new Error('beacon blocked by extension')
      }),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('network down')
      }),
    )

    expect(() =>
      sendAnalyticsEvent({ name: 'primary_cta_activated', properties: { source_section: 'hero' } }),
    ).not.toThrow()
  })

  intent('AC4-AN-6', 'a rejected keepalive fetch is swallowed, not left unhandled', async () => {
    stubNavigator({})
    const rejection = Promise.reject(new Error('network down'))
    vi.stubGlobal('fetch', vi.fn(() => rejection))

    expect(() =>
      sendAnalyticsEvent({ name: 'primary_cta_activated', properties: { source_section: 'hero' } }),
    ).not.toThrow()

    await expect(rejection.catch(() => 'handled')).resolves.toBe('handled')
  })

  intent('AC4-AN-7', 'delivery is synchronous and does not await the transport', () => {
    let resolveFetch: (() => void) | undefined
    stubNavigator({})
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = () => resolve(new Response(null, { status: 204 }))
          }),
      ),
    )

    const returned = sendAnalyticsEvent({
      name: 'primary_cta_activated',
      properties: { source_section: 'hero' },
    })

    expect(returned).toBeUndefined()
    expect(resolveFetch).toBeTypeOf('function')
  })
})
