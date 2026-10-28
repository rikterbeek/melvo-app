# Launch verification record — RFC-1

| | |
|---|---|
| **Artefact** | Launch verification record for [RFC-1](README.md) — single-page static "Hello, world!" website |
| **Form** | Plain markdown. This file is the whole artefact: there is no CLI, no manifest and no build step (ADR-001 §4). |
| **Status** | Template — not yet executed |
| **Last updated** | 2026-10-28 |
| **Index** | [docs/README.md](README.md) |

> **Brief**
>
> - **What** — the record a human fills in once, by hand, after deploying `index.html` to the static host.
> - **How** — open the deployed URL in a browser, read the checks below off the page, the network panel and the console, and write the observed values into the table.
> - **Why markdown** — ADR-001 §4 bars any `package.json`, lockfile or build configuration from this repository, so the checklist is executed by a person and recorded here rather than by a tool that would need installing.

---

## 1. How to execute this checklist

1. Deploy the repository to the static host and note the HTTPS URL it serves.
2. Open that URL in a desktop browser with the developer tools showing the **Network** and **Console** panels.
3. Work down §2 in order and write each **Observed** cell as you go — a literal value (`200`, `text/html; charset=utf-8`), not a tick.
4. Repeat checks LV-6 and LV-7 at a mobile viewport width (≤ 420 px), either on a handset or with the browser's device emulation.
5. Fill in §3, then record the sign-off in §4. A check whose observation does not match its expectation is a **fail**: record it as such and raise a task — do not amend the expectation.

No command is needed to run this checklist. `scripts/check-contract.sh` is a separate, repository-local check of the source tree (§5); it does not reach the network and is not a substitute for any check below.

## 2. Checks

| ID | Check | How to observe | Expected | Observed | Result |
|---|---|---|---|---|---|
| LV-1 | The site root answers | Network panel, the document request for `/` | HTTP `200` | | |
| LV-2 | The response is HTML | Response headers, `Content-Type` | `text/html` with `charset=utf-8` | | |
| LV-3 | Transport is HTTPS | The address bar scheme and padlock | `https://`, valid certificate | | |
| LV-4 | The greeting is visible | Read the rendered page | The text `Hello, world!` is visible without scrolling | | |
| LV-5 | The document is a valid HTML5 page | View source | `<!DOCTYPE html>`, `<meta charset="utf-8">`, a non-empty `<title>` | | |
| LV-6 | Legible on desktop | Rendered page at ≥ 1280 px wide | Greeting legible, no horizontal scrollbar | | |
| LV-7 | Legible on mobile | Rendered page at ≤ 420 px wide | Greeting legible, no horizontal scrollbar | | |
| LV-8 | Exactly one network request | Network panel, after a hard reload | One request — the document itself | | |
| LV-9 | No external hosts | Network panel, the request list | Every request is same-origin; no third-party host appears | | |
| LV-10 | No console errors | Console panel, after a hard reload | No errors and no warnings | | |
| LV-11 | Opens from disk | Open the local `index.html` directly in a browser | Renders identically to the deployed page | | |

## 3. Environment

| | |
|---|---|
| **Deployed URL** | *(fill in — RFC-1 §13 T2)* |
| **Static host** | *(fill in — RFC-1 §13 T1)* |
| **Commit verified** | *(fill in — the deployed commit SHA)* |
| **Browser / version** | *(fill in)* |
| **Mobile viewport used** | *(fill in — device or emulated width)* |
| **Date executed (UTC)** | *(fill in — RFC 3339, e.g. `2026-10-28T09:30:00Z`)* |

## 4. Outcome

| | |
|---|---|
| **Checks passed** | *(fill in — n of 11)* |
| **Checks failed** | *(fill in, with the ID and what was observed)* |
| **Follow-up tasks raised** | *(fill in, or "none")* |
| **Verdict** | *(pass / fail)* |
| **Verified by** | *(name, and the date in UTC)* |

## 5. Scope note

This record covers the deployed page only. Checking the shape of the source tree — that no `package.json`, lockfile, build configuration or JavaScript has crept in, and that `index.html` makes no external request — is the job of `scripts/check-contract.sh`, which runs locally over the repository and needs nothing installed.
