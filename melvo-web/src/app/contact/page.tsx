import { homeContent } from '@/content/home'
import { PRIMARY_CTA_SAFE_FALLBACK_DESTINATION } from '@/config/cta'

/**
 * The documented safe fallback destination for the primary CTA
 * (`PRIMARY_CTA_SAFE_FALLBACK_DESTINATION`). It is part of the site, so an
 * unconfigured CTA in a non-strict environment still lands somewhere real.
 */
export default function ContactPage() {
  const { contact } = homeContent

  return (
    <main className="page">
      <section className="section" id={PRIMARY_CTA_SAFE_FALLBACK_DESTINATION.slice(1)}>
        <h1>{contact.heading}</h1>
        <p className="lede">{contact.body}</p>
        <a className="primary-cta" href={`mailto:${contact.email}`}>
          {contact.email}
        </a>
      </section>
    </main>
  )
}
