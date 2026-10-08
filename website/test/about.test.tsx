import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { companyStory } from '../src/content/companyStory';
import { renderRoute } from './renderRoute';

describe('AC-4 About page', () => {
  it('AC-4: shows the company story as prose when a visitor opens the About route', () => {
    const { container } = renderRoute('/about');

    const paragraphs = [...container.querySelectorAll('main p')].map((p) => p.textContent ?? '');
    for (const paragraph of companyStory.paragraphs) {
      expect(paragraphs).toContain(paragraph);
    }
  });

  it('AC-4: heads the story section so the prose is navigable', () => {
    renderRoute('/about');

    expect(screen.getByRole('heading', { name: companyStory.heading })).toBeInTheDocument();
  });

  it('AC-4: renders the About page inside the shared layout and navigation', () => {
    renderRoute('/about');

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
  });
});

describe('company story content', () => {
  it('AC-4: tells the story in several readable paragraphs', () => {
    expect(companyStory.paragraphs.length).toBeGreaterThanOrEqual(2);
    for (const paragraph of companyStory.paragraphs) {
      expect(paragraph.trim().length).toBeGreaterThan(80);
    }
  });
});
