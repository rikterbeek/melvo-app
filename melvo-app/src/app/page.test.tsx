import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Home from './page';

describe('home page', () => {
  it('renders the starter heading and logo', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByAltText('Next.js logo')).toBeInTheDocument();
  });
});
