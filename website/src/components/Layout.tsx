import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
] as const;

export function Layout() {
  return (
    <div className="layout">
      <header>
        <a className="brand" href="/">
          Acme
        </a>
        <nav aria-label="Main">
          <ul>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <p>© Acme. All rights reserved.</p>
      </footer>
    </div>
  );
}
