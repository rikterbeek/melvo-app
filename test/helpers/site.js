import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** The single directory GitHub Pages publishes. Everything else in the repo stays unpublished. */
export const PUBLISH_DIR = 'site';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Sorted names of everything inside the publish directory. */
export function listPublishDir() {
  return readdirSync(join(repoRoot, PUBLISH_DIR)).sort();
}

/**
 * The `with.path` of the workflow's `actions/upload-pages-artifact` step — the value that decides
 * what ends up at the site URL. Returns `null` when the step or its path is absent.
 */
export function uploadArtifactPath(workflowYaml) {
  const lines = workflowYaml.split('\n');
  const stepIndex = lines.findIndex((line) => /^\s*-?\s*uses:\s*actions\/upload-pages-artifact/.test(line));
  if (stepIndex === -1) return null;

  const stepIndent = lines[stepIndex].search(/\S/);
  for (const line of lines.slice(stepIndex + 1)) {
    const indent = line.search(/\S/);
    if (indent === -1) continue;
    if (indent <= stepIndent) break;
    const path = line.match(/^\s*path:\s*(\S+)\s*$/);
    if (path) return path[1].replace(/^['"]|['"]$/g, '');
  }
  return null;
}
