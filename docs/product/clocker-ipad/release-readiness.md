# Clocker candidate handoff

Implementation branch: `codex/clocker-ipad-integration-20261027`, isolated from `origin/development` at `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`. An isolated HTTPS staging deployment is now authorized and provisioned. Immutable staging source tags preserve the candidate; the implementation branch itself is not pushed. No PR, development assembly, main merge or production-system deployment has been performed. See staging-environment.md for current custody and evidence. The local prototype remains separate from the integrated application.

Jose’s clarified support target covers iPad mini, standard iPad, iPad Air and iPad Pro, with both Safari and Home Screen web-app mode required. A tested minimum iPadOS version is still pending. Dedicated location-specific launch metadata is implemented; native installation and lifecycle acceptance remain open.

The approved Clocker foundation is preserved: pale station rail, system type, teal actions, regular Phosphor icons, consistent12px controls and tablet touch targets. Administration is Company Owner-only. Canonical time/receipt rules, current Company proofs and exact-command recovery remain authoritative.

## Software verification

See [implementation evidence](implementation-evidence.md) and [fresh review](reviews/2026-10-27-final-review.md). The final browser batch is under the local task's `outputs/clocker/review-fixes-final/` directory, outside this implementation worktree. It includes normal, enlarged, Spanish, Owner and recovery screenshots.

The final browser driver distinguishes36 actual application checks from6 synthetic photo-exit UI checks. The latter mock only photo readiness/notice/status while exercising actual UI, current PIN identity and canonical local time writes. They do not activate a lifecycle provider, camera or image collection. The separate12-check camera/session model uses fictional images and transports. All PostgreSQL tests use newly owned loopback clusters and fictional people.

The original fresh review found2 Important privacy defects. The combined fix pass adds monotonic private-screen timing, rejects already expired verification replies, carries the original monotonic deadline into camera work, returns photo exits directly to PIN, and uses one shared eight-second receipt limit. Browser regressions failed before the fixes and then passed in both engines. No second reviewer or production certification is claimed.

## Release gates — not waived

| Gate | Actual state | Required next evidence |
|---|---|---|
| Physical iPad | All IP01–IP28 NOT RUN | Named model/iPadOS, actual accessories/text settings, approved isolated HTTPS endpoint and [acceptance sheet](ipad-acceptance.md). Both Safari and Home Screen required across the iPad compatibility matrix. The Mac loopback address is not an iPad environment. |
| Photo operations/runtime | Staging-only platform binding implemented and code-reviewed; hourly scheduled cleanup observed; hosted photo and automatic-expiry checks passed | Migration0041 adds restricted platform cleanup and freshness/attestation gates. Production runtime remains unavailable. No real employee photos. Actual synthetic upload, private Owner read/removal and scheduled byte expiry passed with unchanged time receipts. See staging-environment.md; saving On alone never overrides operational gates. |
| Development source hygiene |Passed at the staging freeze; post-freeze governance delta pending | Exact staging source469aa56e is preserved. Shared development subsequently advanced to84c3fc35 with a governance-only branch-policy change. Reconcile that separately before development integration; this task does not silently change its recorded six-branch guard. |

No real employee photos, new subscriptions, outbound notifications or analytics/replay were used. Isolated staging credentials were generated and stored privately in the existing service environments; no production credentials were copied. Retention1–30 days is a technical configuration range, not a legal determination. Inherited nodemailer advisory IDs are recorded in implementation evidence and remain with the mail workstream.

## Rollback boundaries

- `NEVORA_CLOCKER_UI_V2` defaults off and changes only scoped presentation. Punch enablement is independent. Returning to the previous presentation must not restore Manager Clocker authority.
- Photo Off/capture-unavailable stops new collection. It does not imply immediate deletion of existing/private/backup evidence. Do not bind a fictional readiness provider or expose private image URLs.
- Migrations0038–0040 are additive and local-test verified. Do not drop populated tables, remove audit/receipt history, or clear IndexedDB as rollback. Any necessary data rollback requires a reviewed migration.
- Browser site-data clearing or OS eviction can remove local references; no perfect-durability guarantee is made. Canonical Owner receipt/Timecards review remains the operational escalation.

The local candidate and worktree are retained for review and completion of these gates. Task10 remains open for physical/operational/source acceptance; automated tests do not close it. Shared Impeccable context reported stale design-registry artifacts; the approved scoped tokens were used, and that unrelated registry drift was not silently repaired.

## Staging operational follow-up

Vercel runtime-log connector reads returned403; log access is unverified and needs account/connection correction. Hosted application checks, scheduled cleanup and database-role evidence passed independently. Physical iPad acceptance remains NOT RUN. Current staging attestation expires November3 at13:09UTC and staging quotas may stop service earlier; do not silently extend either gate.
