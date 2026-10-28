'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const puppeteer = require('puppeteer-core');
const sparticuz = require('@sparticuz/chromium').default;

// The package does not export `./package.json`, so locate it via its entry point.
const BUNDLE = path.resolve(path.dirname(require.resolve('@sparticuz/chromium')), '..');

function unpackBundledTarball(archive, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const tarball = path.join(destination, path.basename(archive, '.br'));
  fs.writeFileSync(
    tarball,
    zlib.brotliDecompressSync(fs.readFileSync(path.join(BUNDLE, 'bin', archive))),
  );
  execFileSync('tar', ['-xf', tarball, '-C', destination]);
}

/**
 * The bundled Chromium is linked against NSS/NSPR, which this image does not
 * ship. The same npm package carries those libraries as a brotli'd tarball, so
 * unpack them once and point the loader at them.
 */
function ensureSharedLibraries() {
  const libDir = path.join(os.tmpdir(), 'launch-checks-lib');
  const lib = path.join(libDir, 'lib');

  if (!fs.existsSync(path.join(lib, 'libnspr4.so'))) {
    unpackBundledTarball('al2023.tar.br', libDir);
  }

  const existing = process.env.LD_LIBRARY_PATH;
  process.env.LD_LIBRARY_PATH = existing ? `${lib}:${existing}` : lib;
}

/**
 * This image has no system fonts and no fontconfig. A Chromium with no font to
 * fall back on lays text out with zero height — every legibility and
 * horizontal-scrolling measurement taken against it would be meaningless, and
 * would silently *pass* the no-scrolling check. So install the fonts the
 * package ships and make the browser use them. `assertTextIsRendered` is the
 * guard that this actually worked.
 */
function ensureFonts() {
  const fontDir = path.join(os.tmpdir(), 'launch-checks-fonts');

  if (!fs.existsSync(path.join(fontDir, 'fonts.conf'))) {
    unpackBundledTarball('fonts.tar.br', fontDir);
    fs.writeFileSync(
      path.join(fontDir, 'fonts.conf'),
      [
        '<?xml version="1.0"?>',
        '<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">',
        '<fontconfig>',
        `  <dir>${path.join(fontDir, 'fonts')}</dir>`,
        `  <cachedir>${path.join(fontDir, 'cache')}</cachedir>`,
        '  <match target="pattern">',
        '    <test qual="any" name="family"><string>sans-serif</string></test>',
        '    <edit name="family" mode="assign" binding="same"><string>Open Sans</string></edit>',
        '  </match>',
        '</fontconfig>',
        '',
      ].join('\n'),
    );
  }

  process.env.FONTCONFIG_PATH = fontDir;
}

/**
 * This machine exports `http_proxy` with only `localhost,127.0.0.1` exempt, so
 * a Chromium launched here sends anything addressed to a non-loopback host to
 * the egress proxy, which answers with its own "Access Denied" page. That
 * substituted document would be measured instead of the site. Extending
 * `no_proxy` for the host under test makes the browser connect straight to it,
 * the way a second device on the same network does, and leaves every other
 * destination proxied as before.
 */
function envWithDirectHosts(directHosts) {
  if (!directHosts.length) return process.env;

  const extend = (value) => [value, ...directHosts].filter(Boolean).join(',');

  return {
    ...process.env,
    no_proxy: extend(process.env.no_proxy),
    NO_PROXY: extend(process.env.NO_PROXY),
  };
}

/**
 * Launches a real Chromium. Every launch gets a throwaway profile directory so
 * that no state (cache, storage, extensions) carries between checks — an
 * independent re-check has to start from the same blank slate a first-time
 * visitor does.
 */
async function launchBrowser({ directHosts = [] } = {}) {
  ensureSharedLibraries();
  ensureFonts();

  const executablePath = await sparticuz.executablePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'launch-profile-'));

  const browser = await puppeteer.launch({
    executablePath,
    userDataDir,
    headless: 'shell',
    args: [...sparticuz.args, '--no-sandbox', '--disable-gpu'],
    env: envWithDirectHosts(directHosts),
  });

  const version = await browser.version();
  const close = browser.close.bind(browser);
  browser.close = async () => {
    await close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  };

  return { browser, version, userDataDir };
}

module.exports = { launchBrowser };
