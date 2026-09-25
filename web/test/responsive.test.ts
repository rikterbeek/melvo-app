import { beforeAll, describe, expect, it } from 'vitest'
import { computeStyle, toPx } from './support/css-cascade.js'
import { describeElement, findHorizontalOverflow, gridTrackCount, walkBoxes } from './support/layout.js'
import { loadHomepage, VIEWPORTS, type Homepage } from './support/site.js'

/**
 * AC5 — Given a phone-sized viewport, when the homepage is opened, then all
 * sections are readable and usable in one column with no horizontal scrolling.
 */
describe('AC5: homepage on a phone viewport', () => {
  let page: Homepage
  const phone = VIEWPORTS.phone

  beforeAll(() => {
    page = loadHomepage()
  })

  it('AC5: the homepage presents every content section with its own heading on a phone', () => {
    const sections = [...page.document.querySelectorAll('main section')]
    expect(sections.length).toBeGreaterThanOrEqual(6)

    const withoutHeading = sections.filter(
      (section) => !section.querySelector('h1, h2, h3, h4, h5, h6'),
    )
    expect(withoutHeading.map(describeElement)).toEqual([])

    for (const section of sections) {
      const { style } = computeStyle(page.sheet, section, phone)
      expect(style['display'], `${describeElement(section)} is hidden on a phone`).not.toBe('none')
    }
  })

  it('AC5: no element is wider than the 360 px phone viewport, so the page never scrolls sideways', () => {
    expect(findHorizontalOverflow(page.sheet, page.document, phone)).toEqual([])
  })

  it('AC5: every multi-column container collapses to a single column on a phone', () => {
    const offenders = walkBoxes(page.sheet, page.document, phone)
      .filter((box) => (box.style['display'] ?? '').includes('grid'))
      .map((box) => {
        const gap = toPx(
          box.style['column-gap'] ?? box.style['gap']?.split(/\s+/).pop(),
          phone,
          box.fontSizePx,
          box.contentPx,
        )
        const columns = gridTrackCount(
          box.style['grid-template-columns'],
          box.contentPx,
          Number.isNaN(gap) ? 0 : gap,
          (length) => toPx(length, phone, box.fontSizePx, box.contentPx),
        )
        return { path: describeElement(box.element), columns }
      })
      .filter((box) => box.columns > 1)

    expect(offenders).toEqual([])
  })

  it('AC5: rows of content items stack rather than staying in a horizontal line on a phone', () => {
    const rows = walkBoxes(page.sheet, page.document, phone).filter(
      (box) =>
        box.element.closest('main') !== null &&
        (box.style['display'] ?? '').includes('flex') &&
        box.element.children.length > 1,
    )
    const notStacking = rows
      .filter((box) => {
        const direction = box.style['flex-direction'] ?? 'row'
        const wraps = (box.style['flex-wrap'] ?? 'nowrap') !== 'nowrap'
        return !direction.startsWith('column') && !wraps
      })
      .map((box) => describeElement(box.element))

    expect(notStacking).toEqual([])
  })

  it('AC5: media and long words are constrained to the viewport instead of pushing it wider', () => {
    const media = [...page.document.querySelectorAll('img, svg, video, iframe, picture, canvas')]
    const unconstrained = media
      .filter((element) => {
        const { style, fontSizePx } = computeStyle(page.sheet, element, phone)
        const maxWidth = toPx(style['max-width'], phone, fontSizePx, phone.width)
        return Number.isNaN(maxWidth) || maxWidth > phone.width
      })
      .map(describeElement)
    expect(unconstrained).toEqual([])

    const { style: bodyStyle } = computeStyle(page.sheet, page.document.body, phone)
    expect(
      [bodyStyle['overflow-wrap'], bodyStyle['word-break'], bodyStyle['hyphens']],
      'body must allow long unbreakable strings to wrap',
    ).toContain('break-word')
  })

  it('AC5: horizontal overflow is prevented rather than clipped away on the root element', () => {
    for (const selector of ['html', 'body']) {
      const element = page.document.querySelector(selector)!
      const { style } = computeStyle(page.sheet, element, phone)
      expect(
        [style['overflow-x'], style['overflow']],
        `${selector} must not hide overflow to mask a layout defect`,
      ).not.toContain('hidden')
    }
  })

  it('AC5: every interactive control keeps a 44 px touch target on a phone', () => {
    const controls = [...page.document.querySelectorAll('a[href], button, input, select, summary')]
    const small = controls
      .map((element) => {
        const { style, fontSizePx } = computeStyle(page.sheet, element, phone)
        if (style['display'] === 'inline' || element.closest('p, li.prose')) return null
        const minHeight = toPx(style['min-height'], phone, fontSizePx, phone.height)
        return Number.isNaN(minHeight) || minHeight < 44
          ? { path: describeElement(element), minHeight: style['min-height'] ?? '(none)' }
          : null
      })
      .filter((entry) => entry !== null)

    expect(small).toEqual([])
  })

  it('AC5: the single-column phone layout widens to multiple columns on tablet and desktop', () => {
    for (const viewport of [VIEWPORTS.tablet, VIEWPORTS.desktop]) {
      const multiColumn = walkBoxes(page.sheet, page.document, viewport)
        .filter((box) => (box.style['display'] ?? '').includes('grid'))
        .map((box) =>
          gridTrackCount(box.style['grid-template-columns'], box.contentPx, 0, (length) =>
            toPx(length, viewport, box.fontSizePx, box.contentPx),
          ),
        )
        .filter((columns) => columns > 1)

      expect(multiColumn.length, `no multi-column layout at ${viewport.name}`).toBeGreaterThan(0)
      expect(findHorizontalOverflow(page.sheet, page.document, viewport)).toEqual([])
    }
  })
})
