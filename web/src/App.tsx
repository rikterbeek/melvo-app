import { Route, Routes } from 'react-router-dom'
import { Layout } from './Layout'
import { Contact } from './pages/Contact'
import { Features } from './pages/Features'
import { Home } from './pages/Home'
import { Pricing } from './pages/Pricing'
import { routes } from './routes'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path={routes.home} element={<Home />} />
        <Route path={routes.features} element={<Features />} />
        <Route path={routes.pricing} element={<Pricing />} />
        <Route path={routes.contact} element={<Contact />} />
      </Route>
    </Routes>
  )
}
