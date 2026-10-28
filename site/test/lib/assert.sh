#!/bin/sh
# Minimal POSIX assertion helpers for the site's shell test suite.
#
# Every case is announced with intent() so the suite doubles as the
# acceptance-criteria record for TASK-ejjkwsar0kp1 (remove the
# launch-verification Node CLI). No test runner, no package manifest:
# ADR-001 §4 forbids both in this repository.

: "${TEST_RESULTS:=/dev/null}"

_cases=0
_failures=0
_id=''
_title=''

# intent <id> <title> — start a case.
intent() {
	_id="$1"
	_title="$2"
	_cases=$((_cases + 1))
}

# ok — record the current case as passed.
ok() {
	printf 'PASS  %s  %s\n' "$_id" "$_title"
	printf 'pass\t%s\t%s\n' "$_id" "$_title" >>"$TEST_RESULTS"
}

# nok <reason> — record the current case as failed.
nok() {
	printf 'FAIL  %s  %s\n        %s\n' "$_id" "$_title" "$1"
	printf 'fail\t%s\t%s\n' "$_id" "$_title" >>"$TEST_RESULTS"
	_failures=$((_failures + 1))
}

# finish — print the file summary; exit status reflects the failures.
finish() {
	printf '%s: %d case(s), %d failure(s)\n' "$(basename "$0")" "$_cases" "$_failures"
	[ "$_failures" -eq 0 ]
}
