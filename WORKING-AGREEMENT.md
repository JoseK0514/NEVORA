# NEVORA launch operations — working agreement

**Status: working draft v0.1.** This pack prepares customer onboarding and launch operations. It is not a deployed feature, a signed commercial agreement, a production approval, or independent certification.

## Ownership and working boundary

- Jose owns business decisions and final production authorization.
- Claude owns the current application UI/backend workstream.
- This workstream owns only files below `/workspace/nevora-launch-operations/`.
- Read `/workspace/NEVORA` as evidence. Do not edit it, create branches/worktrees, run builds/tests/servers, alter shared environment settings, purchase services, access customer records, send messages, or change deployments/databases.
- Prepare complete reviewable documents now. Unresolved business choices belong in a decision register; they do not block drafting. Do not make arbitrary prices, launch dates, SLA guarantees, or legal commitments on Jose's behalf.

## Evidence and product boundary

The reference checkout is `JoseK0514/NEVORA` at `8e9073974b52053e557382ec5199dbce9d5aa32c`. Its tracked-file baseline is recorded in `evidence/source-baseline.json`. Claude may independently advance his application work; reconcile the final handoff before launch.

- The documented delivery is one company per database, with Owner, Manager, Lead and Employee roles. One customer employing 30 people differs from a customer managing 30 separate businesses; the actual customer structure and counts remain unconfirmed.
- Company setup, employee creation and invitation-based activation exist in source. Automatic multi-company signup, an employee CSV importer, subscription billing, SSO, live provider activation, and production readiness must not be assumed.
- A roster CSV in this pack is a collection worksheet, not a supported application import format. No passwords, invitation proofs, PIN keys, database URLs, bank/tax identifiers or real employee data belong in these files.
- Source code, historical QA notes and public policy text are evidence of documented behavior, not current hosted verification. Every launch acceptance case begins NOT_RUN.
- Existing policy facts in `src/lib/legal/policies.ts` are the wording authority. In particular, preserve the support response aim and its qualifications. The historical six-hour restore-history statement is not a newly verified backup configuration or recovery guarantee.
- Use existing published/public-policy commitments as constraints. New commercial or legal terms remain working drafts for Jose and appropriate review; do not overwrite application policy text.

## Common ownership vocabulary

Use role names instead of inventing staff assignments: Jose / Business Owner; NEVORA Onboarding Lead; NEVORA Operations Lead; Claude / Engineering Lead; Customer Owner; Customer Manager; Employee; Commercial Reviewer. Assign named people during intake. Roles are operating responsibilities, not new application permission levels.

## Status vocabulary

- Work/decision readiness: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `READY_FOR_REVIEW`, `VERIFIED`, `NOT_APPLICABLE`.
- Acceptance execution: `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED`, `NOT_APPLICABLE`.
- A document being complete does not mean its operational checks are VERIFIED. A test plan being written does not mean a test passed.
- Mark proposed decisions explicitly as PROPOSED; reserve approval/verification fields for actual evidence and the authorized decision maker.

## Document conventions

Keep documents practical and short. Provide named owner roles, entry/exit conditions, evidence requirements, and escalation/handoff points. Use relative links within the pack. Cite repository-relative source paths and the reference SHA where product claims matter. Provide fillable tables or header-only CSV templates rather than fabricated customer details. Do not duplicate the same policy across documents when a link will suffice.
