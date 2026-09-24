import { ClosingCtaSection } from '@/components/sections/closing-cta-section'
import { HeroSection } from '@/components/sections/hero-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { ValueSection } from '@/components/sections/value-section'

export default function HomePage() {
  return (
    <main className="page">
      <HeroSection />
      <ValueSection />
      <HowItWorksSection />
      <ClosingCtaSection />
    </main>
  )
}
