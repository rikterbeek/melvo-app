import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { capabilities } from '../src/content/capabilities';
import { renderRoute } from './renderRoute';

describe('AC-3 Features page', () => {
  it('AC-3: lists the product capabilities when a visitor opens the Features route', () => {
    renderRoute('/features');

    const list = screen.getByRole('list', { name: /features/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(capabilities.length);
  });

  it('AC-3: shows a name and a short description for every capability', () => {
    renderRoute('/features');

    const list = screen.getByRole('list', { name: /features/i });
    for (const capability of capabilities) {
      const item = within(list)
        .getByRole('heading', { name: capability.name })
        .closest('li');
      expect(item).not.toBeNull();
      expect(item).toHaveTextContent(capability.description);
    }
  });

  it('AC-3: renders the Features page inside the shared layout and navigation', () => {
    renderRoute('/features');

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Features' })).toBeInTheDocument();
  });
});

describe('capability content', () => {
  it('AC-3: every capability has a unique id, a name and a one-line description', () => {
    expect(capabilities.length).toBeGreaterThanOrEqual(4);
    expect(new Set(capabilities.map((c) => c.id)).size).toBe(capabilities.length);
    for (const capability of capabilities) {
      expect(capability.name.trim()).not.toHaveLength(0);
      expect(capability.description.trim().length).toBeGreaterThan(20);
    }
  });
});
