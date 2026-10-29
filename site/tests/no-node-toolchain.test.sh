# ADR-001 §4/§6 — the site repository carries no Node toolchain, and the only
# remaining verification check is shell-only.

intent 'FR-ADR001-1' 'the repository contains no package.json, lockfile or node_modules'
node_artifacts=$(
  find "$REPO_ROOT" -path "$REPO_ROOT/.git" -prune -o \
    \( -name package.json \
    -o -name package-lock.json \
    -o -name npm-shrinkwrap.json \
    -o -name pnpm-lock.yaml \
    -o -name yarn.lock \
    -o -name bun.lockb \
    -o -name node_modules \) -print
)
assert_empty "$node_artifacts" 'Node manifest, lockfile or node_modules found'

intent 'FR-ADR001-2' 'the launch-verification Node CLI and its tests are absent'
launch_verification=$(
  find "$REPO_ROOT" -path "$REPO_ROOT/.git" -prune -o -name launch-verification -print
)
assert_empty "$launch_verification" 'launch-verification package still present'

intent 'FR-ADR001-3' 'the human-readable launch verification record is retained'
assert_file "$SITE_ROOT/docs/launch-verification-RFC-1.md"

intent 'FR-ADR001-4' 'the contract check is an executable shell script'
assert_executable "$SITE_ROOT/scripts/check-contract.sh"

intent 'FR-ADR001-5' 'the contract check invokes no Node tooling'
node_invocations=$(
  grep -nE '(^|[^-[:alnum:]_])(node|npm|npx|pnpm|yarn|bun)([[:space:]]|$)' \
    "$SITE_ROOT/scripts/check-contract.sh" 2>/dev/null | grep -v '^[0-9]*:#' || true
)
assert_empty "$node_invocations" 'contract check references a Node tool'

intent 'FR-ADR001-6' 'the contract check passes with node, npm and npx unavailable'
stub_bin=$(mktemp -d)
for tool in node npm npx pnpm yarn bun; do
  printf '#!/bin/sh\necho "%s must not be needed" >&2\nexit 127\n' "$tool" >"$stub_bin/$tool"
  chmod +x "$stub_bin/$tool"
done
PATH="$stub_bin:$PATH" "$SITE_ROOT/scripts/check-contract.sh" >"$stub_bin/out" 2>&1
assert_status 0 "$?" "contract check failed without Node: $(cat "$stub_bin/out")"
rm -rf "$stub_bin"

intent 'FR-ADR001-7' 'the contract check rejects a document missing "Hello, world!"'
tmp_doc=$(mktemp -d)/index.html
printf '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Goodbye</title></head><body><h1>Goodbye</h1></body></html>\n' >"$tmp_doc"
"$SITE_ROOT/scripts/check-contract.sh" "$tmp_doc" >/dev/null 2>&1
assert_status 1 "$?" 'contract check accepted a document without the required text'
rm -rf "$(dirname "$tmp_doc")"

intent 'FR-ADR001-8' 'the served document is the single index.html at the site root'
assert_file "$SITE_ROOT/index.html"
