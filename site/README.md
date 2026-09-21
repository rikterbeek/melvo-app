# melvo-site

The public Melvo website. Plain static HTML and CSS — no framework, no build
step: `index.html` is the page that ships.

## Run it

```sh
npm install
npm start          # serves this directory on http://localhost:3000
```

## Test it

```sh
npx playwright install --with-deps chromium   # once
npm test
```

The tests in `tests/hero.test.js` drive a real Chromium at a desktop
(1280×800) and a phone (375×667) viewport, because the acceptance criteria are
about layout: what is visible above the fold, whether the hero is one column,
and whether the page scrolls sideways. They bind to the `data-testid`
attributes in `index.html` — keep those when the copy changes.

| Test | Proves |
|---|---|
| `AC1 (desktop)` / `AC1 (phone)` | headline, supporting sentence and exactly one primary CTA are visible with their full boxes inside the viewport, so no scrolling is needed to see them |
| `AC1: the headline names the product…` | the headline mentions Melvo; the supporting copy is a sentence; the CTA has a label and a destination |
| `AC5: the hero is a single column` | on a phone the three hero elements are stacked, never side by side |
| `AC5: the hero does not scroll horizontally` | no element extends past the phone viewport, and `scrollWidth` does not exceed it |
| `AC5: the page opts into the device width` | `meta[name=viewport]` is set to `width=device-width` |

## Placeholder copy

The hero wording, the CTA label and the CTA destination are **placeholders**
awaiting the product owner. Every one of them is marked
`data-copy-status="placeholder"` in `index.html`, so:

```sh
grep -n 'data-copy-status' index.html
```

lists everything still to be confirmed. Currently that is: the eyebrow, the
headline, the supporting sentence, and the CTA — whose `href` points at the
placeholder anchor `#request-a-demo`, which has no target yet. Replace the text
and the `href`, drop the `data-copy-status` attribute, and run `npm test`.
