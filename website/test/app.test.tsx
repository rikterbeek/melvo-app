import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App';

describe('App', () => {
  it('mounts the route tree with the shared navigation', () => {
    render(<App />);

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument();
  });
});
