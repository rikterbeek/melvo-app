#!/bin/sh
# Tests for scripts/check-contract.sh — the RFC-1 §10 contract check over index.html.
#
# Each test states its intent in the title. The forbidden-tag and removal cases
# mutate a copy of the real index.html, so they prove the check reacts to the
# committed page rather than to a hand-made fixture.
#
# Usage: sh tests/check-contract.test.sh

set -u

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
check="$repo_root/scripts/check-contract.sh"
page="$repo_root/index.html"
workflow="$repo_root/.github/workflows/contract-check.yml"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT INT TERM

passed=0
failed=0

pass() {
	passed=$((passed + 1))
	printf 'ok   %s\n' "$1"
}

fail() {
	failed=$((failed + 1))
	printf 'FAIL %s\n' "$1"
	if [ -n "${2-}" ]; then
		printf '       %s\n' "$2"
	fi
}

# assert_true <intent> <command...>
assert_true() {
	intent=$1
	shift
	if out=$("$@" 2>&1); then
		pass "$intent"
	else
		fail "$intent" "exit $? from: $* :: $out"
	fi
}

# assert_false <intent> <command...>
assert_false() {
	intent=$1
	shift
	if out=$("$@" 2>&1); then
		fail "$intent" "expected non-zero exit, got 0 :: $out"
	else
		pass "$intent"
	fi
}

# assert_fails_naming <intent> <needle> <file> — check rejects <file> and the
# FAIL line names <needle>, so the rejection is attributed to the right invariant
# rather than to some other check that happened to break.
assert_fails_naming() {
	intent=$1
	needle=$2
	file=$3
	if out=$(sh "$check" "$file" 2>&1); then
		fail "$intent" "expected non-zero exit, got 0 :: $out"
	elif printf '%s\n' "$out" | grep -q "FAIL.*$needle"; then
		pass "$intent"
	else
		fail "$intent" "exited non-zero but no FAIL line named '$needle' :: $out"
	fi
}

# page_with_line_removed <pattern> <dest> — copy index.html without matching lines.
page_with_line_removed() {
	grep -v "$1" "$page" >"$2"
}

# page_with_tag <tag> <dest> — copy index.html with <tag> injected into the body.
page_with_tag() {
	awk -v tag="$1" '
		{ print }
		/<body[^>]*>/ && !done { print "    " tag; done = 1 }
	' "$page" >"$2"
}

printf '# contract check\n'

# --- the artefacts exist -----------------------------------------------------

assert_true 'AC1: a check script exists' test -f "$check"
assert_true 'AC1: the check script is executable' test -x "$check"
assert_true 'AC1: a CI workflow exists' test -f "$workflow"

if [ -f "$workflow" ]; then
	assert_true 'AC1: the workflow runs on push' grep -q 'push:' "$workflow"
	assert_true 'AC1: the workflow targets the default branch' grep -q 'main' "$workflow"
	assert_true 'AC1: the workflow invokes the check script' grep -q 'scripts/check-contract.sh' "$workflow"
else
	fail 'AC1: the workflow runs on push' 'no workflow file'
	fail 'AC1: the workflow targets the default branch' 'no workflow file'
	fail 'AC1: the workflow invokes the check script' 'no workflow file'
fi

# --- it passes on the committed page ----------------------------------------

assert_true 'AC2: index.html exists at the repository root' test -f "$page"
assert_true 'AC2: the check passes on the committed index.html' sh "$check" "$page"
assert_true 'AC2: the check defaults to index.html at the repository root' sh "$check"

if [ ! -f "$page" ] || [ ! -f "$check" ]; then
	printf '\n%s passed, %s failed\n' "$passed" "$failed"
	printf 'index.html or the check script is missing; mutation tests skipped.\n'
	[ "$failed" -eq 0 ] || exit 1
	exit 0
fi

# --- AC3: forbidden tags ------------------------------------------------------

for tag in script link img iframe; do
	case $tag in
	script) markup='<script>console.log(1)</script>' ;;
	link) markup='<link rel="stylesheet" href="site.css">' ;;
	img) markup='<img src="logo.png" alt="">' ;;
	iframe) markup='<iframe src="other.html"></iframe>' ;;
	esac
	page_with_tag "$markup" "$tmp/with-$tag.html"
	assert_fails_naming "AC3: a <$tag> tag fails the check" "$tag" "$tmp/with-$tag.html"
done

# Upper-case and attribute-laden variants must not slip past the tag check.
page_with_tag '<SCRIPT SRC="x.js"></SCRIPT>' "$tmp/with-upper-script.html"
assert_fails_naming 'AC3: an upper-case <SCRIPT> tag fails the check' 'script' "$tmp/with-upper-script.html"

# --- AC4: removed invariants --------------------------------------------------

page_with_line_removed '<!DOCTYPE html>' "$tmp/no-doctype.html"
assert_fails_naming 'AC4: a removed doctype fails the check' 'doctype' "$tmp/no-doctype.html"

page_with_line_removed 'charset' "$tmp/no-charset.html"
assert_fails_naming 'AC4: a removed charset fails the check' 'charset' "$tmp/no-charset.html"

page_with_line_removed '<title>' "$tmp/no-title.html"
assert_fails_naming 'AC4: a removed title fails the check' 'title' "$tmp/no-title.html"

sed 's/Hello, world!//g' "$page" >"$tmp/no-greeting.html"
assert_fails_naming 'AC4: removed "Hello, world!" text fails the check' 'Hello, world!' "$tmp/no-greeting.html"

sed 's|<title>[^<]*</title>|<title>   </title>|' "$page" >"$tmp/blank-title.html"
assert_fails_naming 'AC4: a whitespace-only title fails the check' 'title' "$tmp/blank-title.html"

# The greeting must be in the body, not only in the <title>.
sed 's|<h1>Hello, world!</h1>|<h1>Hi</h1>|' "$page" >"$tmp/greeting-in-title-only.html"
assert_fails_naming 'AC4: a greeting only in <title> fails the check' 'Hello, world!' \
	"$tmp/greeting-in-title-only.html"

# --- operator errors ----------------------------------------------------------

assert_false 'the check fails when the page is missing' sh "$check" "$tmp/absent.html"

printf '\n%s passed, %s failed\n' "$passed" "$failed"
[ "$failed" -eq 0 ] || exit 1
