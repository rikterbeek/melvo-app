# Pages deploy observation — TASK-fsh4jn5nb3wa

| | |
|---|---|
| **Task** | TASK-fsh4jn5nb3wa — Enable GitHub Pages, run the deploy and observe the live HTTPS URL |
| **Repository** | `rikterbeek/melvo-app` |
| **Recorded** | 2026-10-29 |
| **Status** | **Blocked** — the deploy was not run and no URL was observed |
| **Machine-readable** | [`pages-deploy-observation.json`](./pages-deploy-observation.json) |
| **Raw probe output** | [`capability-probe.log`](./capability-probe.log) |

## Outcome

**No deploy was run and no URL was observed.** Every acceptance criterion on this
task depends on reaching `api.github.com` with an admin-scoped token, and neither
is available in this environment. Per the task instruction, the missing permissions
are stated below instead of inferring a URL from the git remote.

What *was* done: the repository had no site and no workflow at all, so the artefacts
the deploy needs were built and verified locally — one `index.html`, one deploy
workflow, one publish directory. The deploy itself remains to be run by a principal
that has the access listed below.

## Blockers — the exact missing permissions

Probe: `npm run verify:capability` (output committed in `capability-probe.log`).

```
FAIL  dns:api.github.com  — api.github.com did not resolve: EAI_AGAIN
FAIL  https:api.github.com  — https://api.github.com/rate_limit unreachable: getaddrinfo EAI_AGAIN api.github.com
FAIL  token:pages-administration-write  — no token in any of GITHUB_TOKEN, GH_TOKEN, GITHUB_PAT, PAGES_ADMIN_TOKEN, MELVO_GITHUB_TOKEN
FAIL  cli:gh  — gh is not installed
```

| # | Needed for | Exact missing permission or capability |
|---|---|---|
| 1 | `POST /repos/rikterbeek/melvo-app/pages` with `{"build_type":"workflow"}` — enable Pages, source = GitHub Actions | A GitHub token carrying the fine-grained repository permission **`Pages`: write** (classic-PAT equivalent: **`repo`** scope), owned by a principal with **admin** access to the repository. No token of any kind is present in the environment. |
| 2 | `POST …/actions/workflows/deploy-pages.yml/dispatches` and `GET …/actions/runs/{id}` — run the deploy and record the run URL | A GitHub token carrying the fine-grained repository permission **`Actions`: write** (dispatch) and **read** (run status). Not present; the `gh` CLI is not installed either. |
| 3 | `GET /repos/rikterbeek/melvo-app/pages` → `.html_url` — **observe** the host-assigned URL | **Outbound network egress with DNS resolution for `api.github.com`.** DNS fails with `EAI_AGAIN`, so the host cannot be asked what URL it assigned. |
| 4 | `GET /` over HTTPS, the plain-HTTP redirect and the certificate (SEC-1) | **Outbound HTTP (80) and HTTPS (443) egress to the Pages host**, plus the observed URL from row 3. Neither is available. |

Rows 1–2 are a *token* problem; rows 3–4 are a *network* problem. Both must be
fixed — a token alone cannot observe a URL from a host it cannot reach.

### What is deliberately not recorded

The git remote is `https://github.com/rikterbeek/melvo-app`. A Pages URL could be
guessed from it. **It is not recorded here**, because a guessed URL is not an
observation: the host decides the URL, and whether `/` answers at all is exactly
the thing this task exists to verify. The evidence validator in
`tools/verification/evidence.js` rejects any record whose `observedUrl.source`
describes a derived value, so this cannot be slipped in later by accident.

## Acceptance criteria

| Criterion | Status |
|---|---|
| Pages source = GitHub Actions, successful deploy run (run URL recorded) | ❌ Blocked — blockers 1 and 2 |
| Host-assigned HTTPS URL observed, not derived, recorded verbatim | ❌ Blocked — blocker 3 |
| `GET /` returns 200 with `Content-Type: text/html` (headers captured) | ❌ Blocked on the live host — blocker 4. Verified against the artefact locally (`npm test`) |
| Plain HTTP redirects to HTTPS; certificate valid (SEC-1) | ❌ Blocked — blocker 4 |
| Evidence committed under `docs/verification/` | ✅ This file, the JSON record and the probe log |

## Prerequisites that are now in place

The dependency task was supposed to leave one workflow and one publish directory.
The repository in fact contained neither, so both were created here and are
asserted by tests:

| Artefact | Fact | Test |
|---|---|---|
| `index.html` | HTML5 doctype, `lang="en"`, UTF-8, viewport, `<title>`, renders "Hello, world!" | `test/site.test.js` |
| `index.html` | No `<script>`, no external request | `test/site.test.js` |
| publish directory | Exactly one (`.`); `/` resolves to `index.html`, served as `text/html` | `test/site.test.js`, `test/deploy-workflow.test.js` |
| `.github/workflows/deploy-pages.yml` | Exactly one workflow file | `test/deploy-workflow.test.js` |
| workflow | `configure-pages` → `upload-pages-artifact` → `deploy-pages`, all version-pinned | `test/deploy-workflow.test.js` |
| workflow | Triggers on push to `main` and `workflow_dispatch` | `test/deploy-workflow.test.js` |
| workflow | Permissions exactly `contents: read`, `pages: write`, `id-token: write` | `test/deploy-workflow.test.js` |
| workflow | Deploy job exposes `page_url` as its environment URL — this is where the observed URL comes from | `test/deploy-workflow.test.js` |

## How to finish this once unblocked

Run from an environment with egress and a token meeting rows 1–2:

```sh
# 1. Enable Pages with source = GitHub Actions
gh api -X POST repos/rikterbeek/melvo-app/pages -f build_type=workflow

# 2. Run the deploy on the default branch, and record the run URL
gh workflow run deploy-pages.yml --ref main
gh run list --workflow deploy-pages.yml --limit 1 --json url,conclusion

# 3. OBSERVE the URL — read it back from the host, do not construct it
URL=$(gh api repos/rikterbeek/melvo-app/pages --jq .html_url)

# 4. Capture GET / headers (expect 200, text/html)
curl -sSD - -o /dev/null "$URL"

# 5. Capture the plain-HTTP redirect (expect 3xx → https://…)
curl -sSD - -o /dev/null "${URL/https:/http:}"

# 6. Capture the certificate (expect a valid chain, no --insecure)
echo | openssl s_client -connect "$(echo "$URL" | sed -E 's#https://([^/]+).*#\1#'):443" \
  -servername "$(echo "$URL" | sed -E 's#https://([^/]+).*#\1#')" 2>&1 | head -30
```

Then set `status` to `observed` in `pages-deploy-observation.json` and fill in
`runUrl`, `observedUrl` (with `source` naming the API response it was read from),
`httpsResponse`, `httpRedirect` and `certificate`. The record is validated on every
test run — `npm test` fails if any required field is missing, if `GET /` is not
`200 text/html`, if the redirect does not land on HTTPS, if the certificate is not
valid, or if the URL is described as derived.
