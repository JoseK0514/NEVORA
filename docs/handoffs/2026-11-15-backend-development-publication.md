# Backend-only development publication — November 15, 2026

Jose explicitly requested that the completed backend be committed to
`development` first. He will separately ask Claude to merge it into collaboration.
This supersedes the earlier publication hold only for this backend-only delivery.
Combined UI acceptance and main/production promotion remain separate gates.

## Source and ownership

- Remote development base: `18c75692b841c20cc34590e233abdfdbe2b757ea`.
- Completed backend: `7ea50225225f0b9bd3eeae1617d0258f88352c83`, a descendant of
  that base. Its application/QA source is `062d0b65b50581098eb1144d551a764f93d7ab53`.
- Backend implementation and its local evidence:
  [remaining-work validation](2026-11-15-inspection-backend-remaining-validation.md),
  [API/read contracts](2026-11-15-inspection-backend-remaining.md),
  [authentication review](2026-11-15-authentication-review.md).
- Collaboration is separately held at
  `ce4de4bc492f1e8a1635bc55a7a335bd82f067fe`. Its uncommitted UI is not part of
  this publication. No collaboration checkout, commit or branch ref is changed.
- Main remains `46d6dc76922bb273379baccd329e0af636d1dcb6`. This delivery does not
  authorize production hosting, feature activation, customer tests or live charges.

## Publication scope

The backend includes statements-only payroll enforcement, operator-password
replacement, structured request-error reporting, accurate invitation-delivery
capabilities, centralized feature flags, lifecycle notices, the remaining read/API
contracts, test-project inventory and source-qualified manuals. Preserve historical
native payroll records; do not add new native tax calculations for this release.

The publication adds source reconciliation, this handoff and the bounded
integration corrections below, with rebuilt manuals. Candidate and
actual-development CI must pass on the exact published source; prior local
evidence alone does not satisfy them.

The immutable publication SHA, candidate tag, CI URLs and results are recorded in
the publishing chat's external receipt under
`outputs/backend-development-publish-20261115/`. Do not append receipt-only commits
to a qualified candidate merely to restate its own SHA.

## Integration corrections found by candidate CI

The first candidate, `600aafeffd1f2424365a46ea1360b0c2f4db43c0`, exposed five
failing suites in [CI run 43746734385](https://github.com/JoseK0514/NEVORA/actions/runs/43746734385).
The failed run, downloaded failure artifacts and local RED logs are retained.
No failure was waived or assertion weakened.

- `readInvitationBatch` now binds its status read to the explicitly supplied,
  validated workplace, as dispatch already did. Without that binding, isolated
  callers lost the runtime origin while reading delivery capability. The real
  two-company onboarding journey reproduced the failure, then passed all four
  tests after the one-line correction.
- The existing Phase B authority, calendar and frozen Clocker migration fixtures
  now explicitly model established passwords with `must_change_password=false`.
  The runtime requirement remains enforced. Local existing assertions passed:
  55 authority tests, 25 calendar tests and the migration preservation test.
- The deliberately minimal isolation fixture now includes the credential table
  read by session admission. All 14 isolation tests pass, including a new test
  that blocks both session readers while replacement is required, then admits
  the same company after completion. Another new calendar test verifies the
  corresponding refusal and recovery without creating a subscription while blocked.
- The billing DTO parser rejected a future provider status even though the API
  correctly returned `billingAction=null`. The parser now preserves a bounded
  primitive status only in that non-actionable state; unknown actionable states,
  malformed values and coercible arrays remain refused. The new unit cases
  reproduced the failure before the fix; all 32 billing-client tests pass.

The complete owned onboarding suite passed all 251 tests on PostgreSQL 16.15.
Earlier local restore attempts lacked dump clients or paired a version-16 client
with a version-17 server; those failures were retained and corrected by selecting
the matching existing version-16 server/client runtime, without changing a test.

These corrections affect two server/data modules and five integration/unit files. They
do not change the public interface, company grants, schema defaults or Claude's
UI. Whole-suite and exact-source CI qualification still apply to the replacement
candidate; the first candidate's passing jobs are not substituted for that gate.

## Claude's next integration

After backend publication is confirmed, fetch `origin/development`, preserve and
commit the owned UI on `claude-codex-collab-nevora`, and merge development into that
collaboration branch. Preserve the backend authority and API contracts when
resolving conflicts. Do not replace the backend tree with the older UI checkout.
Report the exact reviewed and pushed collaboration SHA for Codex's combined
integration, UI-specific QA updates and hosted development acceptance.

Development remains the primary operating/acceptance release and uses production
standards. Codex owns backend/hosting; Claude owns UI. Main/production promotion
still requires Jose's approval. A source publication or passing isolated CI is
distinct from verified hosted application behavior.
