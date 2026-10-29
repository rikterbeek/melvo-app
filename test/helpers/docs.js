import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

/**
 * Phrases that describe the Pages source we do NOT use. The repository deploys
 * through the `deploy-pages` workflow, so any mention of branch-based publishing
 * or of publishing the repository root leaves a reader with two mechanisms.
 */
export const FORBIDDEN_SOURCE_PHRASES = [
  /deploy from a branch/i,
  /\/ \(root\)/,
  /repository root/i,
];

const CANONICAL_ROW = /^\|\s*Canonical URL\s*\|\s*(.+?)\s*\|$/m;
const PROVENANCE_ROW = /^\|\s*Observed from\s*\|\s*(.+?)\s*\|$/m;
const UNOBSERVED = /^_not yet observed/;

/**
 * Reads the canonical-URL record both deploy documents carry. A cell is `null`
 * when the value has not been observed from a deploy run yet, so callers can
 * assert the URL and its provenance are always recorded together.
 */
export function readCanonicalRecord(markdown) {
  const url = CANONICAL_ROW.exec(markdown);
  const provenance = PROVENANCE_ROW.exec(markdown);
  return {
    hasUrlRow: url !== null,
    hasProvenanceRow: provenance !== null,
    url: cell(url),
    provenance: cell(provenance),
  };
}

function cell(match) {
  if (match === null) return null;
  const value = match[1].trim();
  return UNOBSERVED.test(value) ? null : value.replace(/^[`<]|[`>]$/g, '');
}
