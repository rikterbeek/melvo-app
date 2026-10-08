import { test } from 'vitest'

/**
 * Names a test after the requirement it proves, so a failure reports which
 * acceptance criterion regressed.
 */
export function intent(id: string, title: string, fn: () => void | Promise<void>) {
  test(`${id}: ${title}`, fn)
}
