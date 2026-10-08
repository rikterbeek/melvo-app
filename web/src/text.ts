/**
 * User-facing strings, keyed rather than inlined in components (ADR-023).
 * A later task may swap this for a real i18n catalog without touching the components.
 */
export const SITE_TEXT = {
  brand: 'Acme',
  mainNavLabel: 'Main',
  footer: '© Acme. All rights reserved.',
  notFoundTitle: 'Page not found',
  notFoundBody: 'The page you were looking for does not exist.',
  notFoundHomeLink: 'Back to Home',
} as const

/** Placeholder body copy for the four pages; real content lands in the following tasks. */
export const PAGE_PLACEHOLDER = 'Content coming soon.'
