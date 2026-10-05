import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HelloPage from './page';

describe('AC1: hello world page', () => {
  it('renders the greeting "Hello World" as the page heading', () => {
    render(<HelloPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Hello World' }),
    ).toBeInTheDocument();
  });
});
