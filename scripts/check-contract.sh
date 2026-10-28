#!/bin/sh
# RFC-1 §10 contract check over index.html.
#
# Asserts the invariants the page cannot regress on:
#   - a doctype declaration
#   - <meta charset="utf-8">
#   - a non-empty <title>
#   - the literal "Hello, world!" in the body
#   - zero <script>, <link>, <img> or <iframe> tags
#
# POSIX shell + grep only: no toolchain, no manifest, no build step (ADR-001).
# This is a repo check, not an application build step.
#
# Usage: sh scripts/check-contract.sh [path-to-html]   (default: index.html)

set -u

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
page=${1:-$repo_root/index.html}

failures=0

report_ok() {
	printf '  ok   %s\n' "$1"
}

report_fail() {
	printf '  FAIL %s\n' "$1"
	failures=$((failures + 1))
}

# assert <description> <pattern-matches: 0|1> — turn a grep result into a report.
assert() {
	if [ "$2" -eq 0 ]; then
		report_ok "$1"
	else
		report_fail "$1"
	fi
}

printf 'contract check: %s\n' "$page"

if [ ! -f "$page" ]; then
	printf '  FAIL page not found: %s\n' "$page"
	exit 1
fi

# Collapse the document onto one line so the element checks are not sensitive to
# where the author chose to wrap. `tr` is used rather than a parser on purpose.
flat=$(tr '\n\r\t' '   ' <"$page")

# Everything between <body ...> and </body>; empty when either is absent.
body=$(printf '%s' "$flat" | sed -n 's|.*<[Bb][Oo][Dd][Yy][^>]*>\(.*\)</[Bb][Oo][Dd][Yy]>.*|\1|p')

# --- doctype -----------------------------------------------------------------

printf '%s' "$flat" | grep -qiE '^[[:space:]]*<!doctype[[:space:]]+html[[:space:]]*>'
assert 'doctype declaration present' $?

# --- charset -----------------------------------------------------------------

printf '%s' "$flat" |
	grep -qiE '<meta[[:space:]]+charset[[:space:]]*=[[:space:]]*"?'"'"'?utf-8"?'"'"'?[[:space:]]*/?>'
assert 'meta charset="utf-8" present' $?

# --- title -------------------------------------------------------------------

printf '%s' "$flat" | grep -qiE '<title>[[:space:]]*[^[:space:]<][^<]*</title>'
assert 'non-empty <title> present' $?

# --- greeting ----------------------------------------------------------------

printf '%s' "$body" | grep -qF 'Hello, world!'
assert 'body contains the literal "Hello, world!"' $?

# --- forbidden tags ----------------------------------------------------------
# A trailing [[:space:]/>] keeps <linkedin-widget>-style names from matching.

for tag in script link img iframe; do
	if printf '%s' "$flat" | grep -qiE "<$tag([[:space:]]|/|>)"; then
		report_fail "zero <$tag> tags (found at least one)"
	else
		report_ok "zero <$tag> tags"
	fi
done

# --- verdict -----------------------------------------------------------------

if [ "$failures" -ne 0 ]; then
	printf '\n%s contract check(s) failed for %s\n' "$failures" "$page"
	exit 1
fi

printf '\ncontract check passed for %s\n' "$page"
