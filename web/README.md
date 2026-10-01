# Home screen web app

Static home screen built with Vite. It is responsive across mobile / tablet / desktop and meets
basic accessibility requirements (landmarks, heading order, skip link, visible focus states,
WCAG AA contrast).

## Commands

```bash
npm install
npm run dev     # local dev server
npm run build   # production build
npm test        # vitest: accessibility (axe-core) + responsiveness checks
```

## Breakpoints

| Name    | Min width      | Layout                                  |
| ------- | -------------- | --------------------------------------- |
| Mobile  | 0              | single column, wrapping header nav      |
| Tablet  | `48rem` (768px) | auto-fit card grid, roomier spacing     |
| Desktop | `64rem` (1024px) | three-column card grid, larger spacing |

## Accessibility notes

`npm test` runs axe-core over the rendered page in jsdom and fails on any `critical` or `serious`
violation. Colour contrast is reported as *incomplete* by axe under jsdom (no layout engine), so
the palette in `src/styles.css` documents its measured ratios inline — all body, link and footer
pairings are at or above 8:1.
