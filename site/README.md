# Hello, world! — static site

One static HTML page, `index.html`, served at the site root over HTTPS. No build step, no
JavaScript, no dependencies, no external requests (PRD-1, RFC-1, ADR-001).

Open `index.html` in a browser to see exactly what the deployed page shows.

## Canonical URL

<!-- BEGIN generated:canonical-url -->
**Canonical URL:** not yet observed.

No deploy run has published this site yet, so there is no URL to record. This value is
**not derived from the git remote**, on purpose: the URL a reader could work out from the
remote is a guess, not a fact. Run the deploy procedure in
[docs/hosting.md](docs/hosting.md#deploy), then record what the run actually served:

```sh
npm run record:deploy -- --url <url-from-the-deploy-run> --run-url <github-actions-run-url>
```
<!-- END generated:canonical-url -->

Generated from `deploy-observation.json` by `npm run docs:sync`; do not edit it by hand.

## Deploy

Hosting, the publishing source, the step-by-step procedure and the runbook for a failed deploy
live in one place: [docs/hosting.md](docs/hosting.md#deploy).

## Checks

| Action | Command |
|---|---|
| tests | `npm test` |
| documentation in sync with the observed deploy | `npm run docs:check` |
| both | `npm run check` |
