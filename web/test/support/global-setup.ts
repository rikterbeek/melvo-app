import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

/**
 * The performance audit measures the shipped bundle, so the suite always runs
 * against a fresh production build rather than the sources.
 */
export default function setup(): void {
  execFileSync('npx', ['vite', 'build', '--logLevel', 'warn'], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
}
