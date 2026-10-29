/**
 * Validates the deploy-observation record committed under docs/verification/.
 *
 * The record has exactly two honest shapes:
 *
 *   status: "observed" — Pages is enabled, a deploy run succeeded, and the
 *     host-assigned URL was *read back from the host*. Every field the
 *     acceptance criteria name must be present and must say what was seen.
 *
 *   status: "blocked"  — the deploy could not be run here. The record must
 *     name the exact missing permission or capability and must NOT carry a
 *     URL, a run or any response headers. A URL inferred from the git remote
 *     is not an observation, so it is rejected rather than recorded.
 */

const RUN_URL = /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+(?:\/|$)/;

/** Phrases that mark a URL as guessed rather than read back from the host. */
const DERIVED_SOURCE = /\b(?:derive|infer|assume|guess|construct)\w*\b|git remote/i;

function checkObservedUrl(record, errors) {
  const observed = record.observedUrl;
  if (!observed || typeof observed.value !== 'string') {
    errors.push('observedUrl.value is required for an observed record');
    return;
  }
  if (!observed.value.startsWith('https://')) {
    errors.push('observedUrl.value must be an HTTPS URL');
  }
  if (typeof observed.source !== 'string' || observed.source.trim() === '') {
    errors.push('observedUrl.source must name the host response the URL was read from');
    return;
  }
  if (DERIVED_SOURCE.test(observed.source)) {
    errors.push(`observedUrl.source describes a derived URL, not an observation: "${observed.source}"`);
  }
}

function checkHttpsResponse(record, errors) {
  const response = record.httpsResponse;
  if (!response || typeof response.headers !== 'object' || response.headers === null) {
    errors.push('httpsResponse.headers is required for an observed record');
    return;
  }
  if (response.statusCode !== 200) {
    errors.push(`httpsResponse.statusCode must be 200, got ${response.statusCode}`);
  }
  const contentType = response.headers['content-type'];
  if (typeof contentType !== 'string' || !contentType.toLowerCase().startsWith('text/html')) {
    errors.push(`httpsResponse content-type must be text/html, got ${contentType}`);
  }
}

function checkHttpRedirect(record, errors) {
  const redirect = record.httpRedirect;
  if (!redirect) {
    errors.push('httpRedirect is required for an observed record (SEC-1)');
    return;
  }
  if (typeof redirect.requestUrl !== 'string' || !redirect.requestUrl.startsWith('http://')) {
    errors.push('httpRedirect.requestUrl must be the plain-HTTP form of the observed URL');
  }
  if (!(redirect.statusCode >= 300 && redirect.statusCode < 400)) {
    errors.push(`httpRedirect.statusCode must be a 3xx redirect, got ${redirect.statusCode}`);
  }
  if (typeof redirect.location !== 'string' || !redirect.location.startsWith('https://')) {
    errors.push('httpRedirect.location must point at the HTTPS URL');
  }
}

function checkObserved(record, errors) {
  if (typeof record.runUrl !== 'string' || !RUN_URL.test(record.runUrl)) {
    errors.push('runUrl must be a GitHub Actions run URL (…/actions/runs/<id>)');
  }
  checkObservedUrl(record, errors);
  checkHttpsResponse(record, errors);
  checkHttpRedirect(record, errors);
  if (record.certificate?.valid !== true) {
    errors.push('certificate.valid must be true (SEC-1)');
  }
}

function checkBlocked(record, errors) {
  const blockers = record.blockers;
  if (!Array.isArray(blockers) || blockers.length === 0) {
    errors.push('blockers must list at least one blocker for a blocked record');
  } else {
    blockers.forEach((blocker, index) => {
      if (typeof blocker?.missing !== 'string' || blocker.missing.trim() === '') {
        errors.push(`blockers[${index}].missing must name the exact missing permission or capability`);
      }
      if (typeof blocker?.evidence !== 'string' || blocker.evidence.trim() === '') {
        errors.push(`blockers[${index}].evidence must record how the blocker was observed`);
      }
    });
  }
  if (record.observedUrl !== undefined) {
    errors.push('observedUrl must be absent on a blocked record — an unobserved URL is not evidence');
  }
  if (record.runUrl !== undefined) {
    errors.push('runUrl must be absent on a blocked record — no deploy run exists');
  }
  if (record.httpsResponse !== undefined || record.httpRedirect !== undefined) {
    errors.push('response evidence must be absent on a blocked record');
  }
}

export function validateObservationRecord(record) {
  const errors = [];

  if (typeof record?.task !== 'string' || record.task.trim() === '') {
    errors.push('task is required');
  }

  if (record?.status === 'observed') {
    checkObserved(record, errors);
  } else if (record?.status === 'blocked') {
    checkBlocked(record, errors);
  } else {
    errors.push(`status must be "observed" or "blocked", got ${JSON.stringify(record?.status)}`);
  }

  return { valid: errors.length === 0, errors };
}
