import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { strings } from './strings'
import { intent } from './test/intent'

function renderApp(path = '/') {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return { user }
}

describe('App shell', () => {
  it.each([
    ['/', strings['home.title']],
    ['/about', strings['about.title']],
    ['/services', strings['services.title']],
    ['/contact', strings['contact.title']],
  ])(intent('R4', 'route %s renders its page heading'), (path, heading) => {
    renderApp(path)

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it(intent('R4', 'the navigation links to all four pages on every page'), () => {
    renderApp('/contact')

    const nav = screen.getByRole('navigation', { name: strings['nav.label'] })
    const labels = [...nav.querySelectorAll('a')].map((link) => link.textContent)
    expect(labels).toEqual([
      strings['nav.home'],
      strings['nav.about'],
      strings['nav.services'],
      strings['nav.contact'],
    ])
  })

  it(intent('R1', 'a visitor can reach the contact form from the navigation'), async () => {
    const { user } = renderApp('/')

    await user.click(screen.getByRole('link', { name: strings['nav.contact'] }))
    await user.type(screen.getByLabelText(strings['contact.field.name']), 'Ada Lovelace')
    await user.type(screen.getByLabelText(strings['contact.field.email']), 'ada@example.com')
    await user.type(screen.getByLabelText(strings['contact.field.message']), 'Hello there.')
    await user.click(screen.getByRole('button', { name: strings['contact.submit'] }))

    expect(screen.getByRole('status')).toHaveTextContent(strings['contact.success.body'])
  })
})
