/**
 * Resolves the foreground/background pair actually painted behind every piece
 * of text on the page and scores it against WCAG 2.1 AA.
 */
import { computeStyle, type Stylesheet, type Viewport } from './css-cascade.js'
import { contrastRatio, formatColor, parseColor, composite, type Rgba } from './color.js'
import { describeElement } from './layout.js'

/** WCAG 2.1 AA thresholds. */
export const AA_NORMAL_TEXT = 4.5
export const AA_LARGE_TEXT = 3
export const AA_NON_TEXT = 3

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 }

function backgroundColorOf(value: string | undefined): Rgba | null {
  if (!value) return null
  // `background: <color> ...` — take the first token that parses as a colour.
  for (const token of value.split(/\s+(?![^(]*\))/)) {
    try {
      return parseColor(token)
    } catch {
      continue
    }
  }
  return null
}

/** The opaque colour painted behind `element`, composited down the ancestry. */
export function effectiveBackground(sheet: Stylesheet, element: Element, viewport: Viewport): Rgba {
  const layers: Rgba[] = []
  for (let node: Element | null = element; node; node = node.parentElement) {
    const { style } = computeStyle(sheet, node, viewport)
    const color = backgroundColorOf(style['background-color'] ?? style['background'])
    if (!color || color.a === 0) continue
    layers.unshift(color)
    if (color.a === 1) break
  }
  return layers.reduce<Rgba>((backdrop, layer) => composite(layer, backdrop), WHITE)
}

export interface TextSample {
  path: string
  text: string
  foreground: string
  background: string
  ratio: number
  required: number
  fontSizePx: number
  bold: boolean
}

function isBold(weight: string | undefined): boolean {
  if (!weight) return false
  const numeric = Number.parseInt(weight, 10)
  return Number.isNaN(numeric) ? weight === 'bold' || weight === 'bolder' : numeric >= 700
}

/** Elements that directly contain rendered text. */
export function textBearingElements(document: Document): Element[] {
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE'])
  return [...document.body.querySelectorAll('*')].filter((element) => {
    if (skip.has(element.tagName)) return false
    if (element.closest('[hidden]')) return false
    return [...element.childNodes].some(
      (node) => node.nodeType === 3 && (node.textContent ?? '').trim().length > 0,
    )
  })
}

export function sampleContrast(
  sheet: Stylesheet,
  element: Element,
  viewport: Viewport,
): TextSample | null {
  const { style, fontSizePx } = computeStyle(sheet, element, viewport)
  if (style['display'] === 'none' || style['visibility'] === 'hidden') return null
  const declared = style['color']
  if (!declared) return null

  const bold = isBold(style['font-weight'])
  const large = fontSizePx >= 24 || (bold && fontSizePx >= 18.66)
  const background = effectiveBackground(sheet, element, viewport)
  const foreground = parseColor(declared)

  return {
    path: describeElement(element),
    text: (element.textContent ?? '').trim().slice(0, 60),
    foreground: formatColor(foreground),
    background: formatColor(background),
    ratio: contrastRatio(foreground, background),
    required: large ? AA_LARGE_TEXT : AA_NORMAL_TEXT,
    fontSizePx,
    bold,
  }
}
