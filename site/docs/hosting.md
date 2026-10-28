# Hosting and deployment

This is the **single authoritative description** of how this site is hosted and deployed
(PRD-1 §6.4 FR-DEPLOY-2). No other document states the Pages source or restates the
procedure; the [README](../README.md) links here.

**Pages source:** GitHub Actions

The site is published by the workflow at
[`.github/workflows/deploy-pages.yml`](../../.github/workflows/deploy-pages.yml), which uploads
the `site/` directory as the Pages artifact. That is why `site/index.html` is served at `/` and
not at `/site/`. Pages must be configured to take its build from that workflow; nothing is
published by committing to a second branch, and no other mechanism is in use.

## Canonical URL

<!-- BEGIN generated:canonical-url -->
**Canonical URL:** not yet observed.

No deploy run has published this site yet, so there is no URL to record. This value is
**not derived from the git remote**, on purpose: the URL a reader could work out from the
remote is a guess, not a fact. Run the deploy procedure in
[docs/hosting.md](#deploy), then record what the run actually served:

```sh
npm run record:deploy -- --url <url-from-the-deploy-run> --run-url <github-actions-run-url>
```
<!-- END generated:canonical-url -->

This block, and the one in the README, are generated from `site/deploy-observation.json` by
`npm run docs:sync`. Edit the observation record (via `npm run record:deploy`), never the
rendered text — `npm run docs:check` fails the build if the two disagree.

<!-- BEGIN generated:rfc1-t2 -->
**RFC-1 T2 (deployed URL) — Open.**

T2 stays open until a deploy run is observed; see the canonical-URL block in the
[README](../README.md) for how to close it.
<!-- END generated:rfc1-t2 -->

## Deploy

From a clean checkout, with no prior state on your machine. Steps 1–4 are one-time setup for a
repository that has never published; steps 5–8 are every deploy.

1. Clone the repository and enter it: `git clone https://github.com/<owner>/<repo>.git && cd <repo>`
2. Confirm the page you are about to publish exists: `test -f site/index.html && echo ok`
3. Open the repository's **Settings → Pages** page (GitHub UI). You need admin rights on the
   repository; if **Settings** is not visible, you do not have them and cannot complete this step.
4. Under **Build and deployment**, set **Source** to `GitHub Actions` (GitHub UI), then reload the
   page and confirm it still reads `GitHub Actions`. Do not pick any other option — the workflow
   publishes the artifact itself, so any other setting publishes nothing or publishes the wrong tree.
5. Put the change on the default branch — either push to it, or merge a pull request into it:
   `git switch main && git pull && git push origin main`
6. Watch the run: open **Actions → Deploy to GitHub Pages** (GitHub UI), or
   `gh run watch --exit-status`. You can also start a run without a commit with **Run workflow** on
   that page (the workflow enables `workflow_dispatch`).
7. Read the deployed URL off the finished run: it is the output of the `deploy` job, shown as the
   environment URL on the run page, and printed by `gh run view --json jobs`. Take the URL from
   there — do not assemble it from the owner and repository names.
8. Record it, which also fetches it and rewrites the canonical-URL blocks:
   `cd site && npm run record:deploy -- --url <url-from-step-7> --run-url <run-page-url>`

A deploy is finished when step 8 exits 0: that means something answered `200` at `/` with this
site's `index.html`.

### Runbook

Two failures are expected often enough to be worth naming; both come from RFC-1 §9.

#### 404 at `/`

`GET /` returns 404 after a green workflow run.

- Confirm what the server actually says: `curl -sS -o /dev/null -w '%{http_code}\n' <url>`
- Check **Settings → Pages** still reads `GitHub Actions` (GitHub UI). Changing it resets the
  published artifact and the previous deploy stops being served.
- Check the artifact contains `index.html` at its top level, not under `site/`: on the run page,
  open the `upload-pages-artifact` step and read the file list. The workflow's `path: site` is what
  puts `index.html` at the root; a wrong `path` yields 404 at `/` and 200 at `/site/`.
- If the run itself is green but the `deploy` job never ran, Pages was not enabled when the run
  started. Enable it (step 4) and re-run with **Run workflow**.
- First-ever deploys can 404 for a few minutes while the CDN picks up the artifact. Re-check with
  the `curl` above before changing anything.

#### TLS not provisioned

The URL loads over `http` but `https` fails with a certificate error or a connection reset.

- Reproduce and read the certificate: `openssl s_client -connect <host>:443 -servername <host> </dev/null | head -20`
- On a `*.github.io` URL the certificate is issued by GitHub and cannot be missing — a failure here
  is almost always a stale local trust store or a proxy. Retry from another network before
  escalating.
- On a custom domain, **Settings → Pages → Custom domain** shows the provisioning state (GitHub UI).
  Provisioning only starts once the DNS record resolves to GitHub, and takes up to 24 hours.
- Check DNS points where Pages expects: `dig +short <host>`
- Leave **Enforce HTTPS** off until the certificate is issued (GitHub UI); turning it on first makes
  the site unreachable rather than merely insecure.
- Do not record a URL that only answers over `http` — `npm run record:deploy` refuses non-HTTPS URLs
  on purpose.
