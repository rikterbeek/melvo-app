# Launch verification — RFC-1

| | |
|---|---|
| **Verifies** | [RFC-1](https://github.com/rikterbeek/melvo-app) — single-page static "Hello, world!" website |
| **Implements** | PRD-1 §6.1 FR-PAGE-1 … FR-PAGE-4, §10 SEC-5 |
| **Last updated** | 2026-10-29 |
| **Run by** | The site owner, after each deploy to `main` |

This is the one launch-verification document for the site. It replaces the competing
versions authored on the branches behind PR #21, #22 and #24/#25, which each assumed a
different repository and a different publish path.

## Preconditions

- `rikterbeek/melvo-app` is the only site repository. `melvo-app-configuration` holds no
  `index.html` and no Pages deploy workflow.
- This repository holds exactly one `index.html` (`_site/index.html`) and exactly one
  workflow (`.github/workflows/deploy-pages.yml`).
- GitHub Pages is configured with **GitHub Actions** as its source, not "deploy from a
  branch" — a branch source would publish the repository root and break SEC-5.

## 1. Pre-deploy checks (local)

```console
$ npm test
$ find _site -type f | sort
_site/index.html
```

Both must pass before pushing. The listing must be exactly one line.

## 2. Deploy

Push to `main`. Confirm in the Actions tab that:

- exactly one workflow run started — "Deploy Pages";
- the "Record the publish directory listing" step printed `_site/index.html` and nothing
  else;
- the "Upload the publish directory" step uploaded `_site`.

## 3. Post-deploy checks (against the deployed URL)

Let `$URL` be the `page_url` output of the deploy step.

| # | Criterion | Check | Expected |
|---|---|---|---|
| FR-PAGE-1 | HTML document at `/` | `curl -sSI "$URL"` | `HTTP/2 200`, `content-type: text/html` |
| FR-PAGE-2 | Shows the text | `curl -sS "$URL" \| grep -c 'Hello, world!'` | `1` or more |
| FR-PAGE-1 | Document basics | `curl -sS "$URL" \| head -8` | doctype, `lang="en"`, `charset="utf-8"`, viewport, `<title>` |
| FR-PAGE-3 | HTTPS | `$URL` scheme | `https` |
| FR-PAGE-4 | No external requests | Browser devtools → Network, reload | exactly one request (the document) |
| FR-PAGE-4 | No console errors | Browser devtools → Console | empty |
| FR-PAGE-1 | Legible on mobile | Devtools device toolbar, 375 px wide | heading readable, no horizontal scroll |

## 4. SEC-5 — nothing but the page is published

Each of these must return `404`:

```console
$ curl -sS -o /dev/null -w '%{http_code}\n' "$URL/README.md"
$ curl -sS -o /dev/null -w '%{http_code}\n' "$URL/package.json"
$ curl -sS -o /dev/null -w '%{http_code}\n' "$URL/docs/launch-verification-RFC-1.md"
$ curl -sS -o /dev/null -w '%{http_code}\n' "$URL/skills/engineer/SKILL.md"
```

A `200` on any of them means the Pages source is publishing the repository root. Fix the
Pages source before anything else — the page itself is not the problem.

## 5. Record the result

Note in the deploy's PR or issue: the commit SHA, the workflow run URL, the publish
directory listing from step 1, and the status code from each check in step 4.
