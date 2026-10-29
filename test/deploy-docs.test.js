import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_SOURCE_PHRASES,
  read,
  readCanonicalRecord,
} from './helpers/docs.js';

const README = 'README.md';
const HOSTING = 'melvo-app-configuration/docs/hosting.md';
const WORKFLOW = '.github/workflows/deploy-pages.yml';

describe('FR-DEPLOY-2 — one documented deploy mechanism', () => {
  it('README names GitHub Actions as the Pages source', () => {
    const readme = read(README);
    expect(readme).toMatch(/source\s*(=|:)\s*\*{0,2}GitHub Actions/i);
  });

  it('README does not describe a second Pages source', () => {
    const readme = read(README);
    for (const phrase of FORBIDDEN_SOURCE_PHRASES) {
      expect(readme).not.toMatch(phrase);
    }
  });

  it('hosting.md does not describe a second Pages source or root publishing', () => {
    const hosting = read(HOSTING);
    for (const phrase of FORBIDDEN_SOURCE_PHRASES) {
      expect(hosting).not.toMatch(phrase);
    }
  });

  it('hosting.md names the same mechanism and publish directory as the README', () => {
    const hosting = read(HOSTING);
    expect(hosting).toMatch(/source\s*(=|:)\s*\*{0,2}GitHub Actions/i);
    expect(hosting).toContain('`site/`');
    expect(read(README)).toContain('`site/`');
  });

  it('the committed workflow is the mechanism the documents describe', () => {
    const workflow = read(WORKFLOW);
    expect(workflow).toMatch(/actions\/deploy-pages/);
    expect(workflow).toMatch(/pages:\s*write/);
    expect(workflow).toMatch(/id-token:\s*write/);
    expect(workflow).toMatch(/path:\s*site\b/);
  });
});

describe('G5 — the canonical URL is recorded with its provenance', () => {
  it('README records a canonical URL row and an "Observed from" row', () => {
    const record = readCanonicalRecord(read(README));
    expect(record.hasUrlRow).toBe(true);
    expect(record.hasProvenanceRow).toBe(true);
  });

  it('README never records a URL without the run it was observed from', () => {
    const { url, provenance } = readCanonicalRecord(read(README));
    expect(url === null).toBe(provenance === null);
    if (url !== null) {
      expect(url).toMatch(/^https:\/\//);
      expect(provenance).toMatch(
        /^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+/,
      );
    }
  });

  it('hosting.md records the same canonical URL and provenance as the README', () => {
    const readme = readCanonicalRecord(read(README));
    const hosting = readCanonicalRecord(read(HOSTING));
    expect(hosting.hasUrlRow).toBe(true);
    expect(hosting.hasProvenanceRow).toBe(true);
    expect(hosting.url).toBe(readme.url);
    expect(hosting.provenance).toBe(readme.provenance);
  });
});

describe('FR-DEPLOY-2 — the deploy step is followable from a clean checkout', () => {
  it('README points at the workflow file that performs the deploy', () => {
    expect(read(README)).toContain(WORKFLOW);
  });

  it('README states where the Pages source is set and how the deploy is started', () => {
    const readme = read(README);
    expect(readme).toMatch(/Settings\s*[→>-]+\s*Pages/i);
    expect(readme).toMatch(/push to `main`/i);
    expect(readme).toMatch(/Run workflow/i);
  });
});

describe('RFC-1 §9 — the two-case runbook', () => {
  it('README documents the 404-at-root case with both causes', () => {
    const readme = read(README);
    expect(readme).toMatch(/404 at `\/`/);
    expect(readme).toMatch(/publish directory/i);
    expect(readme).toMatch(/root-document mapping/i);
  });

  it('README documents the TLS-warning case', () => {
    const readme = read(README);
    expect(readme).toMatch(/TLS warning/i);
    expect(readme).toMatch(/certificate (has )?not (yet )?been provisioned|certificate not yet provisioned/i);
  });

  it('hosting.md carries the same two runbook cases', () => {
    const hosting = read(HOSTING);
    expect(hosting).toMatch(/404 at `\/`/);
    expect(hosting).toMatch(/TLS warning/i);
  });
});
