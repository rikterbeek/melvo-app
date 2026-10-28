#!/bin/sh
# ADR-001 §4/§6: the repository carries no package manifest, lockfile,
# build configuration or JavaScript. These cases are the guard that the
# launch-verification Node CLI removed by TASK-ejjkwsar0kp1 stays removed.
set -u

SITE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
REPO_ROOT=$(git -C "$SITE_ROOT" rev-parse --show-toplevel 2>/dev/null || echo "$SITE_ROOT")
. "$SITE_ROOT/test/lib/assert.sh"

intent 'FR-RM-1' 'the repository contains no package.json, lockfile or build configuration'
found=$(find "$REPO_ROOT" -name .git -prune -o -type f \
	\( -name 'package.json' -o -name 'package-lock.json' -o -name 'npm-shrinkwrap.json' \
	-o -name 'pnpm-lock.yaml' -o -name 'yarn.lock' -o -name 'bun.lockb' -o -name '*.lock' \
	-o -name 'tsconfig*.json' -o -name 'vite.config.*' -o -name 'webpack.config.*' \
	-o -name 'rollup.config.*' -o -name 'esbuild.config.*' -o -name 'Gruntfile.js' \
	-o -name 'gulpfile.js' \) -print)
if [ -z "$found" ]; then
	ok
else
	nok "build configuration present: $(echo "$found" | tr '\n' ' ')"
fi

intent 'FR-RM-2' 'launch-verification/src and launch-verification/test are absent'
found=$(find "$REPO_ROOT" -name .git -prune -o -type d \
	\( -path '*/launch-verification/src' -o -path '*/launch-verification/test' \
	-o -name node_modules \) -print)
if [ -z "$found" ]; then
	ok
else
	nok "CLI directories present: $(echo "$found" | tr '\n' ' ')"
fi

intent 'FR-RM-3' 'no JavaScript source file exists anywhere in the repository'
found=$(find "$REPO_ROOT" -name .git -prune -o -type f \
	\( -name '*.js' -o -name '*.mjs' -o -name '*.cjs' -o -name '*.ts' \) -print)
if [ -z "$found" ]; then
	ok
else
	nok "JavaScript present: $(echo "$found" | tr '\n' ' ')"
fi

finish
