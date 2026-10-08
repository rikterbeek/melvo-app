import { NavLink, Outlet } from 'react-router-dom'
import { t } from './strings'

const links = [
  { to: '/', key: 'nav.home' },
  { to: '/about', key: 'nav.about' },
  { to: '/services', key: 'nav.services' },
  { to: '/contact', key: 'nav.contact' },
] as const

export function Layout() {
  return (
    <div className="layout">
      <header>
        <p className="site-name">{t('site.name')}</p>
        <nav aria-label={t('nav.label')}>
          <ul>
            {links.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end>
                  {t(link.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
