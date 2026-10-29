import { test } from 'node:test';

/**
 * Declares a test whose title carries the requirement it proves, so a run log
 * maps one-to-one onto the acceptance criteria.
 */
export function intent(id, title, fn) {
  return test(`${id} — ${title}`, fn);
}
