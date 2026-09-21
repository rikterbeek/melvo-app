# Melvo website

The public marketing site for Melvo. Next.js (App Router) + TypeScript + Tailwind CSS.

## Commands

Run from this directory (`web/`).

| Action | Command |
| --- | --- |
| install | `npm install` |
| dev server | `npm run dev` |
| build | `npm run build` |
| unit tests | `npm test` |
| browser tests | `npm run e2e` |
| lint + typecheck | `npm run check` |

`npm run e2e` builds the site and serves it on port 3100 itself, so no server has
to be running first. It needs the Playwright browser once: `npx playwright install chromium`.

## Layout

```
src/app/         routes (App Router)
src/components/  components and their unit tests
src/content/     site copy — the only place user-facing strings live
e2e/             Playwright specs, run against the viewport matrix
```

## Copy

All homepage hero copy — headline, supporting sentence, CTA label and CTA
destination — lives in `src/content/hero.ts`. It is **placeholder** copy until
the product owner confirms the final wording; shipping the approved version
means editing that one file and flipping `copyStatus` to `"approved"`.

## Tests

Unit tests (vitest + Testing Library) cover structure and content. Anything
about geometry — what fits above the fold, how many columns — is covered by
`e2e/hero.spec.ts`, which runs every spec against four viewports defined in
`playwright.config.ts`: 1440x900 and 1280x800 desktop, 390x844 and 360x640
phone (the short phone is the worst case for an above-the-fold layout).
