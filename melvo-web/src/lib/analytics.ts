/**
 * Fire-and-forget analytics transport.
 *
 * Delivery is synchronous from the caller's point of view and never awaited,
 * so an outbound event cannot block or delay a navigation, and a blocked or
 * failing transport can never surface as an error to the visitor.
 */

export const ANALYTICS_ENDPOINT =
  process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT?.trim() || '/api/analytics'

export interface AnalyticsEvent {
  readonly name: string
  readonly properties: Readonly<Record<string, string>>
}

export function sendAnalyticsEvent(event: AnalyticsEvent): void {
  const body = JSON.stringify(event)

  if (deliverWithBeacon(body)) {
    return
  }

  deliverWithKeepaliveFetch(body)
}

function deliverWithBeacon(body: string): boolean {
  try {
    const beacon = globalThis.navigator?.sendBeacon
    if (typeof beacon !== 'function') {
      return false
    }

    return beacon.call(
      globalThis.navigator,
      ANALYTICS_ENDPOINT,
      new Blob([body], { type: 'application/json' }),
    )
  } catch {
    // A blocked beacon is not the visitor's problem; fall through to fetch.
    return false
  }
}

function deliverWithKeepaliveFetch(body: string): void {
  try {
    void globalThis.fetch?.(ANALYTICS_ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body,
    })?.catch(() => undefined)
  } catch {
    // Analytics is best effort: never let it reach the caller.
  }
}
