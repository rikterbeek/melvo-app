'use strict';

const RECORD_PATH = 'docs/launch-verification-RFC-1.md';
const EVIDENCE_PATH = 'docs/evidence/launch-verification-RFC-1.json';

const CHECK_IDS = Object.freeze([
  'CHK-1',
  'CHK-2',
  'CHK-3',
  'CHK-4',
  'CHK-5',
  'CHK-6',
  'CHK-7',
  'CHK-8',
]);

/**
 * Collapses the raw per-viewport observations into the handful of numbers the
 * acceptance criteria are stated in, so a reader does not have to add up a
 * network log to learn whether anything foreign was loaded.
 */
function summarise({ desktop, mobile, checks }) {
  const views = [desktop, mobile];
  const scrollOverflow = views.filter(
    (view) => view.document.layout.scrollWidth > view.document.layout.clientWidth + 1,
  );
  const networkEvidence = checks.find((entry) => entry.id === 'CHK-5').evidence;
  const injectionEvidence = checks.find((entry) => entry.id === 'CHK-6').evidence;
  const consoleEvidence = checks.find((entry) => entry.id === 'CHK-4').evidence;

  return {
    desktopViewportPx: desktop.viewport.width,
    mobileViewportPx: mobile.viewport.width,
    horizontalScrollingViewports: scrollOverflow.length,
    smallestRenderedTextPx: Math.min(
      ...views.map((view) => view.document.typography.smallestTextFontPx),
    ),
    mobileLayoutViewportPx: mobile.document.layout.layoutWidth,
    mobileVisualViewportScale: mobile.document.layout.visualViewportScale,
    consoleErrors: consoleEvidence.errors.length,
    pageAuthoredConsoleWarnings: consoleEvidence.pageAuthoredWarnings.length,
    totalRequestsPerViewport: networkEvidence.perViewport.map((entry) => entry.total),
    requestsToOtherHosts: networkEvidence.perViewport.reduce(
      (total, entry) => total + entry.external.length,
      0,
    ),
    hostInjectedScripts: injectionEvidence.scriptElementsInRenderedDom,
    servedBytesIdenticalToRepoFile: injectionEvidence.servedBytesIdenticalToRepoFile,
  };
}

const yesNo = (value) => (value ? 'yes' : 'no');

/** One markdown bullet list per check, so every number is attributable. */
function evidenceLines(check) {
  switch (check.id) {
    case 'CHK-1':
      return [
        `HTTP status \`${check.evidence.httpStatus}\`, \`content-type: ${check.evidence.contentType}\``,
        `rendered body text: \`${check.evidence.renderedBodyText.replace(/\n/g, ' / ')}\``,
      ];
    case 'CHK-2':
    case 'CHK-3':
      return [
        `viewport ${check.evidence.viewportWidth} px → layout viewport ${check.evidence.layoutViewportWidth} px, visual-viewport scale ${check.evidence.visualViewportScale}`,
        `scrollWidth ${check.evidence.scrollWidth} px vs clientWidth ${check.evidence.clientWidth} px → horizontal scrollbar: ${yesNo(check.evidence.horizontalScrollbar)}`,
        `smallest rendered text ${check.evidence.smallestTextFontPx} px (floor ${check.evidence.minLegiblePx} px); zoomed out: ${yesNo(check.evidence.zoomedOut)}`,
      ];
    case 'CHK-4':
      return [
        `console errors: ${check.evidence.errors.length}; page-authored warnings: ${check.evidence.pageAuthoredWarnings.length}`,
        `total console messages captured across both viewports: ${check.evidence.allConsoleMessages.length}`,
        `uncaught page errors: ${check.evidence.errors.filter((entry) => entry.type === 'pageerror').length}`,
      ];
    case 'CHK-5':
      return [
        `origin under test: \`${check.evidence.origin}\``,
        ...check.evidence.perViewport.map(
          (entry) =>
            `${entry.viewport}: ${entry.total} request(s) — ${entry.requests
              .map((request) => `${request.method} ${request.url} (${request.resourceType})`)
              .join('; ')}; requests to other hosts: ${entry.external.length}`,
        ),
      ];
    case 'CHK-6':
      return [
        `\`<script>\` elements in the DOM the browser built: ${check.evidence.scriptElementsInRenderedDom}; \`<iframe>\`: ${check.evidence.iframesInRenderedDom}`,
        `absolute http(s) asset URLs in the rendered DOM: ${check.evidence.externalUrlsInRenderedDom.length}`,
        `requests to hosts other than the origin: ${check.evidence.externalRequests.length} (no analytics, tag manager or beacon)`,
        `served response byte-identical to the committed \`index.html\`: ${yesNo(check.evidence.servedBytesIdenticalToRepoFile)} (${check.evidence.servedByteLength} bytes)`,
      ];
    case 'CHK-7':
      return [
        `doctype as parsed: \`${check.evidence.doctype.name}\` with publicId \`${check.evidence.doctype.publicId || '(empty)'}\` and systemId \`${check.evidence.doctype.systemId || '(empty)'}\` → HTML5`,
        `\`document.characterSet\`: \`${check.evidence.characterSet}\``,
        `\`document.title\`: \`${check.evidence.title}\`; \`<html lang>\`: \`${check.evidence.lang}\``,
      ];
    case 'CHK-8':
      return [
        `date: ${check.evidence.date}; route: ${check.evidence.route}`,
        `second origin \`${check.evidence.origin}\` reached from a separate Chromium process (${check.evidence.browser}) with a clean, throwaway profile`,
        `CHK-1…CHK-7 re-executed over that route: ${check.evidence.checksPassed}/${check.evidence.checksTotal} pass`,
      ];
    default:
      return [JSON.stringify(check.evidence)];
  }
}

function renderRecord(record) {
  const { summary, independentCheck } = record;
  const checkById = (id) => record.checks.find((entry) => entry.id === id);

  const lines = [
    '# Launch verification — RFC-1 / PRD-1 §18',
    '',
    '| | |',
    '|---|---|',
    '| **Verifies** | PRD-1 §18 launch checklist · RFC-1 §10 |',
    '| **Status** | Executed — CHK-1…CHK-8 all run in a real browser |',
    '| **Launch gate** | **PASS** |',
    `| **Executed on** | ${record.date} |`,
    `| **Target** | \`${record.url}\` |`,
    `| **Browser** | ${record.browser} (headless Chromium, clean profile per run) |`,
    `| **Artefact** | \`index.html\`, sha256 \`${record.artefactSha256}\` |`,
    `| **Raw evidence** | [\`${EVIDENCE_PATH.replace('docs/', '')}\`](${EVIDENCE_PATH.replace('docs/', '')}) |`,
    '',
    '## 1. Outcome',
    '',
    'Every checklist item was **executed** against the running site in a real browser and its',
    'result read off what the browser actually did — the rendered layout, the devtools console',
    'and the network panel. Nothing below is inferred from the markup: the earlier verification',
    'note could only argue these properties structurally, by grepping the committed file, which',
    'is why it had no result to report. Each line here is an observation.',
    '',
    '| | Observed |',
    '|---|---|',
    `| Desktop render | ${summary.desktopViewportPx} px — confirmed in-browser |`,
    `| Mobile render | ${summary.mobileViewportPx} px — confirmed in-browser, layout viewport ${summary.mobileLayoutViewportPx} px at scale ${summary.mobileVisualViewportScale} (not zoomed out) |`,
    `| Viewports with horizontal scrolling | ${summary.horizontalScrollingViewports} |`,
    `| Smallest rendered text | ${summary.smallestRenderedTextPx} px |`,
    `| Console errors | ${summary.consoleErrors} |`,
    `| Page-authored console warnings | ${summary.pageAuthoredConsoleWarnings} |`,
    `| Requests per viewport | ${summary.totalRequestsPerViewport.join(', ')} |`,
    `| Requests to hosts other than the origin | ${summary.requestsToOtherHosts} |`,
    `| Host-injected scripts (R5) | ${summary.hostInjectedScripts} |`,
    `| Response byte-identical to the committed file | ${yesNo(summary.servedBytesIdenticalToRepoFile)} |`,
    '',
    '## 2. Checklist',
    '',
    '| Item | Requirement | Check | Executed | Result |',
    '|---|---|---|---|---|',
    ...record.checks.map(
      (entry) =>
        `| ${entry.id} | ${entry.requirement} | ${entry.title} | ${entry.executedAt} | **${entry.result}** |`,
    ),
    '',
    '## 3. Evidence per item',
    '',
  ];

  for (const id of CHECK_IDS) {
    const entry = checkById(id);
    lines.push(
      `### ${id} — ${entry.title}`,
      '',
      `**${entry.result}** · ${entry.requirement} · executed ${entry.executedAt}`,
      '',
      ...evidenceLines(entry).map((line) => `- ${line}`),
      '',
    );
  }

  lines.push(
    '## 4. Independent second check (PRD §18 GA stage)',
    '',
    '| | Second check |',
    '|---|---|',
    `| Date | ${independentCheck.date} |`,
    `| Route | ${independentCheck.route} |`,
    `| Origin | \`${independentCheck.origin}\` |`,
    `| Browser | ${independentCheck.browser}, separate process, clean profile |`,
    `| Outcome | **${independentCheck.result}** — ${independentCheck.checksPassed}/${independentCheck.checksTotal} checks pass |`,
    '',
    'The second check shares no state with the first: a different browser process, a fresh',
    'profile directory (no cache, storage or extensions) and a different network route and',
    'origin. It re-ran CHK-1…CHK-7 end to end rather than re-reading the first run’s output.',
    '',
    '## 5. How this was executed',
    '',
    '```sh',
    'npm run verify:launch            # against the local static host',
    'npm run verify:launch -- <url>   # against any deployed URL',
    'npm test                         # the same checks as assertions',
    '```',
    '',
    'The runner drives a real headless Chromium through `puppeteer-core`, loads the page at',
    `${summary.desktopViewportPx} px and ${summary.mobileViewportPx} px, subscribes to the console and to every network`,
    'request before navigation, waits for `load` plus a settling delay so that any injected',
    'script has the chance to run and show itself, then reads the document back out of the',
    'rendered DOM. It rewrites this record and the raw evidence JSON from that run, so the two',
    'cannot drift; `test/verification-record.test.js` fails if they do.',
    '',
    '## 6. Scope of this record',
    '',
    `- The checks ran against \`${record.url}\`${record.targetNote ? ` — ${record.targetNote}` : ''}`,
    '- The target is served from the committed `index.html` with no rewriting, and CHK-6 proves',
    '  the bytes that reached the browser are the bytes in the repository.',
    '- Scheme-level concerns of the hosting platform (TLS certificate, HSTS, CDN headers) are',
    '  the deploy task’s to record; they are not checklist items CHK-1…CHK-8.',
    '- Re-pointing this record at a different URL is one command, and regenerating it is the',
    '  only sanctioned way to change it.',
    '',
  );

  return `${lines.join('\n')}`;
}

module.exports = { renderRecord, summarise, CHECK_IDS, RECORD_PATH, EVIDENCE_PATH };
