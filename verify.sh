#!/bin/sh
#
# verify.sh — on-demand verification of the hello-world page.
#
# Optional tooling for contributors. The page never needs this script to
# render: index.html stays a single self-contained file (ADR-001, RFC-1 §10).
# There is deliberately no package.json, no lockfile, no dependency and no CI
# workflow — this is POSIX sh plus grep and sed, nothing else.
#
# Usage:
#   ./verify.sh                 verify ./index.html next to this script
#   ./verify.sh path/to/x.html  verify another file
#   ./verify.sh --self-test     check that each check actually fails on a
#                               deliberately broken copy of the page
#
# Exit status: 0 when every automated check passes, 1 when any fails,
# 2 on a usage or input error.
#
# Two observations cannot be automated without adding a browser driver as a
# dependency, which ADR-001 forbids. They are printed as explicit MANUAL
# steps instead; see manual_steps() at the bottom.

set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 2
TARGET="$SCRIPT_DIR/index.html"
SELF_TEST=0

# Print the header comment block above, minus the shebang, as the help text.
usage() {
	sed -e '1,2d' -e '/^[^#]/,$d' "$0" | sed -e 's/^#//' -e 's/^ //'
}

while [ "$#" -gt 0 ]; do
	case "$1" in
	--self-test) SELF_TEST=1 ;;
	-h | --help)
		usage
		exit 0
		;;
	-*)
		printf 'verify.sh: unknown option: %s\n' "$1" >&2
		exit 2
		;;
	*) TARGET="$1" ;;
	esac
	shift
done

PASSED=0
FAILED=0

pass() {
	printf 'PASS  %s\n' "$1"
	PASSED=$((PASSED + 1))
}

fail() {
	printf 'FAIL  %s\n' "$1"
	if [ -n "$2" ]; then
		printf '%s\n' "$2" | grep -v '^[[:space:]]*$' | sed 's/^/        /'
	fi
	FAILED=$((FAILED + 1))
}

# check <name> <detail-shown-on-failure> <command...>
# The command's exit status decides the result, so any ordinary utility works.
check() {
	_name=$1
	_detail=$2
	shift 2
	if "$@"; then
		pass "$_name"
	else
		fail "$_name" "$_detail"
	fi
}

# Condition helpers, so that `check` can express negatives and comparisons.
not() { ! "$@"; }
equals() { [ "$1" = "$2" ]; }

# ---------------------------------------------------------------- inspection

[ -f "$TARGET" ] || {
	printf 'verify.sh: not a file: %s\n' "$TARGET" >&2
	exit 2
}
[ -r "$TARGET" ] || {
	printf 'verify.sh: not readable: %s\n' "$TARGET" >&2
	exit 2
}

title=$(sed -n 's|.*<title>\([^<]*\)</title>.*|\1|p' "$TARGET" | head -n 1)
heading=$(sed -n 's|.*<h1[^>]*>\([^<]*\)</h1>.*|\1|p' "$TARGET" | head -n 1)

# Anything that would make the document fetch a sub-resource: a tag that
# carries a URL, a URL-bearing attribute, or a CSS import/url() reference.
# This page has no links of its own, so any href at all is reported.
external=$(grep -noiE \
	'<(link|script|img|iframe|object|embed|audio|video|source|track|base|frame|frameset|applet|input[^>]*type="image")[[:space:]/>]|(src|srcset|poster|codebase|background|href)[[:space:]]*=|@import|url\(' \
	"$TARGET")

# Static indicators that the layout would overflow a 320 px-wide viewport:
# a fixed width wider than 320 px, unwrappable text, or a forced scrollbar.
overflow_risks=""
widths=$(grep -oiE '(^|[^-a-z])(min-width|width)[[:space:]]*:[[:space:]]*[0-9]+px' "$TARGET" | tr -d '[:space:]')
while IFS= read -r declaration; do
	[ -n "$declaration" ] || continue
	value=$(printf '%s' "$declaration" | sed 's/.*://; s/px$//')
	[ "$value" -gt 320 ] || continue
	overflow_risks="${overflow_risks}fixed ${value}px width is wider than a 320px viewport
"
done <<EOF
$widths
EOF

nowrap=$(grep -oiE 'white-space[[:space:]]*:[[:space:]]*(nowrap|pre)|overflow-x[[:space:]]*:[[:space:]]*(scroll|visible)' "$TARGET")
if [ -n "$nowrap" ]; then
	overflow_risks="${overflow_risks}${nowrap} can force horizontal scrolling
"
fi
if ! grep -qiE '<meta[^>]+name="viewport"[^>]+width=device-width' "$TARGET"; then
	overflow_risks="${overflow_risks}viewport meta tag does not set width=device-width
"
fi

# -------------------------------------------------------------------- checks

run_checks() {
	printf 'verify.sh — %s\n\n' "$TARGET"

	printf 'Document structure\n'
	check 'html5 doctype' \
		'expected a leading <!DOCTYPE html>' \
		grep -qiE '^[[:space:]]*<!DOCTYPE html>' "$TARGET"
	check 'html lang attribute' \
		'expected <html lang="en">' \
		grep -qiE '<html[^>]+lang="en"' "$TARGET"
	check 'utf-8 charset declaration' \
		'expected <meta charset="utf-8">' \
		grep -qiE '<meta[^>]+charset="utf-8"' "$TARGET"
	check 'viewport meta tag' \
		'expected <meta name="viewport" content="width=device-width, initial-scale=1">' \
		grep -qiE '<meta[^>]+name="viewport"[^>]+width=device-width' "$TARGET"
	check 'title is "Hello World"' \
		"found: '${title}'" \
		equals "$title" 'Hello World'
	check 'h1 reads "Hello, world!"' \
		"found: '${heading}'" \
		equals "$heading" 'Hello, world!'

	printf '\nSelf-containment\n'
	check 'no external reference / no document-initiated request' \
		"$external" \
		equals "$external" ''

	printf '\nSmall-viewport layout\n'
	check 'no horizontal scroll at 320px (static indicators)' \
		"$overflow_risks" \
		equals "$overflow_risks" ''

	manual_steps
	summarise
}

manual_steps() {
	cat <<'EOF'

Manual steps (cannot be automated without a browser driver, which ADR-001 rules out)
MANUAL  Empty console and zero document-initiated network requests
        Open the page over file:// in a browser, open devtools, reload, and
        confirm the console reports no errors or warnings and the network
        panel lists no request made by the document itself.
MANUAL  No horizontal scroll at a 320px viewport
        In devtools device mode, set the viewport width to 320px and confirm
        the heading stays legible with no horizontal scrollbar.
EOF
}

summarise() {
	printf '\n%s passed, %s failed, 2 manual steps\n' "$PASSED" "$FAILED"
	[ "$FAILED" -eq 0 ] || return 1
}

# ----------------------------------------------------------------- self-test

# Each case mutates a copy of the page so that exactly one check should break.
# This is the script's own test suite: it proves the checks can fail, not just
# that the current page happens to pass them.
self_test() {
	tmpdir=$(mktemp -d) || exit 2
	# shellcheck disable=SC2064 # expand tmpdir now, while it is still set
	trap "rm -rf '$tmpdir'" EXIT INT TERM
	st_passed=0
	st_failed=0

	printf 'verify.sh --self-test — mutating %s\n\n' "$TARGET"

	expect_pass 'unmodified page'
	expect_fail 'doctype removed' 'html5 doctype' \
		's|<!DOCTYPE html>||'
	expect_fail 'lang attribute removed' 'html lang attribute' \
		's| lang="en"||'
	expect_fail 'charset removed' 'utf-8 charset declaration' \
		's|<meta charset="utf-8">||'
	expect_fail 'viewport meta removed' 'viewport meta tag' \
		's|<meta name="viewport"[^>]*>||'
	expect_fail 'title changed' 'title is "Hello World"' \
		's|<title>[^<]*</title>|<title>Goodbye</title>|'
	expect_fail 'heading changed' 'h1 reads "Hello, world!"' \
		's|<h1>[^<]*</h1>|<h1>Hi</h1>|'
	expect_fail 'external script added' \
		'no external reference / no document-initiated request' \
		's|</head>|<script src="app.js"></script></head>|'
	expect_fail 'external stylesheet added' \
		'no external reference / no document-initiated request' \
		's|</head>|<link rel="stylesheet" href="https://example.test/a.css"></head>|'
	expect_fail 'web font added' \
		'no external reference / no document-initiated request' \
		's|</style>|@font-face{font-family:x;src:url(x.woff2)}</style>|'
	expect_fail 'fixed wide width added' \
		'no horizontal scroll at 320px (static indicators)' \
		's|</style>|h1{width:900px}</style>|'
	expect_fail 'unwrappable text added' \
		'no horizontal scroll at 320px (static indicators)' \
		's|</style>|h1{white-space:nowrap}</style>|'

	printf '\n%s self-test cases passed, %s failed\n' "$st_passed" "$st_failed"
	[ "$st_failed" -eq 0 ] || return 1
}

st_pass() {
	printf 'PASS  self-test: %s\n' "$1"
	st_passed=$((st_passed + 1))
}

st_fail() {
	printf 'FAIL  self-test: %s\n        %s\n' "$1" "$2"
	st_failed=$((st_failed + 1))
}

expect_pass() {
	if output=$(sh "$0" "$TARGET" 2>&1); then
		st_pass "$1 — every check passes"
	else
		st_fail "$1" "expected a clean run, got:
$(printf '%s' "$output" | grep '^FAIL')"
	fi
}

# expect_fail <case> <check name that must fail> <sed mutation>
expect_fail() {
	copy="$tmpdir/index.html"
	sed "$3" "$TARGET" >"$copy" || {
		st_fail "$1" 'mutation could not be applied'
		return
	}
	if cmp -s "$copy" "$TARGET"; then
		st_fail "$1" 'mutation changed nothing; the test case is stale'
		return
	fi
	output=$(sh "$0" "$copy" 2>&1)
	if printf '%s\n' "$output" | grep -qF "FAIL  $2"; then
		st_pass "$1 — reported by '$2'"
	else
		st_fail "$1" "expected check '$2' to fail, got:
$output"
	fi
}

if [ "$SELF_TEST" -eq 1 ]; then
	self_test
else
	run_checks
fi
