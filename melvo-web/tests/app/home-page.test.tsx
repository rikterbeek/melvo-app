import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import HomePage from '@/app/page'
import { PRIMARY_CTA_DESTINATION } from '@/config/cta'
import { PRIMARY_CTA_SOURCES } from '@/components/primary-cta-sources'
import * as analytics from '@/lib/analytics'
import { intent } from '../support/intent'

function renderHomePage(): HTMLAnchorElement[] {
  render(<HomePage />)
  return screen.getAllByTestId('primary-cta') as HTMLAnchorElement[]
}

describe('homepage primary CTAs', () => {
  let sendAnalyticsEvent: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    sendAnalyticsEvent = vi.spyOn(analytics, 'sendAnalyticsEvent').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  intent('AC4-HOME-1', 'the homepage carries a hero CTA and a repeated CTA below the fold', () => {
    const ctas = renderHomePage()

    expect(ctas.map((cta) => cta.dataset.ctaSource)).toEqual([
      PRIMARY_CTA_SOURCES.hero,
      PRIMARY_CTA_SOURCES.closing,
    ])
  })

  intent('AC4-HOME-2', 'every primary CTA points at the single configured destination', () => {
    const ctas = renderHomePage()

    expect(ctas).not.toHaveLength(0)
    for (const cta of ctas) {
      expect(cta).toHaveAttribute('href', PRIMARY_CTA_DESTINATION)
    }
  })

  intent('AC4-HOME-3', 'activating a CTA anywhere on the page records its own source section', () => {
    const ctas = renderHomePage()

    for (const cta of ctas) {
      sendAnalyticsEvent.mockClear()
      fireEvent.click(cta)

      expect(sendAnalyticsEvent).toHaveBeenCalledOnce()
      expect(sendAnalyticsEvent).toHaveBeenCalledWith({
        name: 'primary_cta_activated',
        properties: {
          source_section: cta.dataset.ctaSource,
          destination: PRIMARY_CTA_DESTINATION,
        },
      })
    }
  })

  intent('AC4-HOME-4', 'no primary CTA on the page is a dead link', () => {
    for (const cta of renderHomePage()) {
      const href = cta.getAttribute('href') ?? ''
      expect(href.trim()).not.toBe('')
      expect(href).not.toBe('#')
    }
  })

  intent('AC4-HOME-5', 'the homepage explains what the platform does before asking for the click', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(1)
  })
})
