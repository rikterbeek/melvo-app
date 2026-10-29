import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { before, describe } from 'node:test';

import { inspectDeployWorkflow } from '../tools/verification/workflow-checks.js';
import { intent } from './helpers/intent.js';

const WORKFLOW_DIR = new URL('../.github/workflows/', import.meta.url);

describe('the GitHub Pages deploy workflow', () => {
  let files;
  let workflow;

  before(async () => {
    files = (await readdir(WORKFLOW_DIR)).filter((f) => /\.ya?ml$/.test(f));
    workflow = inspectDeployWorkflow(
      await readFile(new URL(files[0], WORKFLOW_DIR), 'utf8'),
    );
  });

  intent('M0', 'exactly one workflow file exists, so one deploy path can run', () => {
    assert.deepEqual(files, ['deploy-pages.yml']);
  });

  intent('M0', 'exactly one publish directory is uploaded', () => {
    assert.deepEqual(workflow.publishPaths, ['.']);
  });

  intent('M2', 'the workflow deploys through the Pages actions, not a branch push', () => {
    assert.ok(workflow.usesAction('actions/configure-pages'));
    assert.ok(workflow.usesAction('actions/upload-pages-artifact'));
    assert.ok(workflow.usesAction('actions/deploy-pages'));
  });

  intent('M2', 'the workflow runs on the default branch and on demand', () => {
    assert.deepEqual(workflow.pushBranches, ['main']);
    assert.equal(workflow.hasWorkflowDispatch, true);
  });

  intent('SEC-1', 'the workflow requests only the permissions Pages deploys need', () => {
    assert.deepEqual(workflow.permissions, {
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    });
  });

  intent('AC1', 'the deploy job exposes the host-assigned URL as its environment url', () => {
    assert.equal(workflow.environmentName, 'github-pages');
    assert.equal(workflow.environmentUrl, '${{ steps.deployment.outputs.page_url }}');
  });

  intent('M2', 'every action is pinned to a major version, not a floating ref', () => {
    assert.ok(workflow.actionRefs.length > 0);
    for (const ref of workflow.actionRefs) {
      assert.match(ref, /@v\d+$/, `action not version-pinned: ${ref}`);
    }
  });
});
