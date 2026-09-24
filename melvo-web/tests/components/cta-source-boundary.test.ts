import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect } from 'vitest'

import { PRIMARY_CTA_SOURCES } from '@/components/primary-cta-sources'
import { intent } from '../support/intent'

/**
 * Guards the React Server Components boundary.
 *
 * The homepage sections are server components. If they import the CTA source
 * identifiers from a module carrying the `'use client'` directive, the RSC
 * graph replaces that module with a client-reference stub: the constants come
 * back `undefined`, every CTA is rendered with `source={undefined}`, and the
 * analytics event ships without the source section AC4 requires. jsdom tests
 * cannot see this — they render one flat client tree with no boundary — so the
 * rule is enforced on the source itself.
 */
const SRC = resolve(process.cwd(), 'src')

function read(relativePath: string): string {
  return readFileSync(resolve(SRC, relativePath), 'utf8')
}

function declaresUseClient(source: string): boolean {
  return /^\s*(['"])use client\1/.test(source)
}

const SERVER_SECTION_FILES = [
  'components/sections/hero-section.tsx',
  'components/sections/closing-cta-section.tsx',
]

describe('primary CTA source identifiers cross the server/client boundary', () => {
  intent('AC4-RSC-1', 'the source identifiers live in a module server components can import', () => {
    expect(declaresUseClient(read('components/primary-cta-sources.ts'))).toBe(false)
  })

  intent('AC4-RSC-2', 'the interactive CTA component is still a client component', () => {
    expect(declaresUseClient(read('components/primary-cta.tsx'))).toBe(true)
  })

  intent('AC4-RSC-3', 'no server section imports values from the client CTA module', () => {
    for (const file of SERVER_SECTION_FILES) {
      const source = read(file)

      expect(declaresUseClient(source), `${file} should stay a server component`).toBe(false)
      expect(
        source,
        `${file} must not import values from the 'use client' CTA module`,
      ).not.toMatch(/import\s*\{[^}]*PRIMARY_CTA_SOURCES[^}]*\}\s*from\s*['"]@\/components\/primary-cta['"]/)
      expect(source).toMatch(
        /import\s*\{[^}]*PRIMARY_CTA_SOURCES[^}]*\}\s*from\s*['"]@\/components\/primary-cta-sources['"]/,
      )
    }
  })

  intent('AC4-RSC-4', 'every declared source identifier is a non-empty string', () => {
    const values = Object.values(PRIMARY_CTA_SOURCES)

    expect(values.length).toBeGreaterThan(1)
    for (const value of values) {
      expect(typeof value).toBe('string')
      expect(value.trim()).not.toBe('')
    }
  })

  intent('AC4-RSC-5', 'each server section renders the CTA with a defined source prop', async () => {
    const { HeroSection } = await import('@/components/sections/hero-section')
    const { ClosingCtaSection } = await import('@/components/sections/closing-cta-section')

    for (const Section of [HeroSection, ClosingCtaSection]) {
      const tree = JSON.stringify(Section(), (_key, value: unknown) =>
        typeof value === 'function' ? '[fn]' : value,
      )

      expect(tree).not.toContain('"source":null')
      expect(tree).toMatch(/"source":"[^"]+"/)
    }
  })
})
