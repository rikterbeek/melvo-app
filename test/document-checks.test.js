import assert from 'node:assert/strict';
import { describe } from 'node:test';

import { inspectHtmlDocument } from '../tools/site/document-checks.js';
import { inspectDeployWorkflow } from '../tools/verification/workflow-checks.js';
import { intent } from './helpers/intent.js';

describe('inspecting an HTML document', () => {
  intent('FR-PAGE-4', 'an absolute asset URL is reported as an external reference', () => {
    const doc = inspectHtmlDocument(
      '<!doctype html><html><body><img src="https://cdn.example/a.png" /></body></html>',
    );
    assert.deepEqual(doc.externalReferences, ['https://cdn.example/a.png']);
  });

  intent('FR-PAGE-4', 'a protocol-relative URL is reported as external too', () => {
    const doc = inspectHtmlDocument('<a href="//cdn.example/x">x</a>');
    assert.deepEqual(doc.externalReferences, ['//cdn.example/x']);
  });

  intent('FR-PAGE-4', 'a relative reference is not external', () => {
    const doc = inspectHtmlDocument('<a href="/about">x</a>');
    assert.deepEqual(doc.externalReferences, []);
  });

  intent('FR-PAGE-4', 'a script tag is reported', () => {
    const doc = inspectHtmlDocument('<body><script>var a = 1;</script></body>');
    assert.equal(doc.scriptTags.length, 1);
  });

  intent('FR-PAGE-2', 'a document missing its head metadata reports nulls, not crashes', () => {
    const doc = inspectHtmlDocument('<html><body><p>bare</p></body></html>');
    assert.equal(doc.hasDoctype, false);
    assert.equal(doc.charset, null);
    assert.equal(doc.viewport, null);
    assert.equal(doc.lang, null);
    assert.equal(doc.title, '');
    assert.equal(doc.text, 'bare');
  });

  intent('FR-PAGE-1', 'entities in the body text are decoded before matching', () => {
    const doc = inspectHtmlDocument('<body><h1>Hello,&nbsp;world!</h1></body>');
    assert.deepEqual(doc.headings, ['Hello, world!']);
    assert.ok(doc.text.includes('Hello, world!'));
  });

  intent('FR-PAGE-1', 'headings at every level are collected', () => {
    const doc = inspectHtmlDocument('<body><h1>a</h1><h3>b</h3></body>');
    assert.deepEqual(doc.headings, ['a', 'b']);
  });

  intent('FR-PAGE-2', 'a document with no body falls back to the whole source', () => {
    const doc = inspectHtmlDocument('<p>no body tag</p>');
    assert.equal(doc.text, 'no body tag');
  });
});

describe('inspecting a deploy workflow', () => {
  intent('M0', 'a workflow with no jobs reports empty facts instead of crashing', () => {
    const workflow = inspectDeployWorkflow('name: empty');
    assert.deepEqual(workflow.actionRefs, []);
    assert.deepEqual(workflow.publishPaths, []);
    assert.deepEqual(workflow.pushBranches, []);
    assert.equal(workflow.hasWorkflowDispatch, false);
    assert.deepEqual(workflow.permissions, {});
    assert.equal(workflow.environmentName, null);
    assert.equal(workflow.environmentUrl, null);
    assert.equal(workflow.usesAction('actions/deploy-pages'), false);
  });

  intent('M0', 'a second publish directory would be reported', () => {
    const workflow = inspectDeployWorkflow(
      [
        'jobs:',
        '  deploy:',
        '    steps:',
        '      - uses: actions/upload-pages-artifact@v3',
        '        with:',
        '          path: site',
        '      - uses: actions/upload-pages-artifact@v3',
        '        with:',
        '          path: public',
      ].join('\n'),
    );
    assert.deepEqual(workflow.publishPaths, ['site', 'public']);
  });

  intent('M0', 'a step with no run-time action is ignored when collecting refs', () => {
    const workflow = inspectDeployWorkflow(
      ['jobs:', '  deploy:', '    steps:', '      - run: echo hi'].join('\n'),
    );
    assert.deepEqual(workflow.actionRefs, []);
  });
});
