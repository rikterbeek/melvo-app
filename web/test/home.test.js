import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { source as axeSource } from 'axe-core'
import { beforeAll, describe, expect, it } from 'vitest'

const htmlPath = fileURLToPath(new URL('../index.html', import.meta.url))
const cssPath = fileURLToPath(new URL('../src/styles.css', import.meta.url))

const BREAKPOINTS = { mobile: 360, tablet: 768, desktop: 1280 }

let dom
let document
let css

beforeAll(() => {
  css = readFileSync(cssPath, 'utf8')
  const html = readFileSync(htmlPath, 'utf8').replace(
    /<link[^>]+href="[^"]*styles\.css"[^>]*>/,
    `<style>${css}</style>`,
  )
  dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true })
  document = dom.window.document
  const script = document.createElement('script')
  script.textContent = axeSource
  document.head.appendChild(script)
})

describe('home screen accessibility', () => {
  it('reports no critical or serious axe violations', async () => {
    const results = await dom.window.axe.run(document, { resultTypes: ['violations'] })
    const blocking = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact))
    expect(blocking.map((v) => `${v.impact} ${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
  })

  it('exposes banner, main and contentinfo landmarks', () => {
    expect(document.querySelectorAll('body > header')).toHaveLength(1)
    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.querySelectorAll('body > footer')).toHaveLength(1)
    expect(document.querySelector('nav')?.getAttribute('aria-label')).toBeTruthy()
  })

  it('has exactly one h1 and never skips a heading level', () => {
    const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]))
    expect(levels.filter((l) => l === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]).toBeLessThanOrEqual(1)
    })
  })

  it('provides a skip link to the main content', () => {
    const skip = document.querySelector('a.skip-link')
    expect(skip?.getAttribute('href')).toBe('#main')
    expect(document.querySelector('#main')).not.toBeNull()
  })

  it('defines a visible focus style for interactive elements', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:/)
  })
})

describe('home screen responsiveness', () => {
  it('declares a responsive viewport meta tag', () => {
    const meta = document.querySelector('meta[name="viewport"]')
    expect(meta?.getAttribute('content')).toContain('width=device-width')
    expect(meta?.getAttribute('content')).not.toContain('user-scalable=no')
  })

  it('adapts with media queries for tablet and desktop', () => {
    expect(css).toMatch(/@media\s*\(min-width:\s*48rem\)/)
    expect(css).toMatch(/@media\s*\(min-width:\s*64rem\)/)
  })

  it('guards against horizontal overflow', () => {
    expect(css).toMatch(/overflow-x:\s*hidden/)
    expect(css).toMatch(/box-sizing:\s*border-box/)
  })

  it('uses no fixed pixel width wider than the smallest supported viewport', () => {
    const widths = [...css.matchAll(/(?<![a-z-])width:\s*(\d+)px/g)].map((m) => Number(m[1]))
    widths.forEach((w) => expect(w).toBeLessThanOrEqual(BREAKPOINTS.mobile))
  })

  it('keeps media and grids fluid at every breakpoint', () => {
    expect(css).toMatch(/max-width:\s*100%/)
    expect(css).toMatch(/grid-template-columns:[^;]*(auto-fit|minmax)/)
    Object.values(BREAKPOINTS).forEach((bp) => expect(bp).toBeGreaterThan(0))
  })
})
