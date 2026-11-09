# Employee mobile — Requests and eligible open shifts

Jose authorized this bounded Phase 2 batch on 2026-10-27. Continue the accepted Phase 1 teal system; Employee and Lead only, mobile only. This is local implementation and acceptance, not release authorization.

Base: `ae6767980ec21c5a0751eced6e0e60a23ea75cdf`, accepted Phase 1 worktree. Branch: `codex/employee-mobile-requests-20261027`. Fresh `origin/development` is `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`; its newer access/onboarding changes do not change Requests/exchange services. Reconciliation with that line and the existing source inventory is required before assembly, without merging unrelated work into this batch.

## Contract

- Requests provides clear entry points for eligible open shifts, own time off, swaps/cover, availability and own status. No management controls or peer absence/reason data.
- Open shifts uses the existing location/publication reader and the same command planner as final writes. Only positively checked eligibility enables pickup; unknown checks are unavailable, never eligible or empty. Show safe rule refusals separately. Detail preserves date, overnight end, location, position and current request revision.
- Pickup submits the existing immutable operation/revision contract. Immediate assignment and manual review have accurate different copy. Lost responses reconcile the original operation before resending. No optimistic assignment or new business-policy implementation.
- Reuse the existing private snapshot lifecycle and Employee SQL/session guards. Mobile facts clear on background, offline, expiry and authority change. Retained in-memory command identity survives temporary release for safe reconciliation; retired callbacks cannot repopulate private UI. No persistent private cache.
- Desktop and management routes retain current rendering. Existing time-off, incoming swap, cancellation and history destinations stay reachable; their deeper mobile ports are later batches.
- Reuse Phase 1 semantic tokens, Phosphor and native elements. At least 44px targets, 48px primary controls, visible focus, coherent counts/status, readable light/dark and 320/390/430px layouts, enlarged text, bottom navigation clearance. Inline progressive shift detail avoids an unnecessary new modal.

## Tasks and gates

1. Evidence/discovery and design decision: existing services, scoped style context and free 21st metadata. No new dependency or paid code retrieval.
2. RED→GREEN tests for minimal projection/strict decoding, authority/module refusals, positive eligibility, operation retention and accurate pickup outcomes. Implement minimal protected transport over existing service owners and mobile adapters.
3. Actual disposable PostgreSQL and authenticated browser checks: own vs foreign, Employee/Lead vs management, eligible/refused/unknown/module-off/revocation, pickup/readback and uncertain recovery. Light/dark widths, keyboard/focus, enlarged text, desktop isolation and console. Preserve failed runs. Commit application inputs before owned Next mirror; freeze while testing.
4. One fresh whole-change code review plus independent UI/QA findings. Address material defects with regression evidence; author a durable handoff and distinct review gallery. Preserve Phase 1 evidence and other worktrees. No push/merge/deploy.

## Design decision

21st free metadata search (`mobile shift list request status employee scheduling`) returned Time Off Request Calendar (25171), Coach Scheduling Card (2554), Appointment Booking Split (29211). Their form/calendar patterns do not fit this read/review/pickup task better than existing primitives. Reuse existing rows, native disclosure and restrained status text, paired with Phase 1 tokens. No registry code, motion dependency or generic ornamental cards.

## Delivery record

Implementation and test results are recorded in HANDOFF.md. No gate is waived; physical devices, assistive technology and hosted parity remain Phase 3 gates.
