# Launch verification — RFC-1 / PRD-1 §18

| | |
|---|---|
| **Verifies** | PRD-1 §18 launch checklist · RFC-1 §10 |
| **Status** | Executed — CHK-1…CHK-8 all run in a real browser |
| **Launch gate** | **PASS** |
| **Executed on** | 2026-10-28 |
| **Target** | `http://127.0.0.1:40819/` |
| **Browser** | HeadlessChrome/153.0.8010.0 (headless Chromium, clean profile per run) |
| **Artefact** | `index.html`, sha256 `a5038a2e48d6640bb9a18b98266c79ff60ad836fa055eff915530ec2b5e7b231` |
| **Raw evidence** | [`evidence/launch-verification-RFC-1.json`](evidence/launch-verification-RFC-1.json) |

## 1. Outcome

Every checklist item was **executed** against the running site in a real browser and its
result read off what the browser actually did — the rendered layout, the devtools console
and the network panel. Nothing below is inferred from the markup: the earlier verification
note could only argue these properties structurally, by grepping the committed file, which
is why it had no result to report. Each line here is an observation.

| | Observed |
|---|---|
| Desktop render | 1280 px — confirmed in-browser |
| Mobile render | 375 px — confirmed in-browser, layout viewport 375 px at scale 1 (not zoomed out) |
| Viewports with horizontal scrolling | 0 |
| Smallest rendered text | 32 px |
| Console errors | 0 |
| Page-authored console warnings | 0 |
| Requests per viewport | 1, 1 |
| Requests to hosts other than the origin | 0 |
| Host-injected scripts (R5) | 0 |
| Response byte-identical to the committed file | yes |

## 2. Checklist

| Item | Requirement | Check | Executed | Result |
|---|---|---|---|---|
| CHK-1 | FR-SITE-1 | GET / returns 200 text/html and the page renders "Hello, world!" | 2026-10-28T22:25:24Z | **PASS** |
| CHK-2 | FR-CLIENT-3 / UI-4 | Renders legibly at 1280 px with no horizontal scrolling | 2026-10-28T22:25:24Z | **PASS** |
| CHK-3 | FR-CLIENT-3 / UI-4 | Renders legibly at 375 px with no horizontal scrolling | 2026-10-28T22:25:24Z | **PASS** |
| CHK-4 | FR-BROWSER-2 | Devtools console shows zero errors and zero page-authored warnings | 2026-10-28T22:25:24Z | **PASS** |
| CHK-5 | FR-BROWSER-3 | Network panel shows exactly one request, to the site’s own origin | 2026-10-28T22:25:24Z | **PASS** |
| CHK-6 | R5 | No host-injected script, analytics or third-party request in the rendered page | 2026-10-28T22:25:24Z | **PASS** |
| CHK-7 | FR-SITE-2 | Document basics as rendered: HTML5 doctype, UTF-8, non-empty title, lang | 2026-10-28T22:25:24Z | **PASS** |
| CHK-8 | PRD §18 GA stage | Independent second check from another network route and a cold browser | 2026-10-28T22:25:24Z | **PASS** |

## 3. Evidence per item

### CHK-1 — GET / returns 200 text/html and the page renders "Hello, world!"

**PASS** · FR-SITE-1 · executed 2026-10-28T22:25:24Z

- HTTP status `200`, `content-type: text/html; charset=utf-8`
- rendered body text: `Hello, world!`

### CHK-2 — Renders legibly at 1280 px with no horizontal scrolling

**PASS** · FR-CLIENT-3 / UI-4 · executed 2026-10-28T22:25:24Z

- viewport 1280 px → layout viewport 1280 px, visual-viewport scale 1
- scrollWidth 1280 px vs clientWidth 1280 px → horizontal scrollbar: no
- smallest rendered text 32 px (floor 16 px); zoomed out: no

### CHK-3 — Renders legibly at 375 px with no horizontal scrolling

**PASS** · FR-CLIENT-3 / UI-4 · executed 2026-10-28T22:25:24Z

- viewport 375 px → layout viewport 375 px, visual-viewport scale 1
- scrollWidth 375 px vs clientWidth 375 px → horizontal scrollbar: no
- smallest rendered text 32 px (floor 16 px); zoomed out: no

### CHK-4 — Devtools console shows zero errors and zero page-authored warnings

**PASS** · FR-BROWSER-2 · executed 2026-10-28T22:25:24Z

- console errors: 0; page-authored warnings: 0
- total console messages captured across both viewports: 0
- uncaught page errors: 0

### CHK-5 — Network panel shows exactly one request, to the site’s own origin

**PASS** · FR-BROWSER-3 · executed 2026-10-28T22:25:24Z

- origin under test: `http://127.0.0.1:40819`
- desktop: 1 request(s) — GET http://127.0.0.1:40819/ (document); requests to other hosts: 0
- mobile: 1 request(s) — GET http://127.0.0.1:40819/ (document); requests to other hosts: 0

### CHK-6 — No host-injected script, analytics or third-party request in the rendered page

**PASS** · R5 · executed 2026-10-28T22:25:24Z

- `<script>` elements in the DOM the browser built: 0; `<iframe>`: 0
- absolute http(s) asset URLs in the rendered DOM: 0
- requests to hosts other than the origin: 0 (no analytics, tag manager or beacon)
- served response byte-identical to the committed `index.html`: yes (243 bytes)

### CHK-7 — Document basics as rendered: HTML5 doctype, UTF-8, non-empty title, lang

**PASS** · FR-SITE-2 · executed 2026-10-28T22:25:24Z

- doctype as parsed: `html` with publicId `(empty)` and systemId `(empty)` → HTML5
- `document.characterSet`: `UTF-8`
- `document.title`: `Hello, world!`; `<html lang>`: `en`

### CHK-8 — Independent second check from another network route and a cold browser

**PASS** · PRD §18 GA stage · executed 2026-10-28T22:25:24Z

- date: 2026-10-28; route: the host’s external network interface (172.19.0.3), not the loopback address the first check used
- second origin `http://172.19.0.3:36105` reached from a separate Chromium process (HeadlessChrome/153.0.8010.0) with a clean, throwaway profile
- CHK-1…CHK-7 re-executed over that route: 7/7 pass

## 4. Independent second check (PRD §18 GA stage)

| | Second check |
|---|---|
| Date | 2026-10-28 |
| Route | the host’s external network interface (172.19.0.3), not the loopback address the first check used |
| Origin | `http://172.19.0.3:36105` |
| Browser | HeadlessChrome/153.0.8010.0, separate process, clean profile |
| Outcome | **PASS** — 7/7 checks pass |

The second check shares no state with the first: a different browser process, a fresh
profile directory (no cache, storage or extensions) and a different network route and
origin. It re-ran CHK-1…CHK-7 end to end rather than re-reading the first run’s output.

## 5. How this was executed

```sh
npm run verify:launch            # against the local static host
npm run verify:launch -- <url>   # against any deployed URL
npm test                         # the same checks as assertions
```

The runner drives a real headless Chromium through `puppeteer-core`, loads the page at
1280 px and 375 px, subscribes to the console and to every network
request before navigation, waits for `load` plus a settling delay so that any injected
script has the chance to run and show itself, then reads the document back out of the
rendered DOM. It rewrites this record and the raw evidence JSON from that run, so the two
cannot drift; `test/verification-record.test.js` fails if they do.

## 6. Scope of this record

- The checks ran against `http://127.0.0.1:40819/` — the committed artefact served by a static host over a real HTTP origin, which is the site reachable from the verification environment; no deployed URL was supplied to this run (RFC-1 T2)
- The target is served from the committed `index.html` with no rewriting, and CHK-6 proves
  the bytes that reached the browser are the bytes in the repository.
- Scheme-level concerns of the hosting platform (TLS certificate, HSTS, CDN headers) are
  the deploy task’s to record; they are not checklist items CHK-1…CHK-8.
- Re-pointing this record at a different URL is one command, and regenerating it is the
  only sanctioned way to change it.
