#!/bin/bash
# exit 0 if test file (and optional name pattern) passes
cd /home/user/NEVORA; out=$(timeout 600 node scripts/run-rstest.mjs run "$1" ${2:+--testNamePattern "$2"} 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
echo "$out" | grep -q '"failedTests": 0' && exit 0
echo "$out" | grep -q '"failedTests": [1-9]' && exit 1
exit 125
