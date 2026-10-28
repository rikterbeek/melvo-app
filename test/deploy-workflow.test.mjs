import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const workflowPath = fileURLToPath(new URL('../.github/workflows/deploy-pages.yml', import.meta.url))
const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, 'utf8') : ''

describe('FR-DEPLOY-1 the Pages deploy workflow is wired for the GitHub Actions source', () => {
  test('intent FR-DEPLOY-1: the deploy workflow exists', () => {
    assert.equal(existsSync(workflowPath), true)
  })

  test('intent FR-DEPLOY-2: the deploy can be triggered on demand and on push to main', () => {
    assert.match(workflow, /workflow_dispatch:/, 'must be dispatchable for the first manual run')
    assert.match(workflow, /branches:\s*\[main\]/, 'must deploy on push to main')
  })

  test('intent FR-DEPLOY-1: the workflow holds the permissions the Pages deploy requires', () => {
    assert.match(workflow, /pages:\s*write/)
    assert.match(workflow, /id-token:\s*write/)
    assert.match(workflow, /contents:\s*read/)
  })

  test('intent FR-DEPLOY-1: it uses the official Pages actions, so the source is "GitHub Actions"', () => {
    assert.match(workflow, /actions\/configure-pages@v5/)
    assert.match(workflow, /actions\/upload-pages-artifact@v3/)
    assert.match(workflow, /actions\/deploy-pages@v4/)
  })

  test('intent FR-DEPLOY-1: the deploy job exposes the host-assigned page_url as an output', () => {
    assert.match(workflow, /outputs:\s*\n\s*page_url:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/)
  })

  test('intent FR-DEPLOY-4: the verify job observes that output rather than deriving a URL', () => {
    assert.match(workflow, /PAGE_URL:\s*\$\{\{\s*needs\.deploy\.outputs\.page_url\s*\}\}/)
    assert.match(workflow, /scripts\/verify-deployment-cli\.mjs/)
    assert.doesNotMatch(workflow, /github\.repository_owner\s*\}\}\.github\.io/, 'must not derive the URL from the remote')
  })

  test('intent FR-DEPLOY-2: concurrent deploys are serialised and never cancelled mid-publish', () => {
    assert.match(workflow, /concurrency:/)
    assert.match(workflow, /cancel-in-progress:\s*false/)
  })

  test('intent FR-DEPLOY-4: the evidence is written to the run summary so the run itself records it', () => {
    assert.match(workflow, /GITHUB_STEP_SUMMARY/)
  })
})
