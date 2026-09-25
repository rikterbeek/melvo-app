import type { Asset } from './site.js'

export interface NetworkProfile {
  label: string
  downlinkKbps: number
  roundTripMs: number
  connectionSetupRoundTrips: number
  maxParallelRequests: number
}

export interface LoadEstimate {
  firstRenderMs: number
  fullyLoadedMs: number
  breakdown: string[]
}

/**
 * Analytic load-time model used in place of a real browser trace (Playwright
 * browsers cannot be downloaded in this sandbox).
 *
 *   connection setup  = connectionSetupRoundTrips x RTT
 *   per resource      = 1 RTT (request) + transfer time at the profile downlink
 *   render blocked on = HTML + every render-blocking stylesheet/script
 *
 * Resources after the HTML are fetched in waves of `maxParallelRequests` over
 * the warm connection. It deliberately ignores TCP slow start and server think
 * time, so it is a floor: passing here is necessary, not sufficient, but it
 * catches the regressions a budget exists to catch (bundle growth, extra
 * round trips, render-blocking third parties).
 */
export function estimateLoad(
  htmlAsset: Asset,
  renderBlocking: Asset[],
  remaining: Asset[],
  network: NetworkProfile,
): LoadEstimate {
  const transferMs = (bytes: number): number => (bytes * 8) / network.downlinkKbps
  const breakdown: string[] = []

  let elapsed = network.connectionSetupRoundTrips * network.roundTripMs
  breakdown.push(`connection setup: ${elapsed.toFixed(0)} ms`)

  const htmlMs = network.roundTripMs + transferMs(htmlAsset.gzipBytes)
  elapsed += htmlMs
  breakdown.push(`${htmlAsset.url} (${htmlAsset.gzipBytes} B gzip): +${htmlMs.toFixed(0)} ms`)

  elapsed += waveMs(renderBlocking, network, breakdown)
  const firstRenderMs = elapsed

  elapsed += waveMs(remaining, network, breakdown)

  return {
    firstRenderMs: Math.round(firstRenderMs),
    fullyLoadedMs: Math.round(elapsed),
    breakdown,
  }
}

function waveMs(assets: Asset[], network: NetworkProfile, breakdown: string[]): number {
  let total = 0
  for (let index = 0; index < assets.length; index += network.maxParallelRequests) {
    const wave = assets.slice(index, index + network.maxParallelRequests)
    // A wave shares the downlink, so the whole wave costs one RTT plus the
    // time to transfer every byte in it.
    const bytes = wave.reduce((sum, asset) => sum + asset.gzipBytes, 0)
    const waveTime = network.roundTripMs + (bytes * 8) / network.downlinkKbps
    total += waveTime
    breakdown.push(`${wave.map((a) => a.url).join(', ')} (${bytes} B gzip): +${waveTime.toFixed(0)} ms`)
  }
  return total
}
