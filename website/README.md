# Website

Four-page marketing site: Home, Features, About, Contact. React 19 + Vite + TypeScript,
tests with Vitest and React Testing Library.

## Commands

| Action | Command |
| --- | --- |
| install | `npm install` |
| dev server | `npm run dev` |
| build | `npm run build` |
| tests | `npm test` |
| tests + coverage | `npx vitest run --coverage` |
| lint + typecheck | `npm run check` |

## Layout

- `src/routes.tsx` — the route tree; all four pages mount inside `components/Layout.tsx`.
- `src/components/Layout.tsx` — shared header, navigation and footer.
- `src/pages/` — one component per page.
- `src/content/` — page copy as data: `capabilities.ts` (Features), `companyStory.ts` (About).
- `test/` — one spec per page; `renderRoute.tsx` mounts the real route tree at a given path.
