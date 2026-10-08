import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../src/App'

/** Renders the whole site (layout + routes) at `path`, as a visitor would see it. */
export function renderSite(path = '/') {
  const user = userEvent.setup()
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
  return { ...view, user }
}
