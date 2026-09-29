# melvo-app

A small TypeScript web app. It serves one public page at the root path (`/`) that renders **Hello World** — no authentication, no session.

## Stack

TypeScript (ESM, Node 20+) · Express 5 · Vitest + Supertest.

> The organization conventions name `pnpm` as the package manager. `pnpm` could not be fetched in the build sandbox this project was created in, so the scripts below use `npm`; switching to `pnpm` is a lockfile change only.

## Commands

| Action | Command |
|---|---|
| install | `npm install` |
| dev server | `npm run dev` |
| build | `npm run build` |
| start (built) | `npm start` |
| unit + integration tests | `npm test` |
| coverage (95 % line gate) | `npm run test:coverage` |
| typecheck | `npm run typecheck` |
| static + tests | `npm run check` |

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port the server binds. `0` picks a free port. |
| `HOST` | `0.0.0.0` | Interface the server binds. |

## How to verify

```bash
npm install
npm run check      # typecheck + tests + coverage gate
npm run dev        # then open http://localhost:3000/
curl -i http://localhost:3000/   # HTTP 200, body contains "Hello World"
```

## Layout

| Path | Purpose |
|---|---|
| `src/app.ts` | Express app; routes. |
| `src/hello-world-page.ts` | The page markup and its single piece of user-facing text. |
| `src/server.ts` | `startServer` / `stopServer` — testable lifecycle. |
| `src/main.ts` | Process entrypoint. |
| `test/hello-world-page.test.ts` | The page route, driven through Supertest. |
| `test/server.test.ts` | The running server over a real socket. |
