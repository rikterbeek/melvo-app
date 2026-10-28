# Docs index — Hello World static site

The site is one hand-written `index.html` served as a static file over HTTPS. There is no build step, no dependency and no JavaScript: ADR-001 §4 bars any `package.json`, lockfile or build configuration from this repository.

## Documents

| Document | Purpose |
|---|---|
| [Launch verification record — RFC-1](launch-verification-RFC-1.md) | The launch checklist for RFC-1 and the record of its execution. Plain markdown, filled in by hand. |

## Checks

| Check | Command | What it covers |
|---|---|---|
| Contract check | `sh scripts/check-contract.sh` | The source tree: no package manifest, lockfile, build configuration or JavaScript anywhere; `index.html` is a valid HTML5 document that renders "Hello, world!" and makes no external request; the verification record is present and linked here. |
| Test suite | `sh test/run-tests.sh` | The contract check itself, plus the invariants above. POSIX shell only — nothing to install. |

Both commands run from the site root and need only a POSIX shell, `find` and `grep`.
