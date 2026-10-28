import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('..', import.meta.url))
export const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
}

/** The body of a markdown section, from its heading up to the next heading of the same or higher level. */
export function section(markdown, headingText) {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => /^#{2,6} /.test(line) && line.includes(headingText))
  if (start === -1) return null
  const level = lines[start].match(/^(#+) /)[1].length
  const rest = lines.slice(start + 1)
  const endOffset = rest.findIndex((line) => {
    const match = line.match(/^(#+) /)
    return match != null && match[1].length <= level
  })
  const end = endOffset === -1 ? lines.length : start + 1 + endOffset
  return lines.slice(start, end).join('\n')
}

/** Numbered steps ("1. …") of a markdown section, each joined with its indented continuation lines. */
export function numberedSteps(markdown) {
  const steps = []
  for (const line of markdown.split('\n')) {
    if (/^\d+\. /.test(line)) steps.push(line)
    else if (steps.length > 0 && (line.startsWith('   ') || line.startsWith('\t'))) {
      steps[steps.length - 1] += `\n${line}`
    }
  }
  return steps
}
