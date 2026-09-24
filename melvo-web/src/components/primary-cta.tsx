'use client'

import type { MouseEvent } from 'react'

import {
  PRIMARY_CTA_EVENT_NAME,
  type PrimaryCtaSource,
} from '@/components/primary-cta-sources'
import { PRIMARY_CTA_DESTINATION } from '@/config/cta'
import { sendAnalyticsEvent } from '@/lib/analytics'

// Note: the source identifiers are deliberately NOT re-exported from here.
// This is a client module, so anything re-exported from it reaches server
// components as a client-reference stub rather than a value. Import them from
// '@/components/primary-cta-sources' instead.

export interface PrimaryCtaProps {
  /** Identifies the section the visitor clicked from, carried on the event. */
  readonly source: PrimaryCtaSource
  readonly label: string
  readonly className?: string
}

/**
 * The one primary CTA. A plain anchor, so keyboard, middle-click and
 * assistive-technology activation all navigate natively; analytics is emitted
 * on the way out without cancelling or delaying that navigation.
 */
export function PrimaryCta({ source, label, className }: PrimaryCtaProps) {
  function handleActivation(_event: MouseEvent<HTMLAnchorElement>): void {
    try {
      sendAnalyticsEvent({
        name: PRIMARY_CTA_EVENT_NAME,
        properties: {
          source_section: source,
          destination: PRIMARY_CTA_DESTINATION,
        },
      })
    } catch {
      // Never let instrumentation stand between the visitor and the product.
    }
  }

  return (
    <a
      className={className ? `primary-cta ${className}` : 'primary-cta'}
      data-testid="primary-cta"
      data-cta-source={source}
      href={PRIMARY_CTA_DESTINATION}
      onClick={handleActivation}
      rel="noopener"
    >
      {label}
    </a>
  )
}
