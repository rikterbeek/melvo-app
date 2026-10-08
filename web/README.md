# Web

The marketing site: Home, Features, About and Contact, inside a shared page shell.

React + TypeScript on Vite, tested with Vitest and Testing Library.

## Commands

Run from this directory.

| Action | Command |
|---|---|
| install | `npm install` |
| dev server | `npm run dev` |
| unit tests | `npm test` |
| coverage | `npm run test:coverage` |
| typecheck | `npm run typecheck` |
| build | `npm run build` |
| static stage (all of the above) | `npm run check` |

## Layout

- `src/App.tsx` — the four routes plus a catch-all not-found, all nested under the shared layout.
- `src/Layout.tsx` — header, primary navigation and footer rendered on every route.
- `src/navigation.ts` — the nav items in display order; routes and the nav bar both derive from this list.
- `src/text.ts` — user-facing strings as keys rather than literals in components.
- `src/pages/` — one component per route. The four site pages are placeholders; content lands in follow-up tasks.

## How to verify

`npm run check`, then `npm run dev` and visit `/`, `/features`, `/about`, `/contact` — the header,
nav and footer appear on each and the current page's nav item is marked active. Any other URL, for
example `/nope`, shows the not-found page with a link back to Home.
