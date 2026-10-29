#!/bin/sh
# Test runner for the static site. POSIX shell only — ADR-001 forbids a Node
# toolchain in this repository, so the tests may not depend on one either.
set -u

SITE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
REPO_ROOT=$(cd "$SITE_ROOT/.." && pwd)
export SITE_ROOT REPO_ROOT

# shellcheck source=lib.sh
. "$SITE_ROOT/tests/lib.sh"

for test_file in "$SITE_ROOT"/tests/*.test.sh; do
  printf '\n%s\n' "$(basename "$test_file")"
  # shellcheck source=/dev/null
  . "$test_file"
done

printf '\n%d passed, %d failed\n' "$tests_passed" "$tests_failed"
[ "$tests_failed" -eq 0 ]
