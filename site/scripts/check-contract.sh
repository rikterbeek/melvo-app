#!/bin/sh
# Contract check for the static site (ADR-001 §6, RFC-1 §1.1).
#
# Shell only: POSIX utilities, no package manifest and no JavaScript runtime.
# Usage: scripts/check-contract.sh [path-to-html-document]
set -u

site_root=$(cd "$(dirname "$0")/.." && pwd)
repo_root=$(cd "$site_root/.." && pwd)
document=${1:-$site_root/index.html}

status=0

ok() {
  printf 'ok    %s\n' "$1"
}

bad() {
  printf 'FAIL  %s\n' "$1" >&2
  status=1
}

# require <description> <extended-regex>
require() {
  if grep -qiE "$2" "$document"; then ok "$1"; else bad "$1"; fi
}

# reject <description> <extended-regex>
reject() {
  if grep -qiE "$2" "$document"; then bad "$1"; else ok "$1"; fi
}

if [ ! -f "$document" ]; then
  printf 'FAIL  document not found: %s\n' "$document" >&2
  exit 1
fi

require 'declares the HTML5 doctype'            '<!doctype html>'
require 'declares the UTF-8 charset'            '<meta[^>]+charset="?utf-8'
require 'sets a responsive viewport'            '<meta[^>]+name="viewport"'
require 'has a non-empty title'                 '<title>[^<[:space:]]'
require 'renders the text "Hello, world!"'      'Hello, world!'
reject  'carries no script element'             '<script'
reject  'references no absolute asset URL'      '(src|href)="https?://'

# ADR-001 §4: a reviewer must be able to confirm the absence of a build
# toolchain with a plain listing — no manifest, lockfile or installed deps.
toolchain=$(
  find "$repo_root" -path "$repo_root/.git" -prune -o \
    \( -name package.json \
    -o -name package-lock.json \
    -o -name npm-shrinkwrap.json \
    -o -name pnpm-lock.yaml \
    -o -name yarn.lock \
    -o -name bun.lockb \
    -o -name node_modules \) -print
)
if [ -z "$toolchain" ]; then
  ok 'repository carries no manifest, lockfile or installed dependencies'
else
  bad "repository carries a build toolchain: $(echo "$toolchain" | tr '\n' ' ')"
fi

if [ "$status" -eq 0 ]; then
  printf '\ncontract check passed for %s\n' "$document"
else
  printf '\ncontract check failed for %s\n' "$document" >&2
fi
exit "$status"
