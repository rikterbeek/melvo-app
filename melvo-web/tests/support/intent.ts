import { it } from 'vitest'

/**
 * Binds a test to the acceptance criterion / test-strategy intent it proves,
 * so a failing run names the requirement that regressed.
 */
export function intent(id: string, title: string, fn: () => void | Promise<void>): void {
  it(`${id} — ${title}`, fn)
}
