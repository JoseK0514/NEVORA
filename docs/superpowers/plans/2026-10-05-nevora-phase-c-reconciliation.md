# Phase C — canonical punch and C5 reconciliation

Approved objective: integrate the verified child tablet experience into the newer parent Phase C lineage without losing C5 or retaining two competing punch engines.
Spec: docs/superpowers/specs/2026-10-05-nevora-phase-c-live-operations-design.md
Parent checkpoint observed: d589ac7; child checkpoint: 9c9134b.

## Boundaries
Work in the existing child worktree. Parent currently has active C5 work; never reset, stash, overwrite or commit its unfinished files. Preserve its observed source separately and integrate only completed parent commits. No push, numbered migration, hosted DB update, external notifications, main/development changes or production deployment. Default punch activation stays false.

## Canonical architecture
Use parent ClockerPunchService, parent command/receipt contracts and parent additive SQL including C5. Retire the unused competing child writer, migrating its regression scenarios onto the canonical service. Preserve the child's actual rendered tablet controls and privacy/recovery behavior, adapted to canonical contracts. Do not silently replay a command after employee re-verification. Read-only receipt recovery is permitted under fresh current authority, same employee and device generation. Persist only minimal per-tab recovery intent, not credentials, PINs, employee names or clock history.

## Steps / verification gates
1. Check child clean baseline, read both histories, preserve observed parent WIP; choose exact parent committed input. Expected: isolated clean child and no parent writes.
2. Merge committed parent lineage into child; resolve schema/engine conflicts to parent with a per-file decision record. Add failing reconciliation contract/security tests, then adapt transport/client. Expected: one writer, all inherited scenarios mapped, exact-current-context execution, receipt-only recovery after context change.
3. Integrate the committed C5 checkpoint when available. Add browser regression for explicit type selection, changed/inactive types, immutable historical labels and retry/re-PIN privacy; adapt the existing Apple-style tablet without unrelated redesign. Expected: configured break snapshots persist and old actions cannot execute under new verification.
4. Run combined Clocker/C5 PostgreSQL tests, foundation regression, full unit suite, typecheck/lint/build, C1/C2 browsers and combined punch/C5 Chromium/WebKit matrix. Inspect screenshots. Expected: zero unaddressed failures; distinguish local from hosted/physical certification.
5. Review full integration delta and branch ancestry. Save the tested merge checkpoint, then advance parent only if clean, no ongoing edits, exact reviewed parent ancestor and verification remains applicable. Otherwise preserve the candidate and report the exact outstanding integration gate. Never imply production readiness.

## Review focus
Competing schema histories, suppressed database writes, context/identity changes between tabs, stale break-type versions, late responses after privacy reset, original-ID recovery after expiry, default-off activation, lost C5 changes, ghost success after an unknown outcome, inherited test coverage and duplicate live writers.

Self-review here is not independent Phase C Codex review. Accepted Phase B hardening and hosted/physical acceptance remain separate release gates.
