/** Formats a test title so the requirement it proves is part of the run output (RFC-1-D §6.3). */
export function intent(id: string, title: string): string {
  return `${id}: ${title}`
}
