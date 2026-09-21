/**
 * Single content source for the homepage hero.
 *
 * Every string below — and the CTA destination — is a PLACEHOLDER draft. The
 * product owner still has to confirm the final wording, the CTA label and where
 * the CTA points. Replacing the values in this one file is the only change
 * needed to ship the approved copy; no component has to be touched.
 *
 * Flip `copyStatus` to `'approved'` in the same change, so the placeholder
 * state of the homepage stays visible and testable until that happens.
 */

export type CopyStatus = "placeholder" | "approved";

export interface HeroCta {
  /** Visible button text. */
  readonly label: string;
  /** Where the CTA points. Root-relative path or absolute URL. */
  readonly href: string;
}

export interface HeroContent {
  readonly copyStatus: CopyStatus;
  /** One line naming what Melvo does. */
  readonly headline: string;
  /** One sentence naming the business benefit. */
  readonly supportingSentence: string;
  /** The single primary call to action. */
  readonly cta: HeroCta;
}

export const heroContent: HeroContent = {
  copyStatus: "placeholder",
  headline: "Melvo turns your product ideas into reviewed, shippable software",
  supportingSentence:
    "A team of AI agents plans, builds and tests each change against your own standards, so you ship more of your roadmap without growing headcount.",
  cta: {
    label: "Book a demo",
    href: "/demo",
  },
};
