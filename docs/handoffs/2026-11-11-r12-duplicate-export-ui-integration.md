# R12 duplicate-export UI and Phase D integration

Baseline: `8ee99de2f1569444c12eb3da6f6d922f2b9f79b7`, selected from the clean
integration checkout. The previous child 09705ca4a tree exactly equals this
baseline's parent tree; its checkpoint remains preserved in a recovery ref.
Owned changes: `payroll-export.tsx`, its lifetime tests,
`scripts/phase-d-browser-qa.mjs` and this handoff. Backend R12 refusal, receipt
identity, exact-operation recovery and R13 consumers are unchanged.

## User-facing behavior

A confirmed HTTP 409 with `state: already_generated` now says:

> This time record and CSV have already been exported. Use your original
> downloaded files. No new export was created.

The known refusal clears the uncertain-operation retry immediately. No stale
files remain, and the UI does not promise an artifact catalogue or saved-export
recovery control. Other/malformed 409 bodies retain the existing generic conflict
feedback, never the confirmed-duplicate claim. Unconfirmed transport outcomes
retain the existing exact-operation retry behavior.

Reading the 409 body adds an async boundary. After parsing, the handler rechecks
the privacy generation and current server-derived deadline before displaying a
notice. A retired or expired response cannot restore notice, files or retry state.

## Whole Phase D scenario correction

The former scenario exported every finalized card (only D3-E), cleared/reloaded,
selected D3-E and waited for another successful export. The second fresh command
has the same canonical time and CSV, which R12 intentionally refuses.

The updated scenario:

1. Captures the actual first UI POST, HTTP status and JSON/raw response body;
   verifies its real reply and downloads both original files before clearing.
   Actual bytes and SHA-256 values must match the original receipt.
2. Captures the second fresh UI POST; requires a different operation ID with all
   other command fields identical, HTTP 409 and exactly `already_generated`.
   Requires the duplicate-specific notice, no UI files/retry/download event and
   an unchanged receipt ledger with no row for the second operation ID.
3. Replays the original command through the supported authenticated POST API in
   the current Manager browser context. Requires the original operation/receipt,
   identical CSV/canonical bytes and payload, and no added ledger row. This is
   explicitly API recovery; it does not restore files into the UI.

`payroll_export_receipts` stores one immutable operation/export payload per row.
Before/after ledger rows, requests, statuses, parsed/raw bodies and download
fingerprints are retained in `report.payrollExports`. Each response is recorded
before its assertions, including unexpected or malformed bodies. Duplicate
refusal is established by its actual response, never a download timeout.
All later mapping, geometry, reports and D7 scenarios remain in place.

## Evidence actually run

Directory:
`/Users/josek0514/.codex/release-completion-20261111/r12-export-duplicate-ui/`.

- `duplicate-ui-red.json/log`: 1 failed / 81 passed across two component files,
  reproducing the generic conflict copy after a successful first export followed
  by a fresh duplicate command.
- `duplicate-ui-body-red.json/log`: 5 failed / 4 passed / 72 deselected. The
  stronger controls require the delayed 409 body to be parsed before invalidation.
- `duplicate-ui-green.json/log`: **99 passed, zero skipped**, four focused files:
  lifetime 81, selection 4, reply verification 6 and API route 8.
- Eight new lifetime cases cover duplicate feedback with no old files/retry,
  conflict/unknown/malformed 409 bodies, delayed blur/account/source invalidation,
  and elapsed server validity while the expiry timer has not fired. Existing
  exact-operation retry and protected-lifetime coverage also passes.
- Full TypeScript: `duplicate-ui-typecheck.json/log`, passed.
- Final scoped ESLint: `duplicate-ui-final-lint.json/log`, passed.
- Final browser script syntax: `phase-d-final-syntax.json/log`, passed.
  `git diff --check` passed before commit.

The earlier immutable CI artifact at
`ci-phase-d-failure-8ee99de2f/artifact/nevora-phase-d-browser-evidence/report.json`
identifies clean source 8ee99de2f and ends after the first quiet-phone export
check. It did not retain the second response body; the updated browser scenario
must provide that evidence on the next candidate.

## Ownership and next gate

CPO position: truthful duplicate-specific guidance with no unsupported recovery
promise. CTO/CISO: preserve backend uniqueness/current authority and fence the
new body-parsing boundary. Governance/assurance: retain meaningful RED/GREEN
evidence and require the actual whole-browser refusal/replay proof.

The integration owner imports this bounded commit and owns the new build, full
local Chromium/WebKit Phase D run, independent review and next CI candidate after
the old candidate's jobs finish. **The whole browser scenario was not run here**;
syntax/unit success is not that qualification. No full suite, build, hosted
action, Actions dispatch, push, native application or production change occurred.
No new Jose decision or policy exception is required for this integration fix.
