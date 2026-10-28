# Melvo settings — Melvo Labs

This repository holds the organization's Melvo configuration. Skills live under `skills/<name>/SKILL.md` (PRD-1 FR-CFG-3); Melvo syncs them on every push to the default branch.

It also serves the project's static website: `index.html` at the repository root is a single, dependency-free HTML5 document that renders "Hello, world!" (RFC-1, ADR-001). It has no build step, no JavaScript and no external requests, so you can open `index.html` straight from disk and see exactly what the deployed page shows.

## Deploy

| | |
|---|---|
| **Host** | GitHub Pages (platform-provided HTTPS, no custom domain) |
| **Publish source** | Branch `main`, folder `/ (root)` |
| **Deploy step** | Push to the default branch `main` — there is no deploy command and no build |
| **Canonical URL** | <https://rikterbeek.github.io/melvo-app/> |

GitHub Pages serves the publish source as static files and maps a request for `/` to the root document `index.html`. Because the publish source is the repository root, the committed `index.html` *is* the deployed page: whatever lands on `main` is what the canonical URL returns, usually within a minute or two.

### Deploy from a clean checkout

1. Clone the repository and enter it:

   ```sh
   git clone https://github.com/rikterbeek/melvo-app.git
   cd melvo-app
   ```

2. Confirm GitHub Pages is enabled once per repository, under **Settings → Pages**: set **Source** to "Deploy from a branch", **Branch** to `main` and the folder to `/ (root)`, then **Save**. Pages reports the canonical URL on that page; it must match <https://rikterbeek.github.io/melvo-app/>.

3. Edit `index.html`, commit, and push to the default branch:

   ```sh
   git add index.html
   git commit -m "site: update the hello-world page"
   git push origin main
   ```

4. Watch the **Actions** tab for the "pages build and deployment" run to finish, then verify the deploy:

   ```sh
   curl -sSI https://rikterbeek.github.io/melvo-app/
   ```

   Expect `HTTP/2 200` and `content-type: text/html`. Open the URL in a browser and confirm it renders "Hello, world!" with an empty console and exactly one network request — the document itself.

### Troubleshooting

Two failures are expected while the deploy path is new (RFC-1 §9):

| Symptom | Cause | What to do |
| --- | --- | --- |
| `GET /` on the canonical URL returns **404** | The publish source does not point at the directory holding `index.html`, so Pages has no root document to map `/` onto | Re-check **Settings → Pages**: branch `main`, folder `/ (root)`. Confirm `index.html` is at the repository root on `main` (`git ls-tree origin/main --name-only -- index.html`), not in a subdirectory, and that its name is exactly `index.html` — Pages will not serve `Index.html` or `home.html` as the root document. |
| The browser shows a **TLS / certificate warning** or the connection fails over HTTPS | The certificate for the hostname has not yet been provisioned; GitHub issues it after the first successful deploy and it can take a few minutes | Wait and retry — this resolves itself. Do not work around it by switching to `http://`. If **Settings → Pages** still reports a certificate error after ~15 minutes, toggle **Enforce HTTPS** off and on to re-request provisioning. |

## Checks

The deploy facts above and the root document are covered by tests that need no dependencies and no install step:

```sh
node --test tests/*.test.js
```
