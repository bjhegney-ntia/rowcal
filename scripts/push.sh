#!/bin/bash
# Usage: scripts/push.sh test|prod
#   test: the Sheet-bound test project, with the live test harness (test/Dev.js) included
#   prod: the standalone project that ships to the Marketplace. The harness must never be in it.
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  test) cp test/Dev.js src/Dev.js; npx clasp -P .clasp.json push --force ;;
  prod)
    rm -f src/Dev.js
    if grep -rnE "rowcalE2E|devDemo|devTrigger" src; then echo "REFUSING: test harness code found in src/"; exit 1; fi
    node test/lib.test.js
    npx clasp -P .clasp.prod.json push --force ;;
  *) echo "usage: scripts/push.sh test|prod"; exit 2 ;;
esac
