# Hosting

How the Hello World page (PRD-1, RFC-1) reaches the web. There is exactly one site repository,
one Pages source and one publish directory. Nothing else in this document offers an alternative.

## The one site repository

| | |
|---|---|
| **Site repository** | `rikterbeek/melvo-app` — the repository containing this file |
| **Pages source** | GitHub Actions (`.github/workflows/deploy-pages.yml`) |
| **Publish directory** | `site/` |
| **Published document** | `site/index.html`, served at `/` |
| **Canonical URL** | https://rikterbeek.github.io/melvo-app/ |

`rikterbeek/melvo-app-configuration` is **not** a site repository. It holds no `index.html` and no
Pages publish mechanism, so it cannot serve `/`.

## The one Pages source

Pages must be configured as **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Selecting a branch as the source instead would create a second mechanism able to serve `/`, which
PRD-1 §6.1 FR-PAGE-3 ("exactly one HTML document at `/`") forbids. There is deliberately no
`index.html` at the repository root and none in `docs/`, the two locations a branch source would
publish from, so a misconfiguration cannot silently serve a different page.

## The one publish directory

`actions/upload-pages-artifact` is given `path: site/`, not `path: .`. Only the contents of `site/`
are uploaded and served, so `README.md`, `docs/`, `skills/`, `work-item-templates/` and
`artifact-templates/` stay unpublished (PRD-1 §10 SEC-5).

`site/` contains exactly one file, `index.html`. Anything added to `site/` becomes publicly
readable at the canonical URL — put nothing else there.

## Deploying

The workflow runs on every push to `main` that touches `site/**` or the workflow itself, and can be
started manually with **Actions → Deploy site to GitHub Pages → Run workflow**. It checks out the
repository, configures Pages, uploads `site/` and deploys that artifact. There is no build step and
no dependency install: the document is served exactly as committed.

## Verifying

```
curl -sSI https://rikterbeek.github.io/melvo-app/     # 200, content-type: text/html
curl -sS  https://rikterbeek.github.io/melvo-app/     # contains "Hello, world!"
curl -sSo /dev/null -w '%{http_code}\n' \
     https://rikterbeek.github.io/melvo-app/README.md # 404 — docs are not published
```

Enabling Pages and running the first deploy are covered by the deploy task, not by this document.
