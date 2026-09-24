import { PrimaryCta } from '@/components/primary-cta'
import { PRIMARY_CTA_SOURCES } from '@/components/primary-cta-sources'
import { homeContent } from '@/content/home'

/** The primary CTA repeated below the fold, for visitors who read on. */
export function ClosingCtaSection() {
  const { closing } = homeContent

  return (
    <section className="section section--closing" id="get-started">
      <h2>{closing.heading}</h2>
      <p className="lede">{closing.body}</p>
      <PrimaryCta source={PRIMARY_CTA_SOURCES.closing} label={closing.ctaLabel} />
    </section>
  )
}
