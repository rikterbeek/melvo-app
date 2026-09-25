import { beforeAll, describe, expect, it } from 'vitest'
import { estimateLoad } from './support/load-model.js'
import { budget, loadHomepage, type Asset, type Homepage } from './support/site.js'
import { describeElement } from './support/layout.js'

/**
 * AC6 (performance half) — the homepage must meet the agreed load-time budget
 * in performance-budget.json when measured with the standard audit.
 */
describe('AC6: homepage performance budget', () => {
  let page: Homepage

  beforeAll(() => {
    page = loadHomepage()
  })

  const gzipTotal = (assets: Asset[]): number =>
    assets.reduce((sum, asset) => sum + asset.gzipBytes, 0)

  it('AC6: the homepage first renders inside the agreed load-time budget on Slow 4G', () => {
    const html = page.criticalPath[0]!
    const renderBlocking = page.criticalPath.filter(
      (asset) => asset.type === 'css' || (asset.type === 'js' && isRenderBlocking(page, asset)),
    )
    const remaining = page.criticalPath.filter(
      (asset) => asset !== html && !renderBlocking.includes(asset),
    )

    const estimate = estimateLoad(html, renderBlocking, remaining, budget.network)
    const report = estimate.breakdown.join('\n  ')

    expect(estimate.firstRenderMs, `first render breakdown:\n  ${report}`).toBeLessThanOrEqual(
      budget.loadTimeMs.firstRender,
    )
    expect(estimate.fullyLoadedMs, `fully loaded breakdown:\n  ${report}`).toBeLessThanOrEqual(
      budget.loadTimeMs.fullyLoaded,
    )
  })

  it('AC6: transferred bytes stay inside the per-type weight budget', () => {
    const overBudget = (['html', 'css', 'js', 'image', 'font'] as const)
      .map((type) => ({
        type,
        gzipBytes: gzipTotal(page.criticalPath.filter((asset) => asset.type === type)),
        limit: budget.transferGzipBytes[type],
      }))
      .filter((entry) => entry.gzipBytes > entry.limit)

    expect(overBudget).toEqual([])
    expect(gzipTotal(page.criticalPath)).toBeLessThanOrEqual(budget.transferGzipBytes.total)
  })

  it('AC6: the number of requests needed to render stays inside the request budget', () => {
    expect(page.criticalPath.length).toBeLessThanOrEqual(budget.requests.criticalPath)
    expect(page.assets.filter((asset) => asset.type !== 'other').length).toBeLessThanOrEqual(
      budget.requests.total,
    )
  })

  it('AC6: nothing blocks the first render except the single stylesheet', () => {
    const stylesheets = [...page.document.querySelectorAll('link[rel="stylesheet"]')].filter(
      (link) => (link.getAttribute('media') ?? 'all') !== 'print',
    )
    expect(stylesheets.length).toBeLessThanOrEqual(budget.rules.maxRenderBlockingStylesheets)

    const blockingScripts = [...page.document.querySelectorAll('script')].filter(
      (script) =>
        script.hasAttribute('src') && !script.hasAttribute('defer') && !script.hasAttribute('async') &&
        script.getAttribute('type') !== 'module',
    )
    expect(blockingScripts.map(describeElement)).toEqual([])

    expect(page.css.match(/@import/g) ?? []).toEqual([])
    expect(page.css.match(/@font-face/g) ?? []).toHaveLength(budget.rules.maxWebFonts)

    const external = [
      ...page.document.querySelectorAll('script[src], link[rel="stylesheet"], img[src], iframe[src]'),
    ]
      .map((element) => element.getAttribute('src') ?? element.getAttribute('href') ?? '')
      .filter((url) => /^https?:\/\//.test(url))
    expect(external, 'no third-party resource may sit on the critical path').toEqual([])
  })

  it('AC6: images are dimensioned and deferred so late loads cannot shift the layout', () => {
    const images = [...page.document.querySelectorAll('img')]
    const problems = images.flatMap((image) => {
      const path = describeElement(image)
      const issues: string[] = []
      if (!image.getAttribute('width') || !image.getAttribute('height')) {
        issues.push(`${path} has no intrinsic width/height, so it can shift the layout`)
      }
      if (!image.hasAttribute('loading')) issues.push(`${path} does not declare a loading strategy`)
      if (image.getAttribute('decoding') !== 'async') issues.push(`${path} should decode asynchronously`)
      return issues
    })

    expect(problems).toEqual([])

    const eager = images.filter((image) => image.getAttribute('loading') === 'eager')
    expect(eager.length, 'only above-the-fold imagery may load eagerly').toBeLessThanOrEqual(2)
  })
})

function isRenderBlocking(page: Homepage, asset: Asset): boolean {
  return [...page.document.querySelectorAll('script[src]')].some((script) => {
    const src = script.getAttribute('src') ?? ''
    if (!src.endsWith(asset.url)) return false
    return !script.hasAttribute('defer') && !script.hasAttribute('async') && script.getAttribute('type') !== 'module'
  })
}
