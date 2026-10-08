import { Route, Routes } from 'react-router-dom'
import Layout from './Layout'
import About from './pages/About'
import Contact from './pages/Contact'
import Features from './pages/Features'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

/** The four routes plus a catch-all, all rendered inside the shared layout. */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="features" element={<Features />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
