'use strict';

const http = require('node:http');
const https = require('node:https');

/**
 * PRD-1 §18 / RFC-1 §10 launch checklist, executed rather than inferred.
 *
 * Every check here is answered from what a real browser did with the live
 * document — the rendered layout, the console, the network panel — not from
 * grepping the markup. `scripts/check-contract.sh` can only prove that the
 * committed file asks for nothing external; only a browser can prove that
 * nothing external arrived.
 */

const DESKTOP = Object.freeze({
  name: 'desktop',
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  isMobile: false,
});

const MOBILE = Object.freeze({
  name: 'mobile',
  width: 375,
  height: 667,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

/** Below this a 375 px render stops being comfortably readable (UI-4). */
const MIN_LEGIBLE_FONT_PX = 16;

/** Scrollers are allowed this much slack for sub-pixel layout rounding. */
const SCROLL_TOLERANCE_PX = 1;

const REQUIRED_TEXT = 'Hello, world!';

function fetchRaw(url) {
  const client = url.startsWith('https:') ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks),
        }),
      );
    });
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error(`timed out fetching ${url}`)));
  });
}

/**
 * Loads `url` at one viewport and records everything the checklist asks about:
 * the console, every request the page caused, the document as the parser built
 * it, and the layout as the engine laid it out.
 */
async function observeViewport({ browser, url, viewport }) {
  const page = await browser.newPage();

  const console_ = [];
  const pageErrors = [];
  const requests = [];

  page.on('console', (message) => {
    console_.push({
      type: message.type(),
      text: message.text(),
      url: message.location()?.url ?? '',
    });
  });
  page.on('pageerror', (error) => pageErrors.push(String(error.message ?? error)));
  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
  });

  await page.setViewport({
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
    hasTouch: Boolean(viewport.hasTouch),
  });

  const response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 });

  // Give any host-injected script the chance to run and show itself.
  await new Promise((resolve) => setTimeout(resolve, 750));

  const document_ = await page.evaluate((minFont) => {
    const doctype = window.document.doctype;
    const root = window.document.documentElement;
    const body = window.document.body;
    const scroller = window.document.scrollingElement ?? root;
    const fontSizeOf = (element) =>
      element ? Number.parseFloat(window.getComputedStyle(element).fontSize) : 0;

    const textElements = [...body.querySelectorAll('*')].filter((element) =>
      [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0,
      ),
    );

    return {
      doctype: doctype
        ? { name: doctype.name, publicId: doctype.publicId, systemId: doctype.systemId }
        : null,
      characterSet: window.document.characterSet,
      title: window.document.title,
      lang: root.getAttribute('lang') ?? '',
      bodyText: body.innerText.trim(),
      elements: {
        scripts: window.document.querySelectorAll('script').length,
        iframes: window.document.querySelectorAll('iframe').length,
        images: window.document.querySelectorAll('img').length,
        externalLinks: [...window.document.querySelectorAll('link[href], img[src], script[src]')]
          .map((element) => element.getAttribute('href') ?? element.getAttribute('src'))
          .filter((value) => /^(https?:)?\/\//i.test(value ?? '')),
      },
      layout: {
        innerWidth: window.innerWidth,
        layoutWidth: root.clientWidth,
        scrollWidth: scroller.scrollWidth,
        clientWidth: scroller.clientWidth,
        visualViewportScale: window.visualViewport ? window.visualViewport.scale : null,
        devicePixelRatio: window.devicePixelRatio,
      },
      typography: {
        bodyFontPx: fontSizeOf(body),
        smallestTextFontPx: textElements.length
          ? Math.min(...textElements.map((element) => fontSizeOf(element)))
          : 0,
        minLegiblePx: minFont,
        // Proof that glyphs were actually laid out: a browser with no usable
        // font reports a zero-height box for text it cannot shape.
        textBoxHeightPx: textElements.length
          ? Math.max(...textElements.map((element) => element.getBoundingClientRect().height))
          : 0,
        renderedFontFamily: textElements.length
          ? window.getComputedStyle(textElements[0]).fontFamily
          : '',
      },
    };
  }, MIN_LEGIBLE_FONT_PX);

  await page.close();

  return {
    viewport: { ...viewport },
    response: {
      status: response.status(),
      contentType: response.headers()['content-type'] ?? '',
      remoteOrigin: new URL(response.url()).origin,
    },
    console: console_,
    pageErrors,
    requests,
    document: document_,
  };
}

function classifyRequests(requests, origin) {
  const external = requests.filter((request) => {
    if (request.url.startsWith('data:') || request.url.startsWith('about:')) return false;
    return new URL(request.url).origin !== origin;
  });

  return {
    total: requests.length,
    documents: requests.filter((request) => request.resourceType === 'document').length,
    external,
  };
}

function check(id, requirement, title, passed, evidence) {
  return { id, requirement, title, result: passed ? 'PASS' : 'FAIL', evidence };
}

/**
 * Runs CHK-1…CHK-7 against `url`. CHK-8 is the same body of checks executed a
 * second time independently, so the runner — not this function — owns it.
 */
async function runLaunchChecks({ browser, url, repoBytes }) {
  const origin = new URL(url).origin;

  const raw = await fetchRaw(url);
  const desktop = await observeViewport({ browser, url, viewport: DESKTOP });
  const mobile = await observeViewport({ browser, url, viewport: MOBILE });

  const views = [desktop, mobile];
  const checks = [];

  // CHK-1 — the document is actually served, and says the thing it must say.
  const servedText = desktop.document.bodyText;
  checks.push(
    check(
      'CHK-1',
      'FR-SITE-1',
      `GET / returns 200 text/html and the page renders "${REQUIRED_TEXT}"`,
      raw.status === 200 &&
        /text\/html/i.test(raw.headers['content-type'] ?? '') &&
        servedText.includes(REQUIRED_TEXT),
      {
        httpStatus: raw.status,
        contentType: raw.headers['content-type'] ?? '',
        renderedBodyText: servedText,
      },
    ),
  );

  // CHK-2 / CHK-3 — rendered, not reasoned about: no horizontal scrolling, text
  // at a legible size, and (mobile) a layout viewport that is not zoomed out.
  for (const [id, view] of [
    ['CHK-2', desktop],
    ['CHK-3', mobile],
  ]) {
    const { layout, typography } = view.document;
    const noHorizontalScroll = layout.scrollWidth <= layout.clientWidth + SCROLL_TOLERANCE_PX;
    const legible = typography.smallestTextFontPx >= MIN_LEGIBLE_FONT_PX;
    // A page without a width=device-width viewport is laid out at ~980 px and
    // then scaled down — the "zoomed out" failure UI-4 is about.
    const notZoomedOut = layout.layoutWidth === view.viewport.width;

    checks.push(
      check(
        id,
        'FR-CLIENT-3 / UI-4',
        `Renders legibly at ${view.viewport.width} px with no horizontal scrolling`,
        noHorizontalScroll && legible && notZoomedOut,
        {
          viewportWidth: view.viewport.width,
          layoutViewportWidth: layout.layoutWidth,
          scrollWidth: layout.scrollWidth,
          clientWidth: layout.clientWidth,
          horizontalScrollbar: !noHorizontalScroll,
          smallestTextFontPx: typography.smallestTextFontPx,
          minLegiblePx: MIN_LEGIBLE_FONT_PX,
          zoomedOut: !notZoomedOut,
          visualViewportScale: layout.visualViewportScale,
        },
      ),
    );
  }

  // CHK-4 — the console, as devtools would show it.
  const errors = views.flatMap((view) => [
    ...view.console.filter((message) => message.type === 'error'),
    ...view.pageErrors.map((text) => ({ type: 'pageerror', text, url })),
  ]);
  const warnings = views.flatMap((view) =>
    view.console.filter((message) => message.type === 'warning' || message.type === 'warn'),
  );
  // A warning counts against us only if the page caused it; browser-level
  // chatter is attributed to a source other than the document.
  const pageAuthoredWarnings = warnings.filter(
    (warning) => warning.url === '' || warning.url.startsWith(origin),
  );

  checks.push(
    check(
      'CHK-4',
      'FR-BROWSER-2',
      'Devtools console shows zero errors and zero page-authored warnings',
      errors.length === 0 && pageAuthoredWarnings.length === 0,
      {
        errors,
        pageAuthoredWarnings,
        otherWarnings: warnings.filter((warning) => !pageAuthoredWarnings.includes(warning)),
        allConsoleMessages: views.flatMap((view) => view.console),
      },
    ),
  );

  // CHK-5 — the network panel: one request, own origin.
  const traffic = views.map((view) => ({
    viewport: view.viewport.name,
    ...classifyRequests(view.requests, origin),
    requests: view.requests,
  }));

  checks.push(
    check(
      'CHK-5',
      'FR-BROWSER-3',
      'Network panel shows exactly one request, to the site’s own origin',
      traffic.every((entry) => entry.total === 1 && entry.documents === 1 && !entry.external.length),
      { origin, perViewport: traffic },
    ),
  );

  // CHK-6 — R5: nothing was injected between the repo and the browser. Three
  // independent angles: no script node exists in the DOM the browser built, no
  // byte of the response differs from the committed file, and no third-party
  // host was contacted.
  const bytesIdentical = repoBytes ? Buffer.compare(raw.body, repoBytes) === 0 : null;
  const scriptsInDom = views.reduce((total, view) => total + view.document.elements.scripts, 0);
  const externalRequests = traffic.flatMap((entry) => entry.external);

  checks.push(
    check(
      'CHK-6',
      'R5',
      'No host-injected script, analytics or third-party request in the rendered page',
      scriptsInDom === 0 &&
        externalRequests.length === 0 &&
        views.every((view) => !view.document.elements.externalLinks.length) &&
        bytesIdentical !== false,
      {
        scriptElementsInRenderedDom: scriptsInDom,
        iframesInRenderedDom: views.reduce((n, view) => n + view.document.elements.iframes, 0),
        externalUrlsInRenderedDom: views.flatMap((view) => view.document.elements.externalLinks),
        externalRequests,
        servedBytesIdenticalToRepoFile: bytesIdentical,
        servedByteLength: raw.body.length,
      },
    ),
  );

  // CHK-7 — document basics as the parser saw them, not as the source reads.
  const { doctype, characterSet, title, lang } = desktop.document;
  checks.push(
    check(
      'CHK-7',
      'FR-SITE-2',
      'Document basics as rendered: HTML5 doctype, UTF-8, non-empty title, lang',
      doctype?.name === 'html' &&
        !doctype.publicId &&
        !doctype.systemId &&
        characterSet.toUpperCase() === 'UTF-8' &&
        title.trim().length > 0 &&
        lang.trim().length > 0,
      { doctype, characterSet, title, lang },
    ),
  );

  return {
    url,
    origin,
    checks,
    passed: checks.every((entry) => entry.result === 'PASS'),
    observations: { raw: { status: raw.status, headers: raw.headers }, desktop, mobile },
  };
}

module.exports = {
  runLaunchChecks,
  observeViewport,
  DESKTOP,
  MOBILE,
  MIN_LEGIBLE_FONT_PX,
  REQUIRED_TEXT,
};
