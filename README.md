# Melvo settings — Melvo Labs

This repository holds the organization's Melvo configuration. Skills live under `skills/<name>/SKILL.md` (PRD-1 FR-CFG-3); Melvo syncs them on every push to the default branch.

## Applications

- [`melvo-app/`](melvo-app/README.md) — the web app; serves the public Hello World page at `/`.

## Commands

Run from the repository root; each delegates to the application and installs its
dependencies first, so a fresh checkout needs no separate setup step.

| Action | Command |
|---|---|
| tests | `npm test` |
| coverage (95 % line gate) | `npm run test:coverage` |
| typecheck | `npm run typecheck` |
| typecheck + tests + coverage gate | `npm run check` |
