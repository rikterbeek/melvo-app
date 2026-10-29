import assert from 'node:assert/strict';
import { describe } from 'node:test';

import { parseYamlSubset } from '../tools/verification/yaml-subset.js';
import { intent } from './helpers/intent.js';

describe('the YAML subset reader', () => {
  intent('M0', 'nested mappings and indented sequences are read', () => {
    const parsed = parseYamlSubset(['on:', '  push:', '    branches:', '      - main'].join('\n'));
    assert.deepEqual(parsed, { on: { push: { branches: ['main'] } } });
  });

  intent('M0', 'a key with no value reads as null, so its presence is still visible', () => {
    const parsed = parseYamlSubset(['on:', '  workflow_dispatch:', 'name: x'].join('\n'));
    assert.deepEqual(parsed, { on: { workflow_dispatch: null }, name: 'x' });
  });

  intent('M0', 'sequence items carrying a mapping are read as mappings', () => {
    const parsed = parseYamlSubset(
      ['steps:', '  - uses: a/b@v1', '    with:', '      path: "."', '  - run: echo hi'].join('\n'),
    );
    assert.deepEqual(parsed, {
      steps: [{ uses: 'a/b@v1', with: { path: '.' } }, { run: 'echo hi' }],
    });
  });

  intent('M0', 'comments and blank lines are ignored', () => {
    const parsed = parseYamlSubset(['# a comment', '', 'name: x # trailing'].join('\n'));
    assert.deepEqual(parsed, { name: 'x' });
  });

  intent('M0', 'a hash inside a quoted value is not treated as a comment', () => {
    assert.deepEqual(parseYamlSubset('name: "a # b"'), { name: 'a # b' });
  });

  intent('M0', 'a value containing a colon keeps everything after the first key', () => {
    assert.deepEqual(parseYamlSubset('url: ${{ steps.deployment.outputs.page_url }}'), {
      url: '${{ steps.deployment.outputs.page_url }}',
    });
  });

  intent('M0', 'an empty document reads as an empty mapping', () => {
    assert.deepEqual(parseYamlSubset('\n# nothing\n'), {});
  });
});
