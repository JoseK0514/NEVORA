#!/usr/bin/env bash
set -euo pipefail
if [[ "${DESKTOP_REVIEW_RELEASED:-}" != "1" ]]; then
  echo 'Root resource release is required before review validation.' >&2
  exit 2
fi
cd /workspace/ready-desktop
expected_review=724b430f3693bc5a9d37677ad250581e33d0f866
[[ "$(git rev-parse HEAD)" == "$expected_review" ]]
validation_out=/workspace/nevora-inspections/p4-desktop/ready-desktop/evidence
mkdir -p "$validation_out"
if [[ ! -e node_modules ]]; then ln -s /workspace/NEVORA/node_modules node_modules; fi
node node_modules/next/dist/bin/next typegen > "$validation_out/typegen.log" 2>&1
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false > "$validation_out/typecheck.log" 2>&1
node node_modules/vitest/vitest.mjs run --maxWorkers=1 src/components/manager-inbox.test.tsx src/components/app-shell.test.tsx src/components/app-shell-management-signout.test.tsx src/components/manager-action-center.test.tsx src/components/payroll-export.selection.test.tsx src/components/payroll-export-lifetime.test.tsx src/lib/navigation-sidebar.test.ts src/app/app/employees/page.test.tsx src/components/ui-preview/home-preview-shell.test.tsx > "$validation_out/affected-tests.log" 2>&1
git diff --check
git status --short > "$validation_out/post-validation-worktree.txt"
echo 'Review TypeScript and affected tests passed.'
