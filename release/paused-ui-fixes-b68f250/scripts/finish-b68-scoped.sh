#!/bin/bash
set -euo pipefail
source /workspace/nevora-inspection-runtime/final-verification/frozen.env
[[ "$VERIFY_SHA" == b68f250129e2d21731624652e0aad7412b042bc3 ]]
export BROWSER_HOLD_RELEASED=yes
cd "$VERIFY_SOURCE"
VERIFY_ONLY=phone-more-shell node /workspace/nevora-inspection-runtime/final-verification/verify.mjs > "$VERIFY_REPORT_ROOT/targeted-run.log" 2>&1
VERIFY_GUARD_PURPOSE=payroll-focused-fonts node --import /workspace/nevora-inspection-runtime/final-verification/checker-guard.mjs /workspace/nevora-inspection-runtime/final-verification/guidance-fonts.mjs > "$VERIFY_REPORT_ROOT/payroll-focused-fonts.log" 2>&1
VERIFY_GUARD_PURPOSE=timecards-503-baseline node --import /workspace/nevora-inspection-runtime/final-verification/checker-guard.mjs /workspace/nevora-inspection-runtime/final-verification/timecards-503.mjs > "$VERIFY_REPORT_ROOT/timecards-503.log" 2>&1
node /workspace/nevora-inspection-runtime/final-verification/close.mjs > "$VERIFY_REPORT_ROOT/closure.log" 2>&1
cp /workspace/nevora-inspection-runtime/final-verification/*.mjs "$VERIFY_REPORT_ROOT/scripts/"
cp /workspace/nevora-inspection-runtime/final-verification/finish-b68-scoped.sh "$VERIFY_REPORT_ROOT/scripts/"
git log --reverse --format='%h %s' 8e18a95..HEAD > "$VERIFY_REPORT_ROOT/finding-commit-ledger.txt"
git diff b9567abc26b977a517b77622a1661b16172f5b16 HEAD -- src > "$VERIFY_REPORT_ROOT/differential-source.patch"
cp /workspace/nevora-inspections/runtime-smoke.json "$VERIFY_REPORT_ROOT/runtime-smoke.json"
