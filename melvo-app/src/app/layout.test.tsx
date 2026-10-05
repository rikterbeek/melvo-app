import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import RootLayout, { metadata } from './layout';

describe('root layout', () => {
  it('renders its children', () => {
    // The root layout returns <html>/<body>, which cannot nest inside the
    // default container, so render into the document element itself.
    render(
      <RootLayout params={Promise.resolve({})}>
        <span>page content</span>
      </RootLayout>,
      { container: document.documentElement },
    );

    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('exposes the app metadata title', () => {
    expect(metadata.title).toBe('melvo-app');
  });
});
