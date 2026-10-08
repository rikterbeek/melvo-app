import { describe, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { content } from '../src/content'
import { intent } from './intent'
import { renderSite } from './renderSite'

describe('Shared layout and routing', () => {
  intent('AC1', 'every page is reachable through the shared navigation', async () => {
    const { user } = renderSite('/')
    const nav = screen.getByRole('navigation')

    for (const item of content.nav) {
      await user.click(within(nav).getByRole('link', { name: item.label }))
      expect(screen.getByRole('heading', { level: 1 })).toBeVisible()
    }
  })

  intent('AC1', 'the brand link returns a visitor to Home', async () => {
    const { user } = renderSite('/pricing')

    await user.click(screen.getByRole('link', { name: content.siteName }))

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      content.home.headline,
    )
  })
})
