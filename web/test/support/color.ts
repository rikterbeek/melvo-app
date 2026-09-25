/**
 * Minimal colour parsing plus the WCAG 2.1 contrast maths used by the
 * accessibility audit. Only the notations the site stylesheet actually uses
 * are supported; anything else throws so an unparsed colour can never be
 * mistaken for a passing contrast ratio.
 */

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

const NAMED: Record<string, Rgba> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseChannel(token: string, scale: number): number {
  const text = token.trim()
  if (text.endsWith('%')) return clamp((Number.parseFloat(text) / 100) * scale, 0, scale)
  return clamp(Number.parseFloat(text), 0, scale)
}

function parseAlpha(token: string | undefined): number {
  if (token === undefined) return 1
  const text = token.trim()
  if (text.endsWith('%')) return clamp(Number.parseFloat(text) / 100, 0, 1)
  return clamp(Number.parseFloat(text), 0, 1)
}

function hueToRgb(p: number, q: number, tRaw: number): number {
  let t = tRaw
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

function fromHsl(h: number, s: number, l: number, a: number): Rgba {
  const hue = (((h % 360) + 360) % 360) / 360
  if (s === 0) {
    const grey = Math.round(l * 255)
    return { r: grey, g: grey, b: grey, a }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
    a,
  }
}

/** Splits `rgb(1 2 3 / 40%)` or `rgb(1, 2, 3, 0.4)` into its arguments. */
function functionArgs(body: string): string[] {
  const [head, alpha] = body.split('/')
  const parts = head
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
  return alpha === undefined ? parts : [...parts, alpha.trim()]
}

export function parseColor(input: string): Rgba {
  const value = input.trim().toLowerCase()
  const named = NAMED[value]
  if (named) return named

  if (value.startsWith('#')) {
    const hex = value.slice(1)
    const expand = (s: string): number => Number.parseInt(s.length === 1 ? s + s : s, 16)
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: expand(hex[0]!),
        g: expand(hex[1]!),
        b: expand(hex[2]!),
        a: hex.length === 4 ? expand(hex[3]!) / 255 : 1,
      }
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: expand(hex.slice(0, 2)),
        g: expand(hex.slice(2, 4)),
        b: expand(hex.slice(4, 6)),
        a: hex.length === 8 ? expand(hex.slice(6, 8)) / 255 : 1,
      }
    }
  }

  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(value)
  if (fn) {
    const args = functionArgs(fn[2]!)
    if (fn[1]!.startsWith('rgb')) {
      return {
        r: parseChannel(args[0]!, 255),
        g: parseChannel(args[1]!, 255),
        b: parseChannel(args[2]!, 255),
        a: parseAlpha(args[3]),
      }
    }
    return fromHsl(
      Number.parseFloat(args[0]!),
      parseChannel(args[1]!, 100) / 100,
      parseChannel(args[2]!, 100) / 100,
      parseAlpha(args[3]),
    )
  }

  throw new Error(`Unsupported colour notation: ${input}`)
}

/** Paints `foreground` (possibly translucent) over an opaque `backdrop`. */
export function composite(foreground: Rgba, backdrop: Rgba): Rgba {
  const a = foreground.a
  return {
    r: Math.round(foreground.r * a + backdrop.r * (1 - a)),
    g: Math.round(foreground.g * a + backdrop.g * (1 - a)),
    b: Math.round(foreground.b * a + backdrop.b * (1 - a)),
    a: 1,
  }
}

export function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (raw: number): number => {
    const c = raw / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG 2.1 contrast ratio, rounded to two decimals to keep messages readable. */
export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const front = foreground.a === 1 ? foreground : composite(foreground, background)
  const light = Math.max(relativeLuminance(front), relativeLuminance(background))
  const dark = Math.min(relativeLuminance(front), relativeLuminance(background))
  return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100
}

export function formatColor({ r, g, b, a }: Rgba): string {
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`
}
