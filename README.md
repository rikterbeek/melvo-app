# melvo-app — Hello World static website

The single site repository for PRD-1 / RFC-1. One static HTML document is served at `/`
over HTTPS by GitHub Pages. There is no build step, no dependency and no JavaScript in
the published page.

## Layout

| Path | Purpose |
|---|---|
| `_site/index.html` | The one and only published document. This is what `/` serves. |
| `.github/workflows/deploy-pages.yml` | The one and only publish mechanism. Uploads `_site`, nothing else. |
| `docs/launch-verification-RFC-1.md` | How to verify a deploy against the RFC-1 acceptance criteria. |
| `test/` | Checks on the published artifact, run with Node's built-in test runner. |
| `skills/` | Melvo agent skills. Repository content only — never published. |

## The publish directory

`_site` is the publish directory and `index.html` is its sole content. The workflow
uploads that directory and never the repository root, so `README.md`, `docs/`, `skills/`
and any template directory stay out of the published artifact (PRD-1 §10 SEC-5).

Listing the publish directory should show exactly one line:

```console
$ find _site -type f | sort
_site/index.html
```

Adding a second file to `_site`, a second `index.html` anywhere in the repository, or a
second workflow under `.github/workflows/` fails the test suite.

## Develop

The page is self-contained, so open it straight from disk — no server needed:

```console
$ open _site/index.html     # macOS; use xdg-open on Linux
```

## Test

Node 22 or newer. There are no dependencies to install:

```console
$ npm test
```

The suite asserts the document basics (doctype, `lang`, UTF-8 charset, viewport, title,
the literal text `Hello, world!`), that the page makes no external request, and that the
repository holds exactly one published document behind exactly one publish mechanism.

## Deploy

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which logs the publish
directory listing, uploads `_site` and deploys it to GitHub Pages. After a deploy,
follow `docs/launch-verification-RFC-1.md`.
