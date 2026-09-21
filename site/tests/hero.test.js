import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const pageUrl = new URL('../index.html', import.meta.url).href

// Widest common phone/desktop pair we commit to supporting. 375x667 is an
// iPhone SE — the smallest viewport in wide use, so the hardest "above the
// fold" case.
const DESKTOP = { width: 1280, height: 800 }
const PHONE = { width: 375, height: 667 }

let browser

beforeAll(async () => {
  browser = await chromium.launch()
})

afterAll(async () => {
  await browser?.close()
})

/** Opens the homepage at a viewport and hands the page to `run`. */
async function withHomepage(viewport, run) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.goto(pageUrl)
  try {
    await run(page)
  } finally {
    await context.close()
  }
}

const heroParts = (page) => ({
  headline: page.locator('[data-testid="hero-headline"]'),
  supporting: page.locator('[data-testid="hero-supporting"]'),
  cta: page.locator('[data-testid="hero-cta"]'),
})

describe('AC1 — hero is visible without scrolling', () => {
  for (const [name, viewport] of [
    ['desktop', DESKTOP],
    ['phone', PHONE],
  ]) {
    test(`AC1 (${name}): headline, supporting sentence and one primary CTA are visible without scrolling`, async () => {
      await withHomepage(viewport, async (page) => {
        const { headline, supporting, cta } = heroParts(page)

        await expect.poll(() => headline.isVisible()).toBe(true)
        await expect.poll(() => supporting.isVisible()).toBe(true)
        await expect.poll(() => cta.count()).toBe(1)
        await expect.poll(() => cta.isVisible()).toBe(true)

        for (const [label, locator] of [
          ['headline', headline],
          ['supporting sentence', supporting],
          ['primary CTA', cta],
        ]) {
          const box = await locator.boundingBox()
          expect(box, `${label} has no layout box`).not.toBeNull()
          expect(
            box.y,
            `${label} starts above the top of the ${name} viewport`,
          ).toBeGreaterThanOrEqual(0)
          expect(
            box.y + box.height,
            `${label} falls below the fold on ${name} (${viewport.width}x${viewport.height})`,
          ).toBeLessThanOrEqual(viewport.height)
        }
      })
    })
  }

  test('AC1: the headline names the product and the CTA carries a label and a destination', async () => {
    await withHomepage(DESKTOP, async (page) => {
      const { headline, supporting, cta } = heroParts(page)

      expect(await headline.textContent()).toMatch(/Melvo/i)
      // A supporting *sentence*, not a stray fragment.
      expect((await supporting.textContent()).trim()).toMatch(/\.$/)
      expect((await cta.textContent()).trim().length).toBeGreaterThan(0)
      expect(await cta.getAttribute('href')).toBeTruthy()
    })
  })
})

describe('AC5 — hero on a phone viewport', () => {
  test('AC5: the hero is a single column', async () => {
    await withHomepage(PHONE, async (page) => {
      const { headline, supporting, cta } = heroParts(page)
      const boxes = []
      for (const locator of [headline, supporting, cta]) {
        boxes.push(await locator.boundingBox())
      }

      // Single column: every element starts below the one before it, so no two
      // sit side by side.
      for (let i = 1; i < boxes.length; i += 1) {
        expect(
          boxes[i].y,
          'hero elements overlap vertically, so they are not stacked in one column',
        ).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height)
      }
    })
  })

  test('AC5: the hero does not scroll horizontally', async () => {
    await withHomepage(PHONE, async (page) => {
      const overflow = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        widest: Array.from(document.querySelectorAll('body *'))
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 0.5)
          .map((el) => el.tagName + (el.className ? `.${el.className}` : '')),
      }))

      expect(overflow.widest, 'elements overflow the phone viewport').toEqual([])
      expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth)
    })
  })

  test('AC5: the page opts into the device width instead of a desktop-sized canvas', async () => {
    await withHomepage(PHONE, async (page) => {
      const viewportMeta = await page
        .locator('meta[name="viewport"]')
        .getAttribute('content')
      expect(viewportMeta).toMatch(/width=device-width/)
    })
  })
})
