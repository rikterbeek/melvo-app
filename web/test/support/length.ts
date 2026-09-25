/**
 * Resolves CSS length values to pixels for a given viewport, so the responsive
 * audit can reason about widths without a layout engine.
 */

export interface LengthContext {
  viewportWidth: number
  viewportHeight: number
  rootFontSize: number
  parentFontSize: number
  /** Percentages resolve against this containing-block width. */
  percentBasis: number
}

const ABSOLUTE_UNITS: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
}

const LENGTH = /^(-?\d*\.?\d+)([a-z%]*)$/

function unitToPx(value: number, unit: string, ctx: LengthContext): number {
  const absolute = ABSOLUTE_UNITS[unit]
  if (absolute !== undefined) return value * absolute
  switch (unit) {
    case '':
      return value
    case 'rem':
      return value * ctx.rootFontSize
    case 'em':
      return value * ctx.parentFontSize
    case 'ch':
      // Average advance of `0` in the system stack, close enough for budgets.
      return value * ctx.parentFontSize * 0.52
    case 'ex':
      return value * ctx.parentFontSize * 0.5
    case 'vw':
    case 'svw':
    case 'dvw':
    case 'lvw':
      return (value / 100) * ctx.viewportWidth
    case 'vh':
    case 'svh':
    case 'dvh':
    case 'lvh':
      return (value / 100) * ctx.viewportHeight
    case 'vmin':
      return (value / 100) * Math.min(ctx.viewportWidth, ctx.viewportHeight)
    case 'vmax':
      return (value / 100) * Math.max(ctx.viewportWidth, ctx.viewportHeight)
    case '%':
      return (value / 100) * ctx.percentBasis
    default:
      return Number.NaN
  }
}

/** Splits the top-level comma-separated arguments of a CSS function body. */
function splitArgs(body: string): string[] {
  const args: string[] = []
  let depth = 0
  let current = ''
  for (const char of body) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      args.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current.trim()) args.push(current)
  return args
}

/** Finds the body of the outermost `name(...)` call, or null. */
function matchFunction(value: string, names: readonly string[]): { name: string; body: string } | null {
  const lower = value.toLowerCase()
  for (const name of names) {
    if (!lower.startsWith(`${name}(`) || !value.endsWith(')')) continue
    const body = value.slice(name.length + 1, -1)
    let depth = 0
    for (const char of body) {
      if (char === '(') depth += 1
      if (char === ')') depth -= 1
      if (depth < 0) break
    }
    if (depth === 0) return { name, body }
  }
  return null
}

const ARITHMETIC = /^[\d.\s+\-*/()]+$/

/**
 * Converts a CSS length to pixels. Returns NaN for values that are not a
 * resolvable length (`auto`, keywords, unsupported functions) so callers can
 * skip rather than silently treat them as zero.
 */
export function lengthToPx(rawValue: string, ctx: LengthContext): number {
  const value = rawValue.trim()
  if (!value) return Number.NaN

  const simple = LENGTH.exec(value)
  if (simple) return unitToPx(Number.parseFloat(simple[1]!), simple[2]!.toLowerCase(), ctx)

  const fn = matchFunction(value, ['clamp', 'min', 'max', 'calc'])
  if (!fn) return Number.NaN

  if (fn.name === 'calc') {
    const expression = fn.body.replace(/(-?\d*\.?\d+)([a-z%]+)/gi, (_match, num: string, unit: string) =>
      String(unitToPx(Number.parseFloat(num), unit.toLowerCase(), ctx)),
    )
    if (!ARITHMETIC.test(expression)) return Number.NaN
    // Expression is numeric-only by the guard above.
    const result: unknown = new Function(`return (${expression})`)()
    return typeof result === 'number' ? result : Number.NaN
  }

  const parts = splitArgs(fn.body).map((part) => lengthToPx(part, ctx))
  if (parts.some(Number.isNaN)) return Number.NaN
  if (fn.name === 'min') return Math.min(...parts)
  if (fn.name === 'max') return Math.max(...parts)
  // clamp(min, preferred, max)
  return Math.min(Math.max(parts[0]!, parts[1]!), parts[2]!)
}
