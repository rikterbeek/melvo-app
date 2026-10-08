import { NavLink, Outlet } from 'react-router-dom'
import { content } from './content'
import { routes } from './routes'

export function Layout() {
  return (
    <div className="app">
      <header className="app__header">
        <NavLink className="app__brand" to={routes.home}>
          {content.siteName}
        </NavLink>
        <nav aria-label={content.siteName}>
          <ul className="app__nav">
            {content.nav.map((item) => (
              <li key={item.key}>
                <NavLink to={item.path}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  )
}
