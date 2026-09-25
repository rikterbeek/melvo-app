/**
 * Static layout analysis: walks the document top-down carrying the width
 * available to each element and reports boxes whose declared geometry cannot
 * fit, plus the number of grid tracks a container resolves to at a viewport.
 *
 * It models the parts of CSS that actually cause horizontal scrolling on a
 * phone — fixed widths, minimum widths, padding and borders on a narrow
 * containing block, and grids that keep more than one track — and ignores the
 * rest.
 */
import { computeStyle, toPx, type Stylesheet, type Viewport, type Declarations } from './css-cascade.js'

export interface OverflowFinding {
  path: string
  requiredPx: number
  availablePx: number
  reason: string
}

export function describeElement(element: Element): string {
  const parts: string[] = []
  for (let node: Element | null = element; node && node.tagName !== 'HTML'; node = node.parentElement) {
    const id = node.id ? `#${node.id}` : ''
    const classes = node.classList.length ? `.${[...node.classList].join('.')}` : ''
    parts.unshift(`${node.tagName.toLowerCase()}${id}${classes}`)
  }
  return parts.join(' > ')
}

/** Reads a side from either the longhand or the matching shorthand. */
function sideValue(style: Declarations, property: 'padding' | 'margin' | 'border-width', side: 'left' | 'right'): string | undefined {
  const longhand =
    property === 'border-width' ? style[`border-${side}-width`] : style[`${property}-${side}`]
  if (longhand !== undefined) return longhand

  if (property !== 'border-width') {
    const logical = style[`${property}-inline-${side === 'left' ? 'start' : 'end'}`] ?? style[`${property}-inline`]
    if (logical !== undefined) {
      const parts = logical.split(/\s+/)
      return parts.length === 1 ? parts[0] : side === 'left' ? parts[0] : parts[1]
    }
  }

  const shorthandName = property === 'border-width' ? 'border' : property
  const shorthand = style[shorthandName]
  if (shorthand === undefined) return undefined
  if (property === 'border-width') {
    // `border: 1px solid x` — the width is the first token.
    return shorthand.split(/\s+/)[0]
  }
  const parts = shorthand.split(/\s+/)
  if (parts.length === 1) return parts[0]
  if (parts.length === 2 || parts.length === 3) return parts[1]
  return side === 'left' ? parts[3] : parts[1]
}

function sidePx(style: Declarations, property: 'padding' | 'margin' | 'border-width', viewport: Viewport, fontSizePx: number, basis: number): number {
  const total = (['left', 'right'] as const).reduce((sum, side) => {
    const value = sideValue(style, property, side)
    if (value === undefined || value === 'auto') return sum
    const px = toPx(value, viewport, fontSizePx, basis)
    return Number.isNaN(px) ? sum : sum + px
  }, 0)
  return total
}

function isHidden(style: Declarations): boolean {
  return style['display'] === 'none' || style['visibility'] === 'hidden'
}

/** Number of column tracks a grid container resolves to at `available` px. */
export function gridTrackCount(
  value: string | undefined,
  available: number,
  gapPx: number,
  resolve: (length: string) => number,
): number {
  if (!value || value === 'none') return 1

  const repeat = /^repeat\(\s*([^,]+)\s*,\s*(.+)\)$/i.exec(value.trim())
  if (repeat) {
    const count = repeat[1]!.trim().toLowerCase()
    const tracks = repeat[2]!.trim()
    const minmax = /^minmax\(\s*([^,]+)\s*,/i.exec(tracks)
    if (count === 'auto-fit' || count === 'auto-fill') {
      const min = minmax ? resolve(minmax[1]!.trim()) : resolve(tracks)
      if (Number.isNaN(min) || min <= 0) return 1
      return Math.max(1, Math.floor((available + gapPx) / (min + gapPx)))
    }
    const explicit = Number.parseInt(count, 10)
    return Number.isNaN(explicit) ? 1 : explicit
  }

  // An explicit track list: count top-level tokens.
  let depth = 0
  let tokens = 0
  let inToken = false
  for (const char of value.trim()) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (/\s/.test(char) && depth === 0) {
      inToken = false
      continue
    }
    if (!inToken) {
      tokens += 1
      inToken = true
    }
  }
  return Math.max(1, tokens)
}

export interface ElementBox {
  element: Element
  style: Declarations
  fontSizePx: number
  availablePx: number
  contentPx: number
}

/** Walks the body, yielding each visible element with its available width. */
export function walkBoxes(sheet: Stylesheet, document: Document, viewport: Viewport): ElementBox[] {
  const boxes: ElementBox[] = []
  const body = document.body

  const visit = (element: Element, available: number): void => {
    const { style, fontSizePx } = computeStyle(sheet, element, viewport)
    if (isHidden(style)) return

    const positioned = style['position'] === 'fixed' || style['position'] === 'absolute'
    const own = positioned ? viewport.width : available

    const margins = sidePx(style, 'margin', viewport, fontSizePx, own)
    const padding = sidePx(style, 'padding', viewport, fontSizePx, own)
    const borders = sidePx(style, 'border-width', viewport, fontSizePx, own)
    const borderBox = (style['box-sizing'] ?? 'content-box') === 'border-box'

    const declaredWidth = toPx(style['width'], viewport, fontSizePx, own)
    const maxWidth = toPx(style['max-width'], viewport, fontSizePx, own)

    let outer = Number.isNaN(declaredWidth) ? own - margins : declaredWidth + (borderBox ? 0 : padding + borders)
    if (!Number.isNaN(maxWidth)) outer = Math.min(outer, maxWidth + (borderBox ? 0 : padding + borders))
    outer = Math.max(0, outer)

    const contentPx = Math.max(0, outer - (borderBox ? padding + borders : 0))

    boxes.push({ element, style, fontSizePx, availablePx: own, contentPx })
    for (const child of element.children) visit(child, contentPx)
  }

  for (const child of body.children) visit(child, viewport.width)
  return boxes
}

/** Boxes whose declared geometry is wider than the space available to them. */
export function findHorizontalOverflow(
  sheet: Stylesheet,
  document: Document,
  viewport: Viewport,
): OverflowFinding[] {
  const findings: OverflowFinding[] = []
  const tolerance = 0.5

  for (const box of walkBoxes(sheet, document, viewport)) {
    const { style, fontSizePx, availablePx } = box
    const borderBox = (style['box-sizing'] ?? 'content-box') === 'border-box'
    const margins = sidePx(style, 'margin', viewport, fontSizePx, availablePx)
    const padding = sidePx(style, 'padding', viewport, fontSizePx, availablePx)
    const borders = sidePx(style, 'border-width', viewport, fontSizePx, availablePx)
    const extras = borderBox ? 0 : padding + borders
    const path = describeElement(box.element)

    const checks: Array<[string, number | undefined]> = [
      ['width', numberOrUndefined(toPx(style['width'], viewport, fontSizePx, availablePx))],
      ['min-width', numberOrUndefined(toPx(style['min-width'], viewport, fontSizePx, availablePx))],
    ]
    for (const [property, declared] of checks) {
      if (declared === undefined) continue
      const required = declared + extras + Math.max(0, margins)
      if (required > availablePx + tolerance) {
        findings.push({
          path,
          requiredPx: Math.round(required),
          availablePx: Math.round(availablePx),
          reason: `${property}: ${style[property]}`,
        })
      }
    }

    // Padding and borders alone can overflow a border-box element at 100 %.
    if (borderBox && padding + borders + Math.max(0, margins) > availablePx + tolerance) {
      findings.push({
        path,
        requiredPx: Math.round(padding + borders + margins),
        availablePx: Math.round(availablePx),
        reason: `padding + border exceed the available width`,
      })
    }

    // A grid whose minimum track width does not fit forces a scrollbar.
    if ((style['display'] ?? '').includes('grid')) {
      const gap = toPx(style['gap']?.split(/\s+/).pop() ?? style['column-gap'], viewport, fontSizePx, box.contentPx)
      const gapPx = Number.isNaN(gap) ? 0 : gap
      const resolve = (length: string): number => toPx(length, viewport, fontSizePx, box.contentPx)
      const minmax = /minmax\(\s*([^,]+)\s*,/i.exec(style['grid-template-columns'] ?? '')
      if (minmax) {
        const min = resolve(minmax[1]!.trim())
        if (!Number.isNaN(min) && min > box.contentPx + tolerance) {
          findings.push({
            path,
            requiredPx: Math.round(min),
            availablePx: Math.round(box.contentPx),
            reason: `grid-template-columns minimum track ${minmax[1]!.trim()}`,
          })
        }
      }
      void gapPx
    }
  }

  return findings
}

function numberOrUndefined(value: number): number | undefined {
  return Number.isNaN(value) ? undefined : value
}
