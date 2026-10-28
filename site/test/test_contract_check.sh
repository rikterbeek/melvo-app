#!/bin/sh
# scripts/check-contract.sh is the repository's contract check. It must pass
# on the tree as shipped (without the removed Node CLI) and it must fail when
# the launch-verification CLI is reinstated — otherwise the removal has no
# guard. The negative cases run against a throwaway fixture tree so the
# repository itself is never polluted.
set -u

SITE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
. "$SITE_ROOT/test/lib/assert.sh"

CHECK="$SITE_ROOT/scripts/check-contract.sh"

# fixture <dir> — a minimal copy of the site that satisfies the contract.
fixture() {
	mkdir -p "$1/docs" "$1/scripts"
	cp "$SITE_ROOT/index.html" "$1/index.html"
	cp "$SITE_ROOT/docs/README.md" "$1/docs/README.md"
	cp "$SITE_ROOT/docs/launch-verification-RFC-1.md" "$1/docs/launch-verification-RFC-1.md"
	cp "$CHECK" "$1/scripts/check-contract.sh"
}

# run_check <root> — run the contract check against a tree, quietly.
run_check() {
	SCAN_ROOT="$1" sh "$CHECK" "$1" >/dev/null 2>&1
}

intent 'FR-RM-7' 'the contract check runs and passes on the tree without the CLI'
if [ ! -x "$CHECK" ]; then
	nok "$CHECK is missing or not executable"
elif output=$("$CHECK" 2>&1); then
	ok
else
	nok "contract check failed: $(echo "$output" | tr '\n' ' ')"
fi

intent 'FR-RM-8' 'the contract check rejects a reinstated launch-verification Node CLI'
if [ ! -f "$CHECK" ]; then
	nok "$CHECK is missing"
else
	tmp=$(mktemp -d)
	fixture "$tmp"
	if ! run_check "$tmp"; then
		nok 'the clean fixture already fails the contract check'
	else
		mkdir -p "$tmp/launch-verification/src" "$tmp/launch-verification/test"
		printf '{"name":"launch-verification"}\n' >"$tmp/launch-verification/package.json"
		printf 'export const run = () => 0;\n' >"$tmp/launch-verification/src/cli.js"
		printf 'test("probe", () => {});\n' >"$tmp/launch-verification/test/probe.test.js"
		if run_check "$tmp"; then
			nok 'the contract check passed with package.json, src/ and test/ present'
		else
			ok
		fi
	fi
	rm -rf "$tmp"
fi

intent 'FR-RM-9' 'the contract check rejects a tree whose verification record was dropped'
if [ ! -f "$CHECK" ]; then
	nok "$CHECK is missing"
else
	tmp=$(mktemp -d)
	fixture "$tmp"
	rm -f "$tmp/docs/launch-verification-RFC-1.md"
	if run_check "$tmp"; then
		nok 'the contract check passed without the markdown verification record'
	else
		ok
	fi
	rm -rf "$tmp"
fi

finish
