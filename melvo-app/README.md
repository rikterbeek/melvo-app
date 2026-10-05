# melvo-app

Next.js (App Router) application for Melvo Labs.

## Routes

| Route    | Description                        |
| -------- | ---------------------------------- |
| `/`      | Starter home page                  |
| `/hello` | Hello world page, renders `Hello World` |

## Commands

| Action          | Command                 |
| --------------- | ----------------------- |
| install         | `npm ci`                |
| dev server      | `npm run dev`           |
| build           | `npm run build`         |
| start (prod)    | `npm start`             |
| unit tests      | `npm test`              |
| tests + coverage| `npm run test:coverage` |
| static checks   | `npm run check`         |

Tests run on Vitest with React Testing Library in a jsdom environment. The
coverage gate is 95 % of lines over `src/**`.

## Notes

The root layout uses system font stacks rather than `next/font/google` so the
app builds without reaching out to a webfont CDN.
