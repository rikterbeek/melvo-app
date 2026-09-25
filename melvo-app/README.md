# melvo-app

The Melvo web application. It currently serves one page, whose only purpose is to
validate the integration end to end — build, deploy, routing.

| Route | Auth | Response |
|---|---|---|
| `GET /hello` | none (public) | `200 text/html`, body contains the exact text `Hello World` |

## Stack

TypeScript on Node 20+, Express 5 as the routing layer, Vitest + Supertest for tests.
Package manager: npm (`pnpm` is unavailable in the build sandbox).

## Commands

Run from `melvo-app/`:

| Action | Command |
|---|---|
| install | `npm install` |
| build | `npm run build` (emits `dist/`) |
| start (production) | `npm start` — honours `PORT` (default `3000`) and `HOST` (default `0.0.0.0`) |
| dev | `npm run dev` |
| unit + integration tests | `npm test` |
| tests with coverage | `npm run test:coverage` (95 % gate) |
| typecheck | `npm run typecheck` |
| all static checks + tests + build | `npm run check` |

## How to verify

```bash
npm install && npm run build
PORT=3000 npm start
# in another shell:
node -e "fetch('http://127.0.0.1:3000/hello').then(async r => console.log(r.status, await r.text()))"
```

Expected: status `200` and an HTML document containing `Hello World`.

## Notes

`/hello` is mounted before any other middleware in `src/app.ts` so it stays
anonymously reachable when authentication is added later. `src/main.ts` is the
process bootstrap and is excluded from coverage; it is exercised by running the
built server as shown above.
