# Launch verification — RFC-1 single-page static site

| | |
|---|---|
| **Verifies** | RFC-1 — Single-page static "Hello, world!" website |
| **Governed by** | ADR-001 — Serve the site as a single hand-written static HTML file |
| **Last updated** | 2026-10-29 |
| **Form** | Human-readable record; the only automated aid is `scripts/check-contract.sh` (POSIX shell) |

This is the verification record for the site. It is deliberately a document plus
one shell script: ADR-001 §4/§6 require that the repository contain no
`package.json`, lockfile or build configuration, so there is no Node CLI, no test
package and nothing to install. A reviewer confirms the decision with `ls`.

## 1. What is checked

| # | Criterion (RFC-1 §1.1) | How |
|---|---|---|
| 1 | `GET /` returns 200 with an HTML document | manual — `curl -sI <url>` |
| 2 | The page renders the literal text `Hello, world!` | automated — contract check |
| 3 | Valid HTML5: doctype, UTF-8 charset, `<title>` | automated — contract check |
| 4 | Responsive viewport meta tag present | automated — contract check |
| 5 | Zero console errors, zero external requests | automated (statically: no `<script>`, no absolute asset URL) + manual spot check in a browser |
| 6 | Reachable over HTTPS at the deployed URL | manual — open the URL |
| 7 | No build toolchain in the repository (ADR-001 §4) | automated — contract check + `ls` |

Criteria 1, 6 and the browser half of 5 need a deployed URL and a browser; they
stay manual by design, and the result is written into §4 of this record at each
launch.

## 2. Running the contract check

```sh
site/scripts/check-contract.sh              # checks site/index.html
site/scripts/check-contract.sh other.html   # checks any document
```

It needs only `sh`, `grep` and `find`. It exits `0` when every static criterion
holds and `1` with a `FAIL` line per violation otherwise. No Node runtime, no
install step, no manifest.

## 3. Running the tests

```sh
site/tests/run-tests.sh
```

The suite is POSIX shell for the same reason: a test package would reintroduce
the manifest ADR-001 forbids. It asserts the absence of the Node toolchain, the
presence of this record, and that the contract check is shell-only and actually
rejects a non-conforming document.

## 4. Launch log

| Date | Deployed URL | Criteria 1/6 | Criterion 5 (browser) | Notes |
|---|---|---|---|---|
| — | _pending host choice (RFC-1 T1/T2)_ | not yet run | not yet run | The static criteria pass locally; the deploy path is still open. |

## 5. Repository listing

The listing recorded in the pull request shows no `package.json`, no lockfile and
no `node_modules` anywhere in the repository, which is the whole of ADR-001 §4's
reviewability claim.
