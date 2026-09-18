# Repository conventions — Melvo (filled-in example)

## Hosting

- All repositories are **private** under the GitHub account `rikterbeek` (personal, `rikterbeek@me.com`); never use another account or address. New repo: `gh repo create rikterbeek/<name> --private --source=. --remote=origin --push`.

## Stack

| Repository | Purpose | Language / framework | Package manager | Test runner |
|---|---|---|---|---|
| melvo-web | product UI | TypeScript / Next.js App Router, TanStack Query, Tailwind + shadcn/ui | pnpm | vitest + RTL, Playwright |
| melvo-core | API, database owner, queue producer, SSE relay, contract generator | TypeScript / NestJS, Prisma, PostgreSQL 16, Redis 7 (BullMQ) | pnpm | vitest + @nestjs/testing, Testcontainers |
| melvo-agents | all agent work, BullMQ consumer, LLM gateway, Docker sandbox | Python 3.12 | uv | pytest, testcontainers-python |

## Commands

| Action | melvo-core / melvo-web | melvo-agents |
|---|---|---|
| install | `pnpm install --frozen-lockfile` | `uv sync` |
| build | `pnpm build` (core also runs `contract:export`) | `uv build` |
| unit | `pnpm test` | `uv run pytest tests/unit` |
| integration | `pnpm test:integration` (Docker) | `uv run pytest tests/integration` (Docker) |
| static checks (all) | `pnpm check` — Prettier, ESLint (zero warnings), tsc, Semgrep, knip, prisma/Redocly | `uv run check` — Ruff format + lint, basedpyright strict, Semgrep, pip-audit |
| contract | `pnpm contract:export` → `@melvo/contracts`, `melvo-contracts` | consume pinned `melvo-contracts` |
| migration | `pnpm prisma migrate dev --name <name>` | — |
| e2e | `pnpm e2e:plan-check && pnpm playwright test --grep @smoke` | — |

## Branches, commits, pull requests

- Default branch `main`; agent branches `melvo/task-<key>`.
- Commit: `<module>: <intent in past tense>`; e.g. `tasks: confirmed proposal creates tasks per work repo`.
- PR body: task id + link, AC checklist with proving intents, artifact summary, findings table, how to verify. Never merge (D9).
- Required checks: static, unit, integration, contract, build (+ e2e smoke on web).

## Coding standards

- Static baseline per ADR-022 / RFC-1-E: Prettier + ESLint strict-type-checked + sonarjs + boundaries / Ruff + basedpyright strict; Semgrep with the Melvo rules; Gitleaks in the pre-commit hook; Renovate for dependencies.
- Complexity limits: cognitive ≤ 15, cyclomatic ≤ 10, ≤ 60 lines per function, ≤ 400 per file, nesting ≤ 3 — refactor, never raise the limit in the same PR.
- Suppressions need a reason on the same line (`-- why` / `# why`); zero warnings — CI fails on any finding.
- Errors: typed domain errors mapped to the API error schema; never throw strings.
- Logs: JSON via the OTel logger, standard fields, redaction list (RFC-1-C §5); never log prompts by default.
- Ids: internal UUID, exposed `PREFIX-key` only (ADR-018); every table `created_at`/`updated_at`.
- Time & i18n (ADR-023): instants are `TIMESTAMPTZ` in UTC and RFC 3339 `Z` in the API; never format a date on the server; Node/Python handle UTC-aware values only (Ruff `DTZ`); "today"/"this month" use the organization time zone; all UI text through `next-intl` catalogs (`messages/en.json`), no literal JSX text, ICU plurals; logical CSS properties.

## Testing rules

- 95 % lines on core and agents, merged unit + integration; none on web.
- `intent()` / `@pytest.mark.intent` required in integration tests.
- E2E tests bind to `e2e/testplan/*.yaml` cases (`tp('TP-…')`); flip `planned → automated` in the same PR.
- LLM: cassettes for adapters, `stub` provider elsewhere; Testcontainers for Postgres/Redis; no in-memory fakes.

## Never

- Hand-edit `openapi.json`, generated clients, `RFC-1-A-initial.sql`, rendered `.svg`.
- Touch `compose/observability/*` or CI workflows without a DevEx finding naming the change.
- Add a database client to melvo-agents; call anything but `/internal/*` from agents.

## Domain vocabulary

| Term | Meaning |
|---|---|
| HIL | human-in-the-loop validation gate (product / tech validation input / tech validation output) |
| work repository | the one repo a task changes; side repositories are `read` or `read-write` extras |
| targeted re-run | a re-run after "request changes" with only the agents that raised non-low findings |
| finding | `{severity, area, statement, evidence, recommendation}` from a specialist review |
