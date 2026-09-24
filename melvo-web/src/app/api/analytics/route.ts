import type { NextRequest } from 'next/server'

/**
 * Collection endpoint for the fire-and-forget analytics transport.
 *
 * It acknowledges and drops the event; forwarding to the real analytics
 * backend is a separate task. It exists so beacons have a live endpoint
 * instead of a 404, and it never returns a body the browser has to read.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const event: unknown = await request.json()
    if (isAnalyticsEventShape(event)) {
      console.info('[analytics]', JSON.stringify(event))
    }
  } catch {
    // A malformed beacon is not worth an error response.
  }

  return new Response(null, { status: 204 })
}

function isAnalyticsEventShape(value: unknown): value is { name: string } {
  return typeof value === 'object' && value !== null && typeof (value as { name?: unknown }).name === 'string'
}
