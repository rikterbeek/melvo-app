#!/bin/sh
# Contract check for the static "Hello, world!" site (ADR-001 §6).
#
# Two jobs:
#   1. Assert the repository stays free of package manifests, lockfiles,
#      build configuration and JavaScript — the invariant that the removed
#      launch-verification Node CLI violated (ADR-001 §4).
#   2. Assert the shipped artefacts are present and well formed: index.html
#      and the plain-markdown launch verification record, linked from the
#      docs index.
#
# Usage: scripts/check-contract.sh [site-root]
#        SCAN_ROOT=<dir> scripts/check-contract.sh [site-root]
#
# Exit status 0 when every check passes, 1 otherwise. No dependencies
# beyond a POSIX shell, find and grep.
set -u

SITE_ROOT=${1:-$(cd "$(dirname "$0")/.." && pwd)}
SCAN_ROOT=${SCAN_ROOT:-$(git -C "$SITE_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$SITE_ROOT")}

failures=0

pass() { printf 'contract: ok    %s\n' "$1"; }
fail() {
	printf 'contract: FAIL  %s\n' "$1" >&2
	failures=$((failures + 1))
}

# assert_absent <label> <find-expression...> — fail if find matches anything.
assert_absent() {
	label=$1
	shift
	found=$(find "$SCAN_ROOT" -name .git -prune -o "$@" -print)
	if [ -z "$found" ]; then
		pass "$label"
	else
		fail "$label — found: $(echo "$found" | tr '\n' ' ')"
	fi
}

# assert_contains <file> <pattern> <label> — fail unless the file matches.
assert_contains() {
	if [ ! -f "$1" ]; then
		fail "$3 — missing $1"
	elif grep -qi -- "$2" "$1"; then
		pass "$3"
	else
		fail "$3 — $(basename "$1") does not match '$2'"
	fi
}

# --- ADR-001 §4: nothing to build, nothing to install ----------------------

assert_absent 'no package manifest, lockfile or build configuration' -type f \
	\( -name 'package.json' -o -name 'package-lock.json' -o -name 'npm-shrinkwrap.json' \
	-o -name 'pnpm-lock.yaml' -o -name 'yarn.lock' -o -name 'bun.lockb' -o -name '*.lock' \
	-o -name 'tsconfig*.json' -o -name 'vite.config.*' -o -name 'webpack.config.*' \
	-o -name 'rollup.config.*' -o -name 'esbuild.config.*' -o -name 'Gruntfile.js' \
	-o -name 'gulpfile.js' \)

assert_absent 'no launch-verification CLI sources and no node_modules' -type d \
	\( -path '*/launch-verification/src' -o -path '*/launch-verification/test' \
	-o -name node_modules \)

assert_absent 'no JavaScript or TypeScript source files' -type f \
	\( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ts' \)

# --- Shipped artefacts -----------------------------------------------------

INDEX_HTML="$SITE_ROOT/index.html"
RECORD="$SITE_ROOT/docs/launch-verification-RFC-1.md"
DOCS_INDEX="$SITE_ROOT/docs/README.md"

if [ -f "$INDEX_HTML" ]; then
	pass 'index.html is present'
	assert_contains "$INDEX_HTML" '<!doctype html>' 'index.html declares the HTML5 doctype'
	assert_contains "$INDEX_HTML" '<meta charset="utf-8"' 'index.html declares the UTF-8 charset'
	assert_contains "$INDEX_HTML" 'name="viewport"' 'index.html sets the responsive viewport'
	assert_contains "$INDEX_HTML" '<title>' 'index.html has a title'
	assert_contains "$INDEX_HTML" 'Hello, world!' 'index.html renders "Hello, world!"'

	if grep -qi '<script' "$INDEX_HTML"; then
		fail 'index.html contains no script tag'
	else
		pass 'index.html contains no script tag'
	fi

	if grep -qiE 'https?://' "$INDEX_HTML"; then
		fail "index.html makes no external request — found: $(grep -oiE 'https?://[^\"'\'' ]*' "$INDEX_HTML" | tr '\n' ' ')"
	else
		pass 'index.html makes no external request'
	fi
else
	fail 'index.html is present'
fi

if [ -f "$RECORD" ]; then
	pass 'the markdown launch verification record is retained'
else
	fail 'the markdown launch verification record is retained'
fi

assert_contains "$DOCS_INDEX" 'launch-verification-RFC-1.md' \
	'the docs index links the launch verification record'

# --- Result ----------------------------------------------------------------

if [ "$failures" -eq 0 ]; then
	printf 'contract: all checks passed\n'
	exit 0
fi

printf 'contract: %d check(s) failed\n' "$failures" >&2
exit 1
