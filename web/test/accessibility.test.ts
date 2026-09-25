import { beforeAll, describe, expect, it } from 'vitest'
import { computeStyle } from './support/css-cascade.js'
import { describeElement } from './support/layout.js'
import { sampleContrast, textBearingElements } from './support/contrast.js'
import { loadHomepage, VIEWPORTS, type Homepage } from './support/site.js'

/**
 * AC6 (accessibility half) — contrast, heading order, image alt text and
 * keyboard-reachable calls to action.
 */
describe('AC6: homepage accessibility checks', () => {
  let page: Homepage

  beforeAll(() => {
    page = loadHomepage()
  })

  it('AC6: every piece of text meets the WCAG AA contrast ratio against what is painted behind it', () => {
    const failures = Object.values(VIEWPORTS).flatMap((viewport) =>
      textBearingElements(page.document)
        .map((element) => sampleContrast(page.sheet, element, viewport))
        .filter((sample) => sample !== null)
        .filter((sample) => sample.ratio < sample.required)
        .map((sample) => ({
          viewport: viewport.name,
          path: sample.path,
          text: sample.text,
          ratio: sample.ratio,
          required: sample.required,
          colours: `${sample.foreground} on ${sample.background}`,
        })),
    )

    expect(failures).toEqual([])
  })

  it('AC6: the page has exactly one h1 and its heading levels descend without skipping', () => {
    const headings = [...page.document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    const levels = headings.map((heading) => Number(heading.tagName[1]))

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)

    const skips = headings
      .map((heading, index) => ({ heading, level: levels[index]!, previous: levels[index - 1] ?? 0 }))
      .filter((entry) => entry.previous > 0 && entry.level > entry.previous + 1)
      .map((entry) => `${describeElement(entry.heading)} jumps h${entry.previous} -> h${entry.level}`)

    expect(skips).toEqual([])

    const empty = headings.filter((heading) => (heading.textContent ?? '').trim() === '')
    expect(empty.map(describeElement)).toEqual([])
  })

  it('AC6: every image carries alt text that matches whether it is informative or decorative', () => {
    const images = [...page.document.querySelectorAll('img')]
    expect(images.length).toBeGreaterThan(0)

    const problems = images.flatMap((image) => {
      const path = describeElement(image)
      const alt = image.getAttribute('alt')
      if (alt === null) return [`${path} has no alt attribute`]

      const decorative = image.getAttribute('role') === 'presentation' || image.getAttribute('aria-hidden') === 'true'
      if (alt === '') {
        return decorative ? [] : [`${path} is empty-alt but is not marked decorative`]
      }
      if (decorative) return [`${path} is marked decorative but has alt text "${alt}"`]
      if (/\.(png|jpe?g|svg|webp|avif)$/i.test(alt)) return [`${path} alt text is a filename: "${alt}"`]
      if (/^(image|photo|picture|graphic|logo) of/i.test(alt)) {
        return [`${path} alt text starts with a redundant prefix: "${alt}"`]
      }
      if (alt.trim().length < 5) return [`${path} alt text is too short to be meaningful: "${alt}"`]
      return []
    })

    expect(problems).toEqual([])

    // Inline SVGs are images too: they need a name or must be hidden.
    const svgProblems = [...page.document.querySelectorAll('svg')]
      .filter((svg) => {
        const labelled =
          svg.getAttribute('aria-label') ?? svg.querySelector('title')?.textContent?.trim() ?? ''
        return svg.getAttribute('aria-hidden') !== 'true' && labelled === ''
      })
      .map((svg) => `${describeElement(svg)} is neither hidden nor named`)

    expect(svgProblems).toEqual([])
  })

  it('AC6: every call to action is a native control that the keyboard can reach and see', () => {
    const ctas = [...page.document.querySelectorAll('[data-cta]')]
    expect(ctas.length, 'the homepage must expose calls to action').toBeGreaterThanOrEqual(3)

    const problems = ctas.flatMap((cta) => {
      const path = describeElement(cta)
      const issues: string[] = []
      const tag = cta.tagName.toLowerCase()

      if (tag === 'a') {
        const href = cta.getAttribute('href') ?? ''
        if (href === '' || href === '#') issues.push(`${path} is a link without a destination`)
      } else if (tag !== 'button') {
        issues.push(`${path} is a <${tag}>, not a natively focusable control`)
      }

      const tabindex = cta.getAttribute('tabindex')
      if (tabindex !== null && Number(tabindex) !== 0) {
        issues.push(`${path} has tabindex="${tabindex}", which breaks the document tab order`)
      }
      if (cta.getAttribute('aria-hidden') === 'true') issues.push(`${path} is hidden from assistive tech`)
      if (cta.hasAttribute('disabled')) issues.push(`${path} is disabled`)

      const name = (cta.textContent ?? '').trim() || (cta.getAttribute('aria-label') ?? '')
      if (name.length < 4) issues.push(`${path} has no usable accessible name`)

      for (const viewport of Object.values(VIEWPORTS)) {
        const { style } = computeStyle(page.sheet, cta, viewport, { state: ':focus-visible' })
        const outline = style['outline'] ?? ''
        const hasOutline = outline !== '' && !outline.startsWith('none') && style['outline-width'] !== '0'
        const hasRing = (style['box-shadow'] ?? 'none') !== 'none'
        if (!hasOutline && !hasRing) {
          issues.push(`${path} has no visible focus indicator at ${viewport.name}`)
        }
      }
      return issues
    })

    expect(problems).toEqual([])
  })

  it('AC6: the tab order is the document order and a skip link leads to main content', () => {
    const focusable = [
      ...page.document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]'),
    ]
    const positiveTabindex = focusable
      .filter((element) => Number(element.getAttribute('tabindex') ?? '0') > 0)
      .map(describeElement)
    expect(positiveTabindex).toEqual([])

    const skipLink = page.document.querySelector('a[href^="#"].skip-link')
    expect(skipLink, 'a skip link must be the first focusable element').not.toBeNull()
    expect(focusable[0]).toBe(skipLink)

    const targetId = skipLink!.getAttribute('href')!.slice(1)
    const target = page.document.getElementById(targetId)
    expect(target, `skip link target #${targetId} must exist`).not.toBeNull()
    expect(target!.tagName.toLowerCase()).toBe('main')

    // The skip link must move into view once focused, not stay off-screen.
    const resting = computeStyle(page.sheet, skipLink!, VIEWPORTS.phone)
    const focused = computeStyle(page.sheet, skipLink!, VIEWPORTS.phone, { state: ':focus' })
    const offsetOf = (style: Record<string, string>): string =>
      `${style['transform'] ?? ''}|${style['top'] ?? ''}|${style['position'] ?? ''}`
    expect(offsetOf(focused.style), 'the skip link must reveal itself on focus').not.toBe(
      offsetOf(resting.style),
    )
  })

  it('AC6: landmarks, language and the viewport meta let assistive tech and mobile browsers orient', () => {
    const html = page.document.documentElement
    expect(html.getAttribute('lang')).toBeTruthy()

    const viewportMeta = page.document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
    expect(viewportMeta).toContain('width=device-width')
    expect(viewportMeta).not.toMatch(/user-scalable\s*=\s*no/)
    expect(viewportMeta).not.toMatch(/maximum-scale\s*=\s*1/)

    expect(page.document.querySelectorAll('main')).toHaveLength(1)
    expect(page.document.querySelector('header')).not.toBeNull()
    expect(page.document.querySelector('nav')).not.toBeNull()
    expect(page.document.querySelector('footer')).not.toBeNull()

    const title = page.document.title.trim()
    expect(title.length).toBeGreaterThan(10)
    expect(page.document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '').not.toBe('')

    // Every section that is a landmark needs an accessible name.
    const unnamed = [...page.document.querySelectorAll('main section')]
      .filter((section) => !section.getAttribute('aria-labelledby') && !section.getAttribute('aria-label'))
      .map(describeElement)
    expect(unnamed).toEqual([])
  })

  it('AC6: motion respects the reduced-motion preference', () => {
    expect(page.css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })
})
