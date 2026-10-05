# C3/C4 — protected punch transport and connected tablet

Approved scope: the five-step integration work package approved by Jose after backend checkpoint 3617e4ddcc68d8acf571388b967dd7741b8230cf.
Branch: phase-c/persisted-punch-engine. Parent specification: docs/superpowers/specs/2026-10-05-nevora-phase-c-live-operations-design.md.

## Boundaries
Preserve the existing NEVORA Apple-style controls, C1 enrollment and C2 PIN authority. No payroll policy, break classification, schedule matching, dashboard work or production activation in this slice. Use owned loopback PostgreSQL and scratch Next runtimes only. No new paid services, dependencies, real notifications or customer records.

## 1/5 — Protected transport (TDD)
POST /api/clocker/[location]/punch supports state, execute and reconcile. Exact Origin, custom header, JSON body size and shape are checked first. Derive device, employee and location from protected cookies, then reuse the existing transaction engine. Never accept employee IDs or timestamps as authority. Reject disabled configuration and unavailable schema explicitly.
A session-bound HMAC context returned with the server clock view must accompany execute/reconcile, preventing an older tab from acting under another employee's newer cookie. A separate non-authorizing subject fingerprint binds pending requests to the same employee/device across fresh PIN verification without disclosing employee identity or authentication secrets.

## 2/5 — Tablet controls (TDD + rendered verification)
After a successful PIN, fetch actual persisted state and show only eligible actions. Clock Out requires an inline confirmation, including explicit notice when it also ends an open break. Use the existing neutral/blue language, readable hierarchy and large touch targets. Show actual recorded time, not optimistic success. Do not introduce payroll calculations.

## 3/5 — Reliability and privacy
Keep a minimal pending command in per-tab sessionStorage before submission: command ID, expected resource versions and opaque subject only; no PIN, name, credentials or punch timestamps. Do not issue a new command while that outcome is unknown. Reconciliation requires fresh matching employee verification; a missing receipt is not proof that a delayed request cannot still arrive. Offer only explicit retry of the identical command. Preserve recovery across reload/identity clearing, and never show one employee's pending details to another.
Require writable recovery storage before a punch. On a confirmed receipt, remove pending storage and show a brief confirmation, then clear identity. Done/Escape/timeout/pagehide always clear identity through existing C2 privacy flow; late network responses cannot restore an unmounted screen. No auto-replay of PINs or punch commands.

## 4/5 — Verification
Run protected transport against real PostgreSQL: forged/malformed input, authorization changes, context mismatch, expired/revoked authority, stale state, identical retries, cross-location, outage and committed-response loss. Browser-test all four transitions through real cookies/API/DB, double clicks, conflict, lost response, reload/reverification, privacy and tablet/mobile geometry in Chromium/WebKit. Rerun C1/C2 regression and full unit/type/lint/build verification. Record test counts and limits.

## 5/5 — Reviewed local integration
Save only after verification. Review changes against the approved scope. The approved local integration may fast-forward the clean parent Phase C branch only if it remains at the inspected ancestor, followed by verification there. Stop on unrelated concurrent edits or divergence. Do not touch development/main, Phase B or any remote database. Push, hosted activation and independent Codex release review remain separate gates.

## Rulings
- NEVORA_CLOCKER_PUNCH_ENABLED defaults off. It is enabled only in the owned integration harness in this work package; a local green build does not authorize hosted activation.
- C5 break names/payment policy are not invented. These controls record actual start/end of a generic break until approved C5 classification is connected.
- Existing engine receipts are the success source. An HTTP or storage failure cannot be relabeled success or safely retried with a new command ID.
