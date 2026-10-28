#!/usr/bin/env node
/**
 * Writes the generated blocks in README.md and docs/hosting.md from deploy-observation.json.
 *
 *   node scripts/sync-docs.mjs            rewrite the blocks
 *   node scripts/sync-docs.mjs --check    fail if any block is out of date (drift test)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { renderCanonicalUrl, renderRfc1T2 } from './lib/render.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const check = process.argv.includes('--check')

const observation = JSON.parse(readFileSync(`${root}deploy-observation.json`, 'utf8'))

const targets = [
  { file: 'README.md', blocks: { 'canonical-url': renderCanonicalUrl(observation) } },
  {
    file: 'docs/hosting.md',
    blocks: {
      'canonical-url': renderCanonicalUrl(observation).replaceAll('(docs/hosting.md#deploy)', '(#deploy)'),
      'rfc1-t2': renderRfc1T2(observation),
    },
  },
]

const drifted = []

for (const { file, blocks } of targets) {
  const path = `${root}${file}`
  const before = readFileSync(path, 'utf8')
  let after = before

  for (const [name, body] of Object.entries(blocks)) {
    const pattern = new RegExp(
      `(<!-- BEGIN generated:${name} -->\\n)[\\s\\S]*?(\\n<!-- END generated:${name} -->)`,
    )
    if (!pattern.test(after)) {
      console.error(`${file}: missing generated:${name} block`)
      process.exit(1)
    }
    after = after.replace(pattern, `$1${body.trim()}$2`)
  }

  if (after === before) continue
  if (check) drifted.push(file)
  else writeFileSync(path, after)
}

if (check && drifted.length > 0) {
  console.error(`Generated blocks are out of date in: ${drifted.join(', ')}\nRun: npm run docs:sync`)
  process.exit(1)
}

console.log(check ? 'Generated documentation blocks are up to date.' : 'Generated documentation blocks written.')
