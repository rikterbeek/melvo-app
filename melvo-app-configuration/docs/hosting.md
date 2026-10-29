# Hosting

The site is hosted on GitHub Pages with **source = GitHub Actions**. That is the only deploy mechanism; this document and the [README](../../README.md) describe the same one. If they ever disagree, the README and `.github/workflows/deploy-pages.yml` are the record and this file is wrong.

## What is published

| | |
|---|---|
| Published content | `site/` — `site/index.html` is the document served at `/` |
| Host | GitHub Pages, source = GitHub Actions |
| Deploy workflow | `.github/workflows/deploy-pages.yml` |
| Workflow triggers | push to `main` touching `site/**` or the workflow file; `Run workflow` (`workflow_dispatch`) |

Only `site/` is uploaded. Everything else in the repository — `skills/`, `melvo-app-configuration/`, the test setup — is never served.

## Canonical URL

| | |
|---|---|
| Canonical URL | _not yet observed — no `deploy-pages` run has completed on this branch_ |
| Observed from | _not yet observed — record the run permalink here together with the URL_ |

The URL is read from a completed `deploy-pages` run (the `deploy` job's `github-pages` environment URL) and recorded together with that run's permalink. It is never derived from the repository name or the git remote. These two rows must match the README's; `npm test` fails if they drift.

## Deploy procedure

1. **Settings → Pages → Build and deployment**: set **Source** to **GitHub Actions**. Once per repository; no branch or folder is selected.
2. Trigger the workflow: push to `main` touching `site/**` or `.github/workflows/deploy-pages.yml`, or **Actions → Deploy site to GitHub Pages → Run workflow** on `main`.
3. When the `deploy` job is green, read the served URL from its `github-pages` environment.
4. Record that URL and the run permalink in both this file and the README.
5. Verify: `GET` on the recorded URL returns `200` `text/html` rendering "Hello, world!".

## Runbook

### 404 at `/`

Green run, `404` at the URL. Either the wrong publish directory was uploaded — the upload step's `path` must be `site` — or the root-document mapping is broken: the uploaded tree's top level must contain `index.html` directly, otherwise `/` has no document.

### TLS warning

A certificate warning, or a failure before any HTTP status, means the certificate has not yet been provisioned for the Pages host. It is a provisioning delay after the first successful deploy, not a repository misconfiguration. Wait and retry.

## Permissions the workflow needs

`contents: read`, `pages: write`, `id-token: write` — set in `.github/workflows/deploy-pages.yml`. `id-token: write` is what lets `actions/deploy-pages` authenticate the deployment; without it the run fails at the deploy step even when the Pages source is correct.
