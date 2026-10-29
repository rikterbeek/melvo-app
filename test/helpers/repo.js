import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const DEFAULT_SKIP = [];

/** Repo-relative POSIX paths of every file under `dir`, sorted. */
export function listFilesRecursively(dir, { skip = DEFAULT_SKIP } = {}) {
  const walk = (current, prefix) =>
    readdirSync(current, { withFileTypes: true })
      .filter((entry) => !skip.includes(entry.name))
      .flatMap((entry) => {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        return entry.isDirectory() ? walk(join(current, entry.name), relative) : [relative];
      });

  return walk(dir, '').sort();
}

/** The single artifact path the Pages workflow uploads. */
export function publishDirFromWorkflow() {
  const workflow = readFileSync(join(repoRoot, '.github', 'workflows', 'deploy-pages.yml'), 'utf8');

  const paths = [...workflow.matchAll(/^\s*path:\s*(['"]?)([^'"\s#]+)\1\s*$/gm)].map((match) => match[2]);

  if (paths.length !== 1) {
    throw new Error(`expected exactly one upload path in deploy-pages.yml, found ${paths.length}`);
  }

  return paths[0].replace(/^\.\//, '').replace(/\/$/, '');
}
