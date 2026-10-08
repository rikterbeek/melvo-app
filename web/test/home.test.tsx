import { describe, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { content } from '../src/content'
import { intent } from './intent'
import { renderSite } from './renderSite'

describe('Home route', () => {
  intent('AC1', 'Home shows a headline', () => {
    renderSite('/')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      content.home.headline,
    )
  })

  intent('AC1', 'Home shows a short product summary', () => {
    renderSite('/')

    const summary = screen.getByText(content.home.summary)
    expect(summary).toBeVisible()
    expect(summary.textContent!.length).toBeGreaterThan(40)
    expect(summary.textContent!.length).toBeLessThanOrEqual(300)
  })

  intent('AC1', 'clicking the Features link navigates to the Features page', async () => {
    const { user } = renderSite('/')
    const main = screen.getByRole('main')

    await user.click(
      within(main).getByRole('link', { name: content.home.featuresLinkLabel }),
    )

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      content.features.headline,
    )
  })
})
