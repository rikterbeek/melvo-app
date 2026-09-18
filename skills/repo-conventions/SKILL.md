---
name: repo-conventions
description: Organization-specific facts every agent needs — stack, commands, branch and PR rules, coding standards, what never to touch. Fill this in; the role skills refer to it.
agents: [product_manager, architect, qa_lead, security_engineer, engineer, sre, performance_engineer, devex_specialist, technical_writer, engineering_manager]
---

# Repository conventions

<!-- Replace every ⟨…⟩. Keep it short: facts, commands, rules. The role skills describe how agents work; this file says what is true about YOUR repositories. See references/melvo.md for a filled-in example. -->

## Hosting

- Organization / account: ⟨GitHub account⟩ · visibility: ⟨private⟩ · new repo command: ⟨…⟩

## Stack

| Repository | Purpose | Language / framework | Package manager | Test runner |
|---|---|---|---|---|
| ⟨repo⟩ | ⟨work repo purpose⟩ | ⟨e.g. TypeScript / NestJS⟩ | ⟨pnpm⟩ | ⟨vitest⟩ |

## Commands (run from the repository root)

| Action | Command |
|---|---|
| install | ⟨pnpm install --frozen-lockfile⟩ |
| build | ⟨pnpm build⟩ |
| unit tests | ⟨pnpm test⟩ |
| integration tests | ⟨pnpm test:integration⟩ (needs Docker) |
| lint / typecheck | ⟨pnpm lint && pnpm typecheck⟩ |
| generate contract / clients | ⟨pnpm contract:export⟩ |
| database migration | ⟨pnpm prisma migrate dev --name <name>⟩ |

## Branches, commits, pull requests

- Default branch: ⟨main⟩. Agent branches: `melvo/task-<key>` (fixed by the platform).
- Commit message: ⟨`<scope>: <what changed>`⟩. Co-authors preserved.
- PR must include: ⟨checklist items beyond the platform default⟩.
- Required checks before a human merges: ⟨list⟩.

## Coding standards

- ⟨formatter / linter and config path⟩
- ⟨error handling convention⟩
- ⟨logging convention⟩
- ⟨naming rules⟩

## Static checks

- One command runs the whole static stage: ⟨`pnpm check` / `uv run check`⟩ — formatting, lint (zero warnings), types, Semgrep, dependency audit.
- Complexity limits: ⟨cognitive ≤ 15, cyclomatic ≤ 10, function ≤ 60 lines, file ≤ 400⟩ — refactor on breach.
- Suppressions: ⟨reason required on the same line⟩.

## Testing rules specific to this organization

- Coverage gate: ⟨95 % lines, merged unit + integration⟩
- Test intents required in: ⟨test/integration/**⟩
- E2E test plan location: ⟨e2e/testplan/*.yaml⟩

## Time & text

- Timestamps: ⟨UTC `TIMESTAMPTZ`; RFC 3339 `Z` in APIs; render client-side in the user's zone⟩
- User-facing strings: ⟨catalog keys; ICU plurals; no literals in components⟩

## Never

- ⟨files or directories agents must not modify, e.g. generated code, infra, secrets⟩
- ⟨commands agents must not run⟩

## Domain vocabulary

| Term | Meaning |
|---|---|
| ⟨term⟩ | ⟨one line⟩ |
