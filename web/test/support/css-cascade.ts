/**
 * A viewport-aware CSS cascade resolver.
 *
 * Playwright browsers cannot be downloaded in this sandbox, so the responsive
 * and contrast audits work from the declarations that *apply* at a given
 * viewport width rather than from rendered pixels: the stylesheet is parsed,
 * `@media` blocks are evaluated against the viewport, matching rules are sorted
 * by specificity and source order, and `var()` references are resolved through
 * the inheritance chain.
 */
import postcss, { type ChildNode, type Declaration } from 'postcss'
import { lengthToPx, type LengthContext } from './length.js'

export interface Viewport {
  width: number
  height: number
  name: string
}

export type Declarations = Record<string, string>

interface FlatRule {
  selector: string
  /** Pseudo-classes stripped from the selector so jsdom can match it. */
  matchSelector: string
  states: string[]
  pseudoElement: string | null
  specificity: number
  order: number
  declarations: Declarations
  /** `@media` conditions that must all match for the rule to apply. */
  media: string[]
}

/** Properties that inherit and that the audits actually read. */
const INHERITED = new Set([
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'white-space',
  'word-break',
  'overflow-wrap',
  'visibility',
])

const MATCHABLE_STATES = [
  ':hover',
  ':focus',
  ':focus-visible',
  ':focus-within',
  ':active',
  ':visited',
  ':target',
]

const ROOT_FONT_SIZE = 16

function specificityOf(selector: string): number {
  const ids = selector.match(/#[\w-]+/g)?.length ?? 0
  const classes =
    (selector.match(/\.[\w-]+/g)?.length ?? 0) +
    (selector.match(/\[[^\]]+\]/g)?.length ?? 0) +
    (selector.match(/:(?!:)[\w-]+/g)?.length ?? 0)
  const elements =
    (selector.match(/(^|[\s>+~(])([a-z][\w-]*)/gi)?.length ?? 0) +
    (selector.match(/::[\w-]+/g)?.length ?? 0)
  return ids * 10_000 + classes * 100 + elements
}

function evaluateMediaQuery(params: string, viewport: Viewport): boolean {
  const queries = params.split(',').map((q) => q.trim().toLowerCase())
  return queries.some((query) => {
    if (query.startsWith('not ')) return false
    const ctx: LengthContext = {
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      rootFontSize: ROOT_FONT_SIZE,
      parentFontSize: ROOT_FONT_SIZE,
      percentBasis: viewport.width,
    }
    return query
      .split(/\s+and\s+/)
      .every((clause) => evaluateMediaClause(clause.trim(), viewport, ctx))
  })
}

function evaluateMediaClause(clause: string, viewport: Viewport, ctx: LengthContext): boolean {
  if (clause === 'screen' || clause === 'all' || clause === '') return true
  if (clause === 'print') return false

  const feature = /^\(\s*(min|max)-(width|height)\s*:\s*([^)]+)\)$/.exec(clause)
  if (feature) {
    const limit = lengthToPx(feature[3]!, ctx)
    const actual = feature[2] === 'width' ? viewport.width : viewport.height
    return feature[1] === 'min' ? actual >= limit : actual <= limit
  }

  const range = /^\(\s*(width|height)\s*(>=|<=|>|<)\s*([^)]+)\)$/.exec(clause)
  if (range) {
    const limit = lengthToPx(range[3]!, ctx)
    const actual = range[1] === 'width' ? viewport.width : viewport.height
    switch (range[2]) {
      case '>=':
        return actual >= limit
      case '<=':
        return actual <= limit
      case '>':
        return actual > limit
      default:
        return actual < limit
    }
  }

  // User-preference features are evaluated as the default (no preference set).
  if (/prefers-reduced-motion|prefers-color-scheme|prefers-contrast|forced-colors/.test(clause)) {
    return /no-preference|light|none/.test(clause)
  }
  if (/hover|pointer|orientation|resolution|aspect-ratio/.test(clause)) return true
  return false
}

function splitSelector(selector: string): {
  matchSelector: string
  states: string[]
  pseudoElement: string | null
} {
  const states: string[] = []
  let pseudoElement: string | null = null
  let matchSelector = selector

  const element = /::[\w-]+(\([^)]*\))?/.exec(matchSelector)
  if (element) {
    pseudoElement = element[0]
    matchSelector = matchSelector.replace(element[0], '')
  }
  for (const state of MATCHABLE_STATES) {
    const pattern = new RegExp(`${state}(?![\\w-])`, 'g')
    if (pattern.test(matchSelector)) {
      states.push(state)
      matchSelector = matchSelector.replace(pattern, '')
    }
  }
  return { matchSelector: matchSelector.trim() || '*', states, pseudoElement }
}

export class Stylesheet {
  readonly #rules: FlatRule[] = []
  readonly source: string

  constructor(css: string) {
    this.source = css
    postcss.parse(css).each((node) => this.#collect(node, []))
  }

  #collect(node: ChildNode, media: string[]): void {
    if (node.type === 'rule') {
      const declarations: Declarations = {}
      node.each((child) => {
        if (child.type === 'decl') {
          declarations[child.prop.toLowerCase()] = (child as Declaration).value.trim()
        }
      })
      for (const selector of node.selectors) {
        const { matchSelector, states, pseudoElement } = splitSelector(selector)
        this.#rules.push({
          selector,
          matchSelector,
          states,
          pseudoElement,
          specificity: specificityOf(selector),
          order: this.#rules.length,
          declarations,
          media,
        })
      }
      return
    }
    if (node.type !== 'atrule') return
    const name = node.name.toLowerCase()
    if (name !== 'media' && name !== 'supports' && name !== 'layer') return
    const nested = name === 'media' ? [...media, node.params] : media
    node.each?.((child) => this.#collect(child, nested))
  }

  #applies(rule: FlatRule, viewport: Viewport): boolean {
    return rule.media.every((params) => evaluateMediaQuery(params, viewport))
  }

  /**
   * Declarations that apply to `element` at `viewport`, before inheritance.
   * `state` selects rules gated on a pseudo-class such as `:focus-visible`;
   * `pseudoElement` selects `::before` style rules.
   */
  declarationsFor(
    element: Element,
    viewport: Viewport,
    options: { state?: string; pseudoElement?: string } = {},
  ): Declarations {
    const wantedState = options.state ?? null
    const wantedPseudo = options.pseudoElement ?? null
    const matched = this.#rules
      .filter((rule) => {
        if (rule.pseudoElement !== wantedPseudo) return false
        if (wantedState === null ? rule.states.length > 0 : !rule.states.includes(wantedState)) return false
        if (!this.#applies(rule, viewport)) return false
        try {
          return element.matches(rule.matchSelector)
        } catch {
          return false
        }
      })
      .sort((a, b) => a.specificity - b.specificity || a.order - b.order)

    const result: Declarations = {}
    for (const rule of matched) Object.assign(result, rule.declarations)
    const inline = element.getAttribute('style')
    if (inline && wantedState === null && wantedPseudo === null) {
      for (const part of inline.split(';')) {
        const [prop, ...rest] = part.split(':')
        if (prop && rest.length) result[prop.trim().toLowerCase()] = rest.join(':').trim()
      }
    }
    return result
  }

  /** Every selector in the sheet, useful for asserting a rule exists at all. */
  get selectors(): string[] {
    return this.#rules.map((rule) => rule.selector)
  }
}

function resolveVars(value: string, variables: Declarations, depth = 0): string {
  if (depth > 10 || !value.includes('var(')) return value
  const resolved = value.replace(/var\(\s*(--[\w-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (_m, name: string, fallback?: string) => {
    const declared = variables[name]
    if (declared !== undefined) return declared
    return fallback === undefined ? '' : fallback.trim()
  })
  return resolveVars(resolved, variables, depth + 1)
}

export interface ComputedStyle extends Declarations {}

export interface ResolvedElement {
  element: Element
  style: ComputedStyle
  fontSizePx: number
  /** Nearest ancestor background that is not transparent, already composited. */
  variables: Declarations
}

/**
 * Walks the ancestor chain from `:root` down, applying inheritance and
 * resolving custom properties, and returns the computed style of `element`.
 */
export function computeStyle(
  sheet: Stylesheet,
  element: Element,
  viewport: Viewport,
  options: { state?: string } = {},
): ResolvedElement {
  const chain: Element[] = []
  for (let node: Element | null = element; node; node = node.parentElement) chain.unshift(node)

  let inherited: Declarations = {}
  let variables: Declarations = {}
  let parentFontSize = ROOT_FONT_SIZE
  let fontSizePx = ROOT_FONT_SIZE
  let style: ComputedStyle = {}

  for (const [index, node] of chain.entries()) {
    const isTarget = index === chain.length - 1
    const raw = sheet.declarationsFor(node, viewport)
    if (isTarget && options.state) Object.assign(raw, sheet.declarationsFor(node, viewport, { state: options.state }))

    const localVars: Declarations = { ...variables }
    for (const [prop, value] of Object.entries(raw)) {
      if (prop.startsWith('--')) localVars[prop] = resolveVars(value, localVars)
    }

    const resolved: Declarations = {}
    for (const [prop, value] of Object.entries(raw)) {
      if (prop.startsWith('--')) continue
      resolved[prop] = resolveVars(value, localVars)
    }

    parentFontSize = index === 0 ? ROOT_FONT_SIZE : fontSizePx
    const declaredFontSize = resolved['font-size']
    if (declaredFontSize) {
      const px = lengthToPx(declaredFontSize, {
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        rootFontSize: ROOT_FONT_SIZE,
        parentFontSize,
        percentBasis: parentFontSize,
      })
      if (!Number.isNaN(px)) fontSizePx = px
    } else {
      fontSizePx = parentFontSize
    }

    style = { ...inherited, ...resolved }
    variables = localVars
    inherited = Object.fromEntries(
      Object.entries(style).filter(([prop]) => INHERITED.has(prop)),
    )
  }

  return { element, style, fontSizePx, variables }
}

export function toPx(value: string | undefined, viewport: Viewport, fontSizePx: number, percentBasis: number): number {
  if (value === undefined) return Number.NaN
  return lengthToPx(value, {
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    rootFontSize: ROOT_FONT_SIZE,
    parentFontSize: fontSizePx,
    percentBasis,
  })
}

export { ROOT_FONT_SIZE }
