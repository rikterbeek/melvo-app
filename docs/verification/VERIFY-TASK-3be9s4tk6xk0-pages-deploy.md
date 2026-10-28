# Verification record — TASK-3be9s4tk6xk0 · Enable GitHub Pages and observe the live HTTPS URL

| | |
|---|---|
| **Task** | TASK-3be9s4tk6xk0 |
| **Story** | STORY-52s0w4yffc7a — Simple html website with hello world |
| **Closes** | Story AC6 · PRD-1 §6.4 FR-DEPLOY-1 · PRD-1 §10 SEC-1 · RFC-1 §12 M0/M2 (T1, T2) |
| **Repository** | `rikterbeek/melvo-app` |
| **Last updated** | 2026-10-28 |
| **Status** | **Partially complete — deploy path built and verified in test; live enablement blocked (see §4)** |

---

## 1. What this task found

The task description assumes the consolidation task had already landed `index.html` and
`.github/workflows/deploy-pages.yml`. **Neither existed in this repository.** At the start of this
task the repository contained only the Melvo configuration (`README.md`, `skills/`).

Both artefacts have therefore been created here, to the shape RFC-1 §1/§3 and ADR-001 specify, so
that the Pages enablement actually has something to publish.

## 2. What was built

| File | Purpose |
|---|---|
| `index.html` | The single static document served at `/` (RFC-1 §3, ADR-001) |
| `.github/workflows/deploy-pages.yml` | The one publisher: build → deploy → verify, source = GitHub Actions |
| `src/verify-deployment.mjs` | Evidence logic: resolves the host-assigned URL, checks `GET /` and the HTTPS redirect |
| `src/http-client.mjs` | Dependency-free HTTP(S) client capturing status, headers, body and TLS peer details |
| `scripts/verify-deployment-cli.mjs` | Runs the observation inside the deploy run and prints the evidence block |
| `test/*.test.mjs` | 40 tests covering the page, the workflow wiring, the evidence logic and the real HTTP path |

**The URL is observed, not derived.** `resolveObservedUrl()` reads the deploy job's own
`page_url` output and throws if it is absent — it has no access to the git remote and cannot fall
back to one. A test asserts this (`a URL missing from the run output is an error, never derived
from the git remote`), and a workflow guard asserts the YAML never constructs
`<owner>.github.io` by hand.

## 3. Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Pages enabled on the chosen source; a deploy run has completed successfully | ❌ **Blocked** — see §4 |
| 2 | `GET /` returns 200, HTML content type, body contains "Hello, world!" | ⚙️ **Automated, not yet observed live** — the check runs in the `verify` job; proven end to end against a local server (§5) |
| 3 | Loads over HTTPS with a valid certificate; plain HTTP redirects to it (SEC-1) | ⚙️ **Automated, not yet observed live** — same |
| 4 | Observed URL and deploy-run evidence recorded here | ⏳ **Template ready** — §6 is filled by pasting the `verify` job's run summary |
| 5 | RFC-1 T1/T2 closed with the host and URL as actually observed | **T1 closed** (host = GitHub Pages, committed in the workflow). **T2 open** — the URL cannot be stated until the run executes |

## 4. Blocker — why the live steps were not performed

Two of them are outside what this environment can do:

1. **Enabling Pages is a one-time admin action.** Settings → Pages → *Build and deployment* →
   *Source: GitHub Actions* requires repo-admin scope. No GitHub credentials and no `gh` CLI are
   present in this environment.
2. **There is no outbound network.** `api.github.com` does not resolve
   (`getaddrinfo EAI_AGAIN`), so the workflow cannot be dispatched and no live URL can be fetched.

Neither is a code defect, and neither can be worked around from here — they need a human with
admin rights on `rikterbeek/melvo-app`. Everything that *can* be built and proven ahead of them
has been.

### To complete the task

1. Merge this branch to `main`.
2. **Settings → Pages → Build and deployment → Source: `GitHub Actions`.** Do not also enable a
   branch or `/docs` source — one publisher only.
3. **Actions → "Deploy to GitHub Pages" → Run workflow** on `main`.
4. The `verify` job prints the evidence block to the run summary and **fails the run** if any
   criterion is unmet. Paste that block into §6 below and link the run in §6.
5. Close RFC-1 T2 with the URL as printed.

## 5. Test outcome

```
$ node --test test/*.test.mjs
# tests 40
# pass 40
# fail 0
# skipped 0
```

Line coverage on changed source: `verify-deployment.mjs` 100 %, `http-client.mjs` 98.44 %
(gate: 95 %).

The CLI was additionally smoke-tested end to end against a local TLS server plus a plain-HTTP
redirector on the default ports, exercising the exact code path the deploy run will take:

- **Trusted certificate, 301 → HTTPS** → `Overall: PASS`, exit 0, with `GET /` 200
  `content-type: text/html; charset=utf-8`, body containing "Hello, world!", and
  `TLS: valid, trusted · TLSv1.3`.
- **Untrusted (self-signed) certificate** → `Overall: FAIL`, exit 1, naming the certificate as the
  cause.

The failing case drove a real fix: a rejected certificate or refused connection originally threw an
uncaught exception and produced *no* record. It is now captured as a recorded failure, so a broken
deploy still yields evidence instead of a stack trace.

## 6. Observed evidence — **to be filled from the deploy run**

> Paste the `verify` job's run-summary block verbatim. Do not hand-write these values.

- **Observed URL (host-assigned):** _pending_
- **Deploy run:** _pending_
- **Observed at:** _pending_
- **Overall:** _pending_

```http
(GET / response headers — pending)
```

```http
(plain-HTTP response headers, redirects not followed — pending)
```

- **TLS:** _pending_
- **Body contains "Hello, world!":** _pending_
