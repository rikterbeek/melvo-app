/** User-facing text catalog. Components reference keys, never literals (ADR-023). */
export const strings = {
  'site.name': 'Melvo Labs',
  'nav.label': 'Main navigation',
  'nav.home': 'Home',
  'nav.about': 'About',
  'nav.services': 'Services',
  'nav.contact': 'Contact',

  'home.title': 'Home',
  'home.body': 'Welcome to Melvo Labs.',
  'about.title': 'About',
  'about.body': 'We build small, well-tested software.',
  'services.title': 'Services',
  'services.body': 'Design, build and review.',

  'contact.title': 'Contact',
  'contact.intro': 'Send us a message and we will get back to you.',
  'contact.field.name': 'Name',
  'contact.field.email': 'Email',
  'contact.field.message': 'Message',
  'contact.submit': 'Send message',
  'contact.success.title': 'Thank you',
  'contact.success.body': 'Your message has been sent. We will reply shortly.',
  'contact.error.name.required': 'Name is required',
  'contact.error.email.required': 'Email is required',
  'contact.error.email.invalid': 'Email must be a valid email address',
  'contact.error.message.required': 'Message is required',
} as const

export type StringKey = keyof typeof strings

export function t(key: StringKey): string {
  return strings[key]
}
