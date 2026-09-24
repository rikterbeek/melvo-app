import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PrimaryCta } from '@/components/primary-cta'
import { PRIMARY_CTA_DESTINATION } from '@/config/cta'
import * as analytics from '@/lib/analytics'
import { intent } from '../support/intent'

describe('PrimaryCta', () => {
  let sendAnalyticsEvent: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    sendAnalyticsEvent = vi.spyOn(analytics, 'sendAnalyticsEvent').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  intent('AC4-CTA-1', 'the CTA is a real link pointing at the configured destination', () => {
    render(<PrimaryCta source="hero" label="Start free" />)

    const cta = screen.getByRole('link', { name: 'Start free' })
    expect(cta).toHaveAttribute('href', PRIMARY_CTA_DESTINATION)
    expect(PRIMARY_CTA_DESTINATION).toBe('https://app.melvo.test/start')
  })

  intent('AC4-CTA-2', 'activation records one analytics event naming the source section', async () => {
    const user = userEvent.setup()
    render(<PrimaryCta source="hero" label="Start free" />)

    await user.click(screen.getByRole('link', { name: 'Start free' }))

    expect(sendAnalyticsEvent).toHaveBeenCalledOnce()
    expect(sendAnalyticsEvent).toHaveBeenCalledWith({
      name: 'primary_cta_activated',
      properties: {
        source_section: 'hero',
        destination: PRIMARY_CTA_DESTINATION,
      },
    })
  })

  intent('AC4-CTA-3', 'the source section travels with the event from every call site', async () => {
    const user = userEvent.setup()
    render(<PrimaryCta source="closing-cta" label="Start free" />)

    await user.click(screen.getByRole('link', { name: 'Start free' }))

    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ properties: expect.objectContaining({ source_section: 'closing-cta' }) }),
    )
  })

  intent('AC4-CTA-4', 'keyboard activation records the event exactly once', async () => {
    const user = userEvent.setup()
    render(<PrimaryCta source="hero" label="Start free" />)

    await user.tab()
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(sendAnalyticsEvent).toHaveBeenCalledOnce()
    expect(sendAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({ properties: expect.objectContaining({ source_section: 'hero' }) }),
    )
  })

  intent('AC4-CTA-5', 'navigation is never cancelled or delayed by analytics', () => {
    render(<PrimaryCta source="hero" label="Start free" />)

    const cta = screen.getByRole('link', { name: 'Start free' })
    const cancelled = !fireEvent.click(cta)

    expect(cancelled).toBe(false)
    expect(sendAnalyticsEvent).toHaveBeenCalledOnce()
  })

  intent('AC4-CTA-6', 'a failing analytics transport still lets the visitor through', () => {
    sendAnalyticsEvent.mockImplementation(() => {
      throw new Error('analytics exploded')
    })
    render(<PrimaryCta source="hero" label="Start free" />)

    const cta = screen.getByRole('link', { name: 'Start free' })
    expect(() => fireEvent.click(cta)).not.toThrow()
    expect(cta).toHaveAttribute('href', PRIMARY_CTA_DESTINATION)
  })

  intent('AC4-CTA-7', 'an external destination is opened safely', () => {
    render(<PrimaryCta source="hero" label="Start free" />)

    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute('rel', 'noopener')
  })
})
