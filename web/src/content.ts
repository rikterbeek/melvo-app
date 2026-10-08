import { routes } from './routes'

/**
 * User-facing strings live here rather than inline in components, so copy can be
 * swapped (or routed through a translation catalog) without touching markup.
 */
export const content = {
  siteName: 'Northwind Analytics',
  nav: [
    { key: 'home', label: 'Home', path: routes.home },
    { key: 'features', label: 'Features', path: routes.features },
    { key: 'pricing', label: 'Pricing', path: routes.pricing },
    { key: 'contact', label: 'Contact', path: routes.contact },
  ],
  home: {
    headline: 'Turn product usage into decisions you can defend',
    summary:
      'Northwind Analytics collects every event your product emits, stitches it into one timeline per customer, and answers questions about retention and adoption in seconds — no data team required.',
    featuresLinkLabel: 'Explore the features',
  },
  features: {
    headline: 'Features',
  },
  pricing: {
    headline: 'Pricing',
  },
  contact: {
    headline: 'Contact',
  },
} as const
