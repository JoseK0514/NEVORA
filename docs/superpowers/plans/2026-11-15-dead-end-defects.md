# NEVORA confirmed dead-end defects

> **For agentic workers:** Use Superpowers systematic-debugging, test-driven-development and dispatching-parallel-agents for the independent tasks; verify the combined change and obtain one fresh whole-change review before integration.

**Goal:** Repair confirmed backend account-access and payroll hand-off defects from Jose's assessment without adopting unapproved product policies.

**Architecture:** Preserve session/transaction guards, immutable export and payroll receipts, current external/native mode policy, and finalized timecard provenance. Add bounded input/projection contracts; Claude owns every UI change.

**Tech Stack:** Existing Next 16, TypeScript, Temporal, Vitest, owned loopback PostgreSQL.

**Spec:** Jose's attached “Close NEVORA's dead ends before selling wider”, development `b5085edb33d1bccc440588f950e728566c8a79ac`, and Nov 15 clarification: fix confirmed defects preserving rules; reuse documented approvals; otherwise recommend once; retain independent review, Manager scope, tenancy architecture; defer broader improvements. UI stays with Claude; Rondo stays with its assigned chat.

## Constraints and scope

- Detached worktree from freshly fetched origin/development. No new named branch; only development push authorized. No main/production work.
- No customer data, production credentials, real notifications, charges, new subscriptions or legal assertions.
- Do not turn unknown legal facts into warnings or remove approval/source controls.
- Existing raw-time exports and historical receipts retain honest recorded-time semantics. Paid-time exports require explicit classification of every relevant recorded break; no guessing from its label or duration. Do not infer overtime.
- Existing external JSON imports remain valid. CSV uses explicit amounts and the same complete-population, currency, balance, period, revision and review checks.
- All broader roadmap items remain deferred, not claimed complete. Document policy evidence and missing decisions separately.

## Review focus

- Concurrent Owner deletion/demotion cannot leave the company without an active Owner whose account is not pending deletion. Refusal must roll back session/calendar revocation.
- CSV money parsing must use integer cents, reject malformed/duplicate/partial data and preserve command idempotency and source identity.
- Export paid hours must retain paid rests, subtract only explicitly attested relieved meals, clip overnight/DST/period boundaries, and retain finalized revision/hash fences. Existing receipts replay their original bytes.
- No UI ownership, independent-review, legal-rule, Manager-permission or tenant-isolation change may enter this diff.

### Task 1: Final Owner account deletion safeguard

**Files:** `src/lib/account-deletion/requests.server.ts`, `src/lib/data/employees.ts`, adjacent unit tests and `src/test/integration/employee-mobile-deletion-sql.integration.ts`.
**Interface:** Existing deletion outcomes remain renderable. An unavailable refusal may carry additive reason `LAST_OWNER`; Claude receives the reason contract. Use the same ordered lifecycle locks as profile changes; exclude open deletion requests when counting remaining Owners.

- [x] Reproduce final-Owner lockout in owned SQL; record red test.
- [x] Add transactional guard, align profile demotion guard, preserve duplicate/unknown-outcome semantics and rollback.
- [x] Run unit/owned SQL for final Owner, two Owners, concurrent deletion/demotion, normal employees and duplicate requests; commit bounded files.

### Task 2: Paid hours and daily export contracts

**Files:** `src/lib/payroll-export/*`, export API tests and `src/test/integration/clocker-payroll-export.integration.ts` as necessary.
**Interface:** Add explicit per-recorded-break paid/unpaid classification to new export commands; bind it to operation/source identity. Add paid/unpaid duration and business-day projection for the provider-neutral file. RUN Pay Hours cannot silently use break-inclusive recorded hours. Preserve raw time and historical receipt replay, provider shape, explicit precision and complete mapping checks.

- [x] Reproduce 8.5 elapsed / 0.5 unpaid => 8.0 paid, paid rests retained, unclassified refused.
- [x] Implement minimal pure projection and service integration without schema or UI changes. Require explicit review of legacy RUN recorded-hours mappings rather than silently reinterpreting saved profiles.
- [x] Verify exact integer durations, overnight/DST clipping, invalid classification, finalized-source changes, replay and authority; commit bounded files.

### Task 3: External payroll CSV totals

**Files:** `src/lib/payroll` input model/contracts plus new pure CSV adapter/tests; existing configurable-payroll integration test as necessary.
**Interface:** Add a versioned CSV wrapper or command adapter with explicit source/period/payday metadata and decimal dollar totals. Normalize into canonical NEVORA_PAYROLL_IMPORT_V1 and run its existing reconciliations. Preserve exact source audit evidence and do not claim provider-specific compatibility. Claude gets a documented example for upload/typed totals UI.

- [x] Reproduce inability to submit a normal CSV; test failure first.
- [x] Implement bounded strict CSV input, exact cents, total-deduction/contribution labels and existing validation; JSON stays accepted.
- [x] Test malformed quoting, header/row/size/amount limits, duplicate/missing employees, balance, zero amounts, period conflict, import/approve/publication and retry; commit bounded files.

### Task 4: Qualification and remaining-decision handoff

**Files:** New `docs/handoffs/2026-11-15-dead-end-defects.md`; source inventory disposition only if the checked collaboration delta can be truthfully classified; source-qualified manuals using existing tooling.

- [ ] Check current documented availability, rules, correction, Manager and tenancy approvals; distinguish approved direction from proposals. One short recommendation per missing decision, with launch need and safeguard effect.
- [ ] Record precise backend/Claude boundaries and remaining assessment roadmap. No Rondo edits.
- [ ] Run whole unit, typecheck, lint, owned affected SQL, applicable release-engineering/format/source/manual checks and production build. Use fictional fixtures only.
- [ ] Review whole diff in fresh context, resolve material findings with regression tests, fetch origin again, preserve concurrent development changes, push verified candidate to development without force, then verify remote SHA and CI state.
