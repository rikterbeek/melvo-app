#!/bin/sh
# Runs every test/test_*.sh and aggregates the per-case results.
# Usage: sh site/test/run-tests.sh
set -u

SITE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
TEST_RESULTS=$(mktemp)
export TEST_RESULTS

status=0
for file in "$SITE_ROOT"/test/test_*.sh; do
	printf '\n--- %s\n' "$(basename "$file")"
	sh "$file" || status=1
done

passed=$(grep -c '^pass' "$TEST_RESULTS" 2>/dev/null) || passed=0
failed=$(grep -c '^fail' "$TEST_RESULTS" 2>/dev/null) || failed=0
printf '\n=== %s case(s): %s passed, %s failed\n' "$((passed + failed))" "$passed" "$failed"
rm -f "$TEST_RESULTS"

exit "$status"
