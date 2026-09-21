import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Hero } from "@/components/hero";
import { heroContent } from "@/content/hero";

/**
 * Structure and content of the hero. Geometry (what fits above the fold, how
 * many columns) is not observable in jsdom, so those acceptance criteria are
 * covered by the viewport matrix in `e2e/hero.spec.ts`.
 *
 * These tests assert against `heroContent` rather than literal strings, so the
 * product owner's final wording does not break the suite.
 */
describe("homepage hero", () => {
  it("AC1: renders the headline from the content source as the page's top-level heading", () => {
    render(<Hero />);

    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent(heroContent.headline);
  });

  it("AC1: renders the supporting sentence naming the business benefit", () => {
    render(<Hero />);

    expect(
      screen.getByText(heroContent.supportingSentence),
    ).toBeInTheDocument();
  });

  it("AC1: renders exactly one call to action, using the label and destination from the content source", () => {
    render(<Hero />);

    const hero = screen.getByTestId("hero");
    const links = within(hero).getAllByRole("link");

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(heroContent.cta.label);
    expect(links[0]).toHaveAttribute("href", heroContent.cta.href);
  });

  it("names the hero region by its headline, so assistive technology announces it", () => {
    render(<Hero />);

    const hero = screen.getByRole("region", { name: heroContent.headline });
    expect(hero).toBeInTheDocument();
  });
});

describe("hero content source", () => {
  it("is still flagged as placeholder copy awaiting the product owner's wording", () => {
    // Guards the hand-off: shipping the confirmed copy means editing
    // src/content/hero.ts and flipping copyStatus in the same change.
    expect(heroContent.copyStatus).toBe("placeholder");
  });

  it("gives the CTA a resolvable destination even while the copy is a placeholder", () => {
    expect(heroContent.cta.label.trim()).not.toBe("");
    expect(heroContent.cta.href).toMatch(/^(\/|https?:\/\/)/);
  });
});
