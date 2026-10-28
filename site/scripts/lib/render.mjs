/**
 * Renders the documentation blocks that state the deployed URL.
 *
 * Every document states the URL through these two functions and nothing else, so the URL
 * exists in exactly one place: `deploy-observation.json`. The functions refuse to render a
 * URL that no deploy run observed — there is deliberately no code path from the git remote
 * to a rendered URL.
 */

/** True when the record came from a real deploy run rather than being unset. */
export function isObserved(observation) {
  return observation.source === 'deploy-run' && typeof observation.canonicalUrl === 'string'
}

export function renderCanonicalUrl(observation) {
  if (!isObserved(observation)) {
    return [
      '**Canonical URL:** not yet observed.',
      '',
      'No deploy run has published this site yet, so there is no URL to record. This value is',
      '**not derived from the git remote**, on purpose: the URL a reader could work out from the',
      'remote is a guess, not a fact. Run the deploy procedure in',
      '[docs/hosting.md](docs/hosting.md#deploy), then record what the run actually served:',
      '',
      '```sh',
      'npm run record:deploy -- --url <url-from-the-deploy-run> --run-url <github-actions-run-url>',
      '```',
    ].join('\n')
  }

  return [
    `**Canonical URL:** <${observation.canonicalUrl}>`,
    '',
    `Observed deploy output, **not derived from the git remote**: on ${observation.observedAt} a`,
    `\`GET /\` against that URL returned \`${observation.httpStatus}\` and resolved to`,
    `\`${observation.finalUrl}\`, serving the \`index.html\` published by deploy run`,
    `[${runLabel(observation.runUrl)}](${observation.runUrl}). Recorded by \`npm run record:deploy\`,`,
    'which writes `deploy-observation.json` from the live response.',
  ].join('\n')
}

export function renderRfc1T2(observation) {
  if (!isObserved(observation)) {
    return [
      '**RFC-1 T2 (deployed URL) — Open.**',
      '',
      'T2 stays open until a deploy run is observed; see the canonical-URL block in the',
      '[README](../README.md) for how to close it.',
    ].join('\n')
  }

  return [
    `**RFC-1 T2 (deployed URL) — Resolved: <${observation.canonicalUrl}>**`,
    '',
    `Resolved by deploy run [${runLabel(observation.runUrl)}](${observation.runUrl}), observed`,
    `${observation.observedAt} (\`GET /\` → \`${observation.httpStatus}\`). This is the canonical URL`,
    'for PRD-1 §6.4 FR-DEPLOY-2 and §2.1 G5.',
  ].join('\n')
}

function runLabel(runUrl) {
  return `run ${runUrl.split('/').pop()}`
}
