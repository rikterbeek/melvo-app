import { Link, NavLink, Outlet } from 'react-router-dom'
import { ACTIVE_NAV_CLASS, NAV_ITEMS, NAV_LINK_CLASS } from './navigation'
import { SITE_TEXT } from './text'

/** Header, primary navigation and footer shared by every route. */
export default function Layout() {
  return (
    <div className="layout">
      <header className="layout__header">
        <Link to="/" className="layout__brand">
          {SITE_TEXT.brand}
        </Link>
        <nav aria-label={SITE_TEXT.mainNavLabel} className="layout__nav">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    isActive ? `${NAV_LINK_CLASS} ${ACTIVE_NAV_CLASS}` : NAV_LINK_CLASS
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="layout__main">
        <Outlet />
      </main>

      <footer className="layout__footer">
        <p>{SITE_TEXT.footer}</p>
      </footer>
    </div>
  )
}
