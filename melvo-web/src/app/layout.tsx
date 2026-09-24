import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { homeContent } from '@/content/home'
import './globals.css'

export const metadata: Metadata = {
  title: homeContent.meta.title,
  description: homeContent.meta.description,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <small>{homeContent.footer.note}</small>
        </footer>
      </body>
    </html>
  )
}
