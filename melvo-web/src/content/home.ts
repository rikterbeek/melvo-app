/**
 * Homepage copy catalog. Components render keys from here rather than literal
 * text, so copy changes (and, later, translations) never touch markup.
 */
export const homeContent = {
  meta: {
    title: 'Melvo — ship the work, not the backlog',
    description:
      'Melvo turns a task into a reviewed, tested pull request: requirements, architecture, tests and code, handled end to end by agents your team supervises.',
  },
  hero: {
    eyebrow: 'For product and engineering teams',
    heading: 'Ship the work, not the backlog',
    body: 'Melvo takes a task from your tracker and returns a reviewed pull request — requirements, architecture, tests and code included. Your team stays in charge at every gate.',
    ctaLabel: 'Start building with Melvo',
    reassurance: 'No credit card. Connect one repository and watch the first task run.',
  },
  value: {
    heading: 'What Melvo does for your business',
    items: [
      {
        id: 'throughput',
        title: 'More delivered per sprint',
        body: 'Routine tasks — the CRUD, the wiring, the follow-up fixes — are picked up and finished while your engineers stay on the hard problems.',
      },
      {
        id: 'quality',
        title: 'Quality that survives review',
        body: 'Every change arrives test-first, with the acceptance criteria it proves, a static-analysis pass and a security review already attached.',
      },
      {
        id: 'control',
        title: 'Your standards, enforced',
        body: 'Melvo works to your repository conventions and stops at the validation gates you define. Nothing merges without a human.',
      },
    ],
  },
  how: {
    heading: 'How a task becomes a pull request',
    steps: [
      {
        id: 'describe',
        title: 'Describe the outcome',
        body: 'Point Melvo at a task. It writes the requirements and acceptance criteria back for you to confirm.',
      },
      {
        id: 'build',
        title: 'Agents build it test-first',
        body: 'Architecture, test strategy and implementation run in sequence inside a sandbox with only the access you granted.',
      },
      {
        id: 'review',
        title: 'You review and merge',
        body: 'A pull request lands with the evidence: green suite, coverage, findings and how to verify it yourself.',
      },
    ],
  },
  closing: {
    heading: 'See it on your own repository',
    body: 'Connect a repository, hand Melvo one task from your backlog, and judge it on the pull request it opens.',
    ctaLabel: 'Start building with Melvo',
  },
  footer: {
    note: 'Melvo Labs',
  },
  /** Target of the documented safe CTA fallback — it must always be a live page. */
  contact: {
    heading: 'Talk to us about Melvo',
    body: 'Tell us which repository you would hand to Melvo first and we will set up the trial with you.',
    email: 'hello@melvo.dev',
  },
} as const
