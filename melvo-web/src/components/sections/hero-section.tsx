import { PrimaryCta } from '@/components/primary-cta'
import { PRIMARY_CTA_SOURCES } from '@/components/primary-cta-sources'
import { homeContent } from '@/content/home'

export function HeroSection() {
  const { hero } = homeContent

  return (
    <section className="section section--hero" id="hero">
      <p className="eyebrow">{hero.eyebrow}</p>
      <h1>{hero.heading}</h1>
      <p className="lede">{hero.body}</p>
      <PrimaryCta source={PRIMARY_CTA_SOURCES.hero} label={hero.ctaLabel} />
      <p className="reassurance">{hero.reassurance}</p>
    </section>
  )
}
