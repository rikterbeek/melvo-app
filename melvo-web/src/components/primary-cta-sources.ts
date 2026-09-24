/**
 * Identifiers for the places the primary CTA is repeated, plus the name of the
 * event their activation emits.
 *
 * These live outside `primary-cta.tsx` on purpose. That file is a client
 * component (`'use client'`), and the homepage sections that render the CTA are
 * server components. A server component importing a plain value from a client
 * module gets a client-reference stub instead of the value, so the constants
 * would arrive as `undefined` and every analytics event would ship without its
 * source section. Keeping them in this directive-free module lets both sides
 * import the same value. See tests/components/cta-source-boundary.test.ts.
 */

export const PRIMARY_CTA_SOURCES = {
  hero: 'hero',
  closing: 'closing-cta',
} as const

export type PrimaryCtaSource = (typeof PRIMARY_CTA_SOURCES)[keyof typeof PRIMARY_CTA_SOURCES]

export const PRIMARY_CTA_EVENT_NAME = 'primary_cta_activated'
