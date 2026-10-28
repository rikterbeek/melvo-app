# Melvo settings — Melvo Labs

This repository holds the organization's Melvo configuration. Skills live under `skills/<name>/SKILL.md` (PRD-1 FR-CFG-3); Melvo syncs them on every push to the default branch.

## Site

This is also the one repository that publishes the Hello World site, at https://rikterbeek.github.io/melvo-app/.

The published document is `site/index.html` and nothing else: the Pages source is GitHub Actions
(`.github/workflows/deploy-pages.yml`) and the artifact path is `site/`, so this README, `docs/` and
`skills/` are not served. See [docs/hosting.md](docs/hosting.md).

Tests: `npm test` (Node's built-in runner, no dependencies).
