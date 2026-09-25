import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { Stylesheet, type Viewport } from './css-cascade.js'
import budget from '../../performance-budget.json' with { type: 'json' }

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const distDir = join(projectRoot, 'dist')

export interface Asset {
  /** Path as referenced from the document, e.g. `/assets/index-abc.css`. */
  url: string
  file: string
  bytes: number
  gzipBytes: number
  type: 'html' | 'css' | 'js' | 'image' | 'font' | 'other'
}

const TYPE_BY_EXTENSION: Record<string, Asset['type']> = {
  '.html': 'html',
  '.css': 'css',
  '.js': 'js',
  '.mjs': 'js',
  '.svg': 'image',
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
  '.avif': 'image',
  '.ico': 'image',
  '.woff': 'font',
  '.woff2': 'font',
  '.ttf': 'font',
  '.otf': 'font',
}

function walk(dir: string, base = dir): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full, base) : [full]
  })
}

export function distAssets(): Asset[] {
  return walk(distDir).map((file) => {
    const contents = readFileSync(file)
    return {
      url: `/${file.slice(distDir.length + 1).split('\\').join('/')}`,
      file,
      bytes: contents.byteLength,
      gzipBytes: gzipSync(contents, { level: 9 }).byteLength,
      type: TYPE_BY_EXTENSION[extname(file).toLowerCase()] ?? 'other',
    }
  })
}

export interface Homepage {
  document: Document
  window: Window & typeof globalThis
  html: string
  css: string
  sheet: Stylesheet
  assets: Asset[]
  /** Assets the browser must fetch to render the homepage, in discovery order. */
  criticalPath: Asset[]
}

export const VIEWPORTS: Record<'phone' | 'tablet' | 'desktop', Viewport> = {
  phone: { name: 'phone', width: 360, height: 740 },
  tablet: { name: 'tablet', width: 768, height: 1024 },
  desktop: { name: 'desktop', width: 1440, height: 900 },
}

export function loadHomepage(): Homepage {
  const assets = distAssets()
  const htmlAsset = assets.find((asset) => asset.url === '/index.html')
  if (!htmlAsset) throw new Error('dist/index.html is missing — did the build run?')

  const html = readFileSync(htmlAsset.file, 'utf8')
  const dom = new JSDOM(html, { url: 'https://melvo.example/' })
  const { document } = dom.window

  const linkedStylesheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) =>
    link.getAttribute('href'),
  )
  const inlineCss = [...document.querySelectorAll('style')].map((node) => node.textContent ?? '').join('\n')
  const linkedCss = linkedStylesheets
    .map((href) => assets.find((asset) => href !== null && href.endsWith(asset.url)))
    .filter((asset): asset is Asset => asset !== undefined)
    .map((asset) => readFileSync(asset.file, 'utf8'))
    .join('\n')
  const css = `${linkedCss}\n${inlineCss}`

  const referencedUrls = new Set<string>()
  for (const href of linkedStylesheets) if (href) referencedUrls.add(href)
  for (const script of document.querySelectorAll('script[src]')) {
    referencedUrls.add(script.getAttribute('src') ?? '')
  }
  for (const img of document.querySelectorAll('img[src]')) {
    if (img.getAttribute('loading') !== 'lazy') referencedUrls.add(img.getAttribute('src') ?? '')
  }

  const criticalPath = [
    htmlAsset,
    ...assets.filter((asset) => [...referencedUrls].some((url) => url.endsWith(asset.url))),
  ]

  return {
    document,
    window: dom.window as unknown as Window & typeof globalThis,
    html,
    css,
    sheet: new Stylesheet(css),
    assets,
    criticalPath,
  }
}

export { budget }
