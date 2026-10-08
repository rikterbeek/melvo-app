/** The site's primary navigation, in display order. Routes are derived from this list. */
export const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/features', label: 'Features' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contact' },
] as const

export type NavItem = (typeof NAV_ITEMS)[number]

/** Class names for a navigation link; the active one carries the visual current-page marker. */
export const NAV_LINK_CLASS = 'layout__nav-link'
export const ACTIVE_NAV_CLASS = 'layout__nav-link--active'
