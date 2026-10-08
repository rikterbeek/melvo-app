import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { ACTIVE_NAV_CLASS, NAV_ITEMS } from './navigation'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('FR-R1 shared shell on every route', () => {
  it.each(NAV_ITEMS)(
    'FR-R1: renders the shared header, navigation and footer on $path',
    ({ path }) => {
      renderAt(path)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()

      const nav = screen.getByRole('navigation', { name: /main/i })
      for (const item of NAV_ITEMS) {
        expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute(
          'href',
          item.path,
        )
      }
    },
  )

  it.each(NAV_ITEMS)('FR-R1: marks $label as the active nav item on $path', ({ path, label }) => {
    renderAt(path)

    const nav = screen.getByRole('navigation', { name: /main/i })
    const active = within(nav).getByRole('link', { current: 'page' })

    expect(active).toHaveAccessibleName(label)
    expect(active).toHaveAttribute('href', path)
  })

  it.each(NAV_ITEMS)(
    'FR-R1: styles only the current nav item as active on $path',
    ({ path, label }) => {
      renderAt(path)

      const nav = screen.getByRole('navigation', { name: /main/i })
      for (const item of NAV_ITEMS) {
        const link = within(nav).getByRole('link', { name: item.label })
        if (item.label === label) {
          expect(link).toHaveClass(ACTIVE_NAV_CLASS)
        } else {
          expect(link).not.toHaveClass(ACTIVE_NAV_CLASS)
        }
      }
    },
  )

  it.each(NAV_ITEMS)('FR-R1: renders the $label page content region on $path', ({ path, label }) => {
    renderAt(path)

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument()
  })
})

describe('FR-R2 not-found page', () => {
  it('FR-R2: shows a not-found page for an unknown URL', () => {
    renderAt('/no-such-page')

    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument()
  })

  it('FR-R2: the not-found page links back to Home', () => {
    renderAt('/no-such-page')

    expect(within(screen.getByRole('main')).getByRole('link', { name: /home/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('FR-R2: keeps the shared header, navigation and footer on the not-found page', () => {
    renderAt('/no-such-page')

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main/i })).toBeInTheDocument()
  })

  it('FR-R2: marks no nav item active on the not-found page', () => {
    renderAt('/no-such-page')

    const nav = screen.getByRole('navigation', { name: /main/i })
    expect(within(nav).queryByRole('link', { current: 'page' })).not.toBeInTheDocument()
    for (const item of NAV_ITEMS) {
      expect(within(nav).getByRole('link', { name: item.label })).not.toHaveClass(ACTIVE_NAV_CLASS)
    }
  })
})
