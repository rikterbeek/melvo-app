# Melvo settings — Melvo Labs

This repository holds the organization's Melvo configuration. Skills live under `skills/<name>/SKILL.md` (PRD-1 FR-CFG-3); Melvo syncs them on every push to the default branch.

It also holds the static "Hello, world!" site in `site/`, published to GitHub Pages — see [Deploying](#deploying).

## The site

| | |
|---|---|
| Published content | `site/` — `site/index.html` is the document served at `/` |
| Host | GitHub Pages, **source = GitHub Actions** |
| Deploy workflow | `.github/workflows/deploy-pages.yml` |

`site/index.html` is a single self-contained HTML5 document: no build step, no dependencies, no JavaScript and no request to any other origin. Opening the file from disk renders exactly what the deployed URL renders.

## Canonical URL

| | |
|---|---|
| Canonical URL | _not yet observed — no `deploy-pages` run has completed on this branch_ |
| Observed from | _not yet observed — record the run permalink here together with the URL_ |

Both rows are filled from one source only: a completed `deploy-pages` run. Open the run, read the URL from its `deploy` job's `github-pages` environment, and paste that URL into **Canonical URL** and the run's permalink (`https://github.com/<owner>/<repo>/actions/runs/<run-id>`) into **Observed from**. Never derive the URL from the repository name or the git remote — a derived URL has never been proven to serve anything. A URL without its run link, or a run link without its URL, is not a record; `npm test` fails on either.

## Deploying

Pages has exactly one source in this repository: **GitHub Actions**. There is no second mechanism — nothing is served from a branch, and the only published content is `site/`.

From a clean checkout:

1. **Set the Pages source once per repository.** On GitHub, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. Save. No branch or folder is selected; those fields disappear once the source is GitHub Actions. This step is configuration, not code — a fresh clone cannot do it for you, and the workflow fails without it.
2. **Trigger the deploy.** Either push to `main` touching `site/**` or `.github/workflows/deploy-pages.yml`, or open **Actions → Deploy site to GitHub Pages** and press **Run workflow** on `main`.
3. **Watch the run.** It has one job, `deploy`, which checks out the repository, uploads `site/` as the Pages artifact (`actions/upload-pages-artifact` with `path: site`) and deploys it (`actions/deploy-pages`).
4. **Read the URL off the run.** When `deploy` turns green, its `github-pages` environment shows the served URL. That value — not a guess — is what goes in [Canonical URL](#canonical-url), with the run's permalink as **Observed from**.
5. **Verify.** `GET` the recorded URL: it must answer `200` with `text/html` and render "Hello, world!".

## Runbook

Two failures are expected on a first deploy. Both are observed at the recorded canonical URL.

### 404 at `/`

The run is green but the URL returns `404`. Two causes, in the order to check them:

- **Wrong publish directory.** The artifact did not contain the site. Check the `deploy` job's upload step: `path` must be `site`. If it points anywhere else, the artifact root holds the wrong tree and `/` resolves to nothing.
- **Root-document mapping.** The artifact root must contain `index.html` directly. `site/index.html` maps to `/` only because `site/` is the uploaded path; if the file moves into a subdirectory of the uploaded path, `/` has no document to serve and only the subdirectory path answers.

### TLS warning

The browser warns on the recorded URL, or the connection fails before any HTTP status. The certificate has not yet been provisioned for the Pages host. This is a provisioning delay, not a configuration error: nothing in this repository changes it. Wait and retry — Pages provisions the certificate after the first successful deploy. Do not re-run the workflow to try to force it, and do not record the URL as broken until the certificate is in place.

## Tests

`npm install && npm test` — checks the published document (doctype, charset, viewport, title, "Hello, world!", no scripts, no external requests) and the deploy documentation (one mechanism, canonical URL recorded with its provenance, runbook present, `melvo-app-configuration/docs/hosting.md` in agreement).
