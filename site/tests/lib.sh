# Minimal POSIX-shell assertion helpers for the site test suite.
# Sourced by run-tests.sh in the same shell so the counters accumulate.

tests_passed=0
tests_failed=0
current_intent_id=''
current_intent_title=''

intent() {
  current_intent_id=$1
  current_intent_title=$2
}

_pass() {
  tests_passed=$((tests_passed + 1))
  printf 'PASS  %s  %s\n' "$current_intent_id" "$current_intent_title"
}

_fail() {
  tests_failed=$((tests_failed + 1))
  printf 'FAIL  %s  %s\n        %s\n' "$current_intent_id" "$current_intent_title" "$1"
}

# assert_empty <actual> <message>
assert_empty() {
  if [ -z "$1" ]; then _pass; else _fail "$2: $1"; fi
}

# assert_file <path>
assert_file() {
  if [ -f "$1" ]; then _pass; else _fail "expected file to exist: $1"; fi
}

# assert_executable <path>
assert_executable() {
  if [ -x "$1" ]; then _pass; else _fail "expected executable file: $1"; fi
}

# assert_absent <path>
assert_absent() {
  if [ ! -e "$1" ]; then _pass; else _fail "expected path to be absent: $1"; fi
}

# assert_status <expected> <actual> <message>
assert_status() {
  if [ "$1" = "$2" ]; then _pass; else _fail "$3 (expected exit $1, got $2)"; fi
}
