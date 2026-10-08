import type { RouteObject } from 'react-router-dom';
import { Layout } from './components/Layout';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Features } from './pages/Features';
import { Home } from './pages/Home';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'features', element: <Features /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
    ],
  },
];
