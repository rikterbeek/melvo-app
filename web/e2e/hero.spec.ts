import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Acceptance criteria for the homepage hero, run once per viewport in the
 * matrix defined in playwright.config.ts.
 *
 *   AC1 — headline, supporting sentence and one primary CTA are visible
 *         without scrolling, on desktop and on phone viewports.
 *   AC5 — on a phone viewport the hero is single column, with no horizontal
 *         scrolling.
 */

// Sub-pixel layout rounding: a box ending 0.5px past the fold is not a defect.
const ROUNDING_TOLERANCE_PX = 1;

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, "element should have a layout box").not.toBeNull();
  return box!;
}

function heroParts(page: Page) {
  return {
    hero: page.getByTestId("hero"),
    headline: page.getByTestId("hero-headline"),
    supportingSentence: page.getByTestId("hero-supporting-sentence"),
    cta: page.getByTestId("hero-primary-cta"),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("AC1: headline, supporting sentence and one primary CTA are visible without scrolling", async ({
  page,
}, testInfo) => {
  const { headline, supportingSentence, cta } = heroParts(page);
  const viewportHeight = testInfo.project.use.viewport!.height;

  for (const part of [headline, supportingSentence, cta]) {
    await expect(part).toBeVisible();

    const box = await boxOf(part);
    expect(box.y, `${await part.getAttribute("data-testid")} starts above the fold`)
      .toBeGreaterThanOrEqual(-ROUNDING_TOLERANCE_PX);
    expect(
      box.y + box.height,
      `${await part.getAttribute("data-testid")} ends within the fold`,
    ).toBeLessThanOrEqual(viewportHeight + ROUNDING_TOLERANCE_PX);
  }

  // "Without scrolling" also means the page itself offers nothing to scroll to.
  const { scrollHeight, clientHeight } = await page.evaluate(() => {
    const root = document.documentElement;
    return { scrollHeight: root.scrollHeight, clientHeight: root.clientHeight };
  });
  expect(scrollHeight).toBeLessThanOrEqual(clientHeight + ROUNDING_TOLERANCE_PX);
});

test("AC1: the hero offers exactly one call to action", async ({ page }) => {
  const { hero } = heroParts(page);

  await expect(hero.getByRole("link")).toHaveCount(1);
  await expect(hero.getByRole("button")).toHaveCount(0);
});

test("AC5: the hero does not scroll horizontally", async ({ page }) => {
  const { scrollWidth, clientWidth } = await page.evaluate(() => {
    const root = document.documentElement;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });

  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + ROUNDING_TOLERANCE_PX);
});

test("AC5: every hero element sits within the viewport width", async ({
  page,
}, testInfo) => {
  const viewportWidth = testInfo.project.use.viewport!.width;
  const { headline, supportingSentence, cta } = heroParts(page);

  for (const part of [headline, supportingSentence, cta]) {
    const box = await boxOf(part);
    expect(box.x).toBeGreaterThanOrEqual(-ROUNDING_TOLERANCE_PX);
    expect(box.x + box.width).toBeLessThanOrEqual(
      viewportWidth + ROUNDING_TOLERANCE_PX,
    );
  }
});

test("AC5: on a phone the hero is a single column", async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("phone"),
    "single-column layout is only required on phone viewports",
  );

  const { headline, supportingSentence, cta } = heroParts(page);
  const [headlineBox, sentenceBox, ctaBox] = await Promise.all([
    boxOf(headline),
    boxOf(supportingSentence),
    boxOf(cta),
  ]);

  // Single column: each element starts below the previous one, so no two of
  // them share a row.
  expect(headlineBox.y + headlineBox.height).toBeLessThanOrEqual(sentenceBox.y);
  expect(sentenceBox.y + sentenceBox.height).toBeLessThanOrEqual(ctaBox.y);
});
