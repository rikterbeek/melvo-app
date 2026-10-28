#!/bin/sh
# The plain-markdown verification record is the only launch-checklist
# artefact the repository keeps (TASK-ejjkwsar0kp1), and it has to stay
# reachable from the docs index.
set -u

SITE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
. "$SITE_ROOT/test/lib/assert.sh"

RECORD="$SITE_ROOT/docs/launch-verification-RFC-1.md"
INDEX="$SITE_ROOT/docs/README.md"

intent 'FR-RM-4' 'the markdown verification record is retained'
if [ -f "$RECORD" ]; then
	ok
else
	nok "missing $RECORD"
fi

intent 'FR-RM-5' 'the verification record is reachable from the docs index'
if [ -f "$INDEX" ] && grep -q 'launch-verification-RFC-1.md' "$INDEX"; then
	ok
else
	nok "docs index does not link launch-verification-RFC-1.md"
fi

intent 'FR-RM-6' 'the verification record is plain markdown with no Node CLI instructions'
if [ ! -f "$RECORD" ]; then
	nok "missing $RECORD"
elif grep -nEi '(npm (run|test|install|ci)\b|node (src|launch-verification)/|launch-verification/src)' "$RECORD" >/dev/null; then
	nok "record still references the removed CLI: $(grep -nEi '(npm (run|test|install|ci)\b|node (src|launch-verification)/|launch-verification/src)' "$RECORD" | head -3 | tr '\n' ' ')"
else
	ok
fi

finish
