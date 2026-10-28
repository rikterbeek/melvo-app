# launch-verification

Runs the launch checklist from **PRD-1 §18** / **RFC-1 §10** against the deployed
Hello World page and writes a dated verification record. Built for
TASK-vgrjnspaarw6 (RFC-1 M2).

No dependencies; Node ≥ 20 and its built-in test runner only.

## Why a tool for a manual gate

The gate itself is manual — a human has to look at a browser at two viewport
widths and read the devtools panels. What this tool removes is the part humans
get wrong: deciding what the observations *mean*, and remembering to write them
down. The pass/fail rules live in `src/checks.js` as pure functions over
recorded evidence, so every verdict in the record is reproducible from the
record, and an un-run check can never be filed as a passing one.

## Running it

```sh
cp evidence.example.json evidence.json      # then fill in what you saw
node src/cli.js --url https://<url>/ \
  --evidence evidence.json \
  --out ../docs/launch-verification-RFC-1.md
```

Exit codes: `0` PASS · `1` FAIL · `2` BLOCKED (no URL — RFC-1 T2).

Omit `--url` and the run writes a BLOCKED record. Omit `--evidence` and the
browser-observable checks fail as "no evidence captured" — they never pass by
default. Use `--offline` to render a record from evidence captured elsewhere
(for example the second checker's observations on another network) without
re-probing.

## The checks

| ID | Check | Source |
|---|---|---|
| CHK-1 | `GET /` over HTTPS → 200, `content-type: text/html` | PRD §18 |
| CHK-2 | plain HTTP redirects to HTTPS | SEC-1 |
| CHK-3 | TLS certificate valid for the origin | SEC-1 |
| CHK-4 | "Hello, world!" visible at 375 px and ≥ 1280 px, no horizontal scroll | PRD §18 |
| CHK-5 | zero console errors | PRD §18 |
| CHK-6 | exactly one request, no foreign host (`/favicon.ico` 404 exempt) | D2, PRD Q3 |
| CHK-7 | no host-injected script — recorded as a deviation, never a failure | R5 |
| CHK-8 | independent second check from another device or network | GA gate |

A `note` in the evidence file is copied verbatim into the record under
*Checker's note* — in judged and blocked records alike, so a blocked run can say
where the checker looked for a URL.

CHK-1 to CHK-3 are probed automatically. CHK-4 to CHK-6 and CHK-8 come from the
evidence file, because no probe can see a rendered viewport or a console.
CHK-7 inspects the served HTML for `<script>` tags the repository did not put
there.

## Tests

```sh
npm test        # node --test with coverage
```
