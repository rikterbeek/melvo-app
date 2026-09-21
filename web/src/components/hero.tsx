import { heroContent } from "@/content/hero";

/**
 * Above-the-fold homepage hero: headline, supporting sentence and exactly one
 * primary call to action.
 *
 * Layout rules the acceptance criteria depend on:
 * - `min-h-svh` sizes the section to the *small* viewport height, so the hero
 *   still fits when a mobile browser shows its address bar.
 * - The section is a single flex column at every width, and nothing inside has
 *   a fixed width, so a phone gets one column and no horizontal scrolling.
 * - Type and spacing scale up from the phone size, so the compact phone layout
 *   is the default rather than a fallback.
 */
export function Hero() {
  const { headline, supportingSentence, cta } = heroContent;

  return (
    <section
      data-testid="hero"
      aria-labelledby="hero-headline"
      className="flex min-h-svh w-full flex-col items-center justify-center gap-6 px-6 py-10 text-center sm:gap-8 sm:px-8 sm:py-16"
    >
      <h1
        id="hero-headline"
        data-testid="hero-headline"
        className="max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
      >
        {headline}
      </h1>

      <p
        data-testid="hero-supporting-sentence"
        className="max-w-2xl text-base text-pretty text-zinc-600 sm:text-lg lg:text-xl dark:text-zinc-400"
      >
        {supportingSentence}
      </p>

      <a
        data-testid="hero-primary-cta"
        href={cta.href}
        className="bg-foreground text-background inline-flex h-12 items-center justify-center rounded-full px-8 text-base font-medium transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:bg-zinc-300"
      >
        {cta.label}
      </a>
    </section>
  );
}
