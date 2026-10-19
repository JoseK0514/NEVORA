# Wave A rolling merge — blocked candidate

Candidate: `0e010464aeb5f532981ac6071c48e1527e9419db`. This is a reviewable integration, not release acceptance. Confirmed combined count: **P0 1 / P1 0 / P2 0**, with inspection gaps; unknown coverage is not zero.

## Changes and custody

- Recreated from coordinator `a69dff2`, then merged the explicitly requested Wave A `c05e0c7` at `88a4e94`. Swap summary and its test merged cleanly.
- Candidate-only lint cleanup `9df0f47` captures the stable generation ref object inside the effect. Both event invalidation and cleanup still increment that same object. Lint passes without warnings.
- Synced coordinator `f691dec` at `d5aa031`, then `e7671e6` at `0e01046`. `portal-premium.css` exactly equals the newest fetched coordinator blob `ecf0761a040924f1613ce1237c6168dbba035c07`; no older branch snapshot or appended stale rules retained.
- Backend `31ec698` was attempted and remains unmerged. Its newer `1c8254a` head adds inspection evidence only; merge-tree recheck confirms the same conflicts and unchanged application inputs. Claude supplied the root-layout resolution; the separate Coverage test conflict is recorded with both sides under [conflicts](conflicts/). No side chosen for that remaining conflict.
- Inbox flag work is skipped: `INBOX_COUNT_ENDPOINT_READY` is absent.
- Earlier rehearsal records remain under `release/bootstrap/rehearsal/`, with replaced remote head `bec0ed4e64be7a4db3351973e1dc9993eeb90e8b` recorded.

## Evidence

See the five area reports, [probe.json](probe.json), [forms.json](forms.json), [typecheck.log](typecheck.log), [lint.log](lint.log), and [validation.json](validation.json), [checks-summary.json](checks-summary.json), [checks.json](checks.json) and [preview-integrity.json](preview-integrity.json). The probe measured 60 route/role/engine samples; 32 failed HTTP 500 after Availability’s compiler failure. All eight role/engine More checks and both intercepted one-POST form checks passed.

The first complete full Vitest run at `d5aa031` had 7,279 passed, 8 failed, 801 skipped and 55 pending (8,143 assertions total). Four failures were the missing hook; three were process-lifecycle assertions and one was a backfill timeout. **Latest candidate:** full suite with two workers: **7,280 passed, 7 failed, 801 skipped, 55 pending / 8,143 total**. Four failures are the missing hook and three are process-cleanup assertions in `src/test/phase-e-process.test.ts`. The earlier backfill timeout did not recur. No passing baseline or waiver is inferred for the remaining cleanup failures.

**Latest automated result: 0/64 passed, all 64 HTTP 500 after the known compile failure.** Automated browser checks use the unmodified repository `checks.mjs` at 390/100% in Chromium and WebKit with axe. The full matrix remains blocked by compilation. Error-overlay accessibility results are not attributed to the product UI. PostgreSQL 18.4 meets the preview’s 16+ requirement. Browser dependencies were installed into a task-local prefix and copied to the WebKit bundle; Playwright’s system-cache-only host validator was skipped after the actual libraries and browser launches were verified. No application code or browser assertions were bypassed.

## Ownership, controls and next gate

Engineering: Wave A/shared-kit coordinator owns the missing-hook source repair; backend/Wave A/coordinator owns the Coverage test reconciliation. Program: no other chat has verified zero exit evidence; Wave C `5f7c166` now requests exit round 4, Profile `829dfe6` requests non-exit round 4, Phase 3 requests non-exit round 4, Wave B `b33b734` now supplies exit round 3 with status open (inspection target `9f32ca6`); Desktop `2250275` supplies non-exit round 3, not zero. Governance: NO-GO / release BLOCKER until these source fixes and required checks pass. Security: only isolated fictional fixtures and loopback services were used; browser mutations were intercepted; passwords/storage state are excluded from reports. No policy exception or production authorization is requested.

Profile initial-data wiring waits for Profile and backend; dead `.settings-hub*` CSS cleanup waits for Wave C and its class-use check. Final every-page/five-area sweep, build and production-mode test gate wait for all six chats. The current package does not define `test:dev:production`; engineering must supply or identify the intended command before that final gate.

Use the reviewed [device checklist](https://github.com/JoseK0514/NEVORA/blob/a69dff2/docs/product/specs/codex-joint/DEVICE-CHECKLIST-REVIEWED.md). The cost/exposure/teardown proposal remains in `STATUS.md` under Device pass access. Device access needs Jose’s approval; no deployment, tunnel or exposure was performed.

## Preview integrity note

The strict runtime close guard reported a changed `next-env.d.ts`. Independent post-run hashing of all 1,507 captured files found unchanged source bytes and only the exact `.next/types` → `.next/dev/types` imports in the mirror, beyond the approved DB adapter. This matches the helper’s development-type derivation, but its strict guard did not pass because the starter used `pinDevTypeReferences: false`. Both owned PostgreSQL clusters stopped. See [preview-integrity.json](preview-integrity.json); no full mirror-certification claim is made.
