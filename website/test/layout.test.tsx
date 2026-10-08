import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoute } from './renderRoute';

describe('shared layout and routing', () => {
  it('links to all four pages from the shared navigation', () => {
    renderRoute('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
      'Features',
      'About',
      'Contact',
    ]);
  });

  it.each([
    ['Features', 'Features'],
    ['About', 'About'],
    ['Contact', 'Contact'],
  ])('navigates from Home to %s', async (linkLabel, heading) => {
    renderRoute('/');

    const nav = screen.getByRole('navigation', { name: 'Main' });
    await userEvent.click(within(nav).getByRole('link', { name: linkLabel }));

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });
});
