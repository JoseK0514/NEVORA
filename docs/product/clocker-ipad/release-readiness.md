# Clocker candidate handoff

Implementation branch: `codex/clocker-ipad-integration-20261027`, isolated from `origin/development` at `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`. No push, PR, development assembly, main merge, hosted migration or deployment has been performed. The existing local prototype remains separate from the application candidate.

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
| Photo operations/runtime | Capture unavailable; preferences/private review available locally | A real platform-owned, Company-scoped cleanup mechanism and factual backup/restore behavior; verified lifecycle disclosures; hosted private-role/migration and native decoder checks; then a reviewed current-proof runtime binding. `getClockerPhotoRuntime()` currently returns null. Saving On does not implement or activate this binding. |
| Development source hygiene |7 active remote branches; hard limit6 | Repository owner resolves branch hygiene. New theme-default32ce3b5 is classified held; no branch is merged/archived/deleted and the guard is unchanged. Inventory check currently fails only this ceiling. |

No real employee photos, hosted credentials, subscriptions, notifications or analytics/replay were used. Retention1–30 days is a technical configuration range, not a legal determination. Inherited nodemailer advisory IDs are recorded in implementation evidence and remain with the mail workstream.

## Rollback boundaries

- `NEVORA_CLOCKER_UI_V2` defaults off and changes only scoped presentation. Punch enablement is independent. Returning to the previous presentation must not restore Manager Clocker authority.
- Photo Off/capture-unavailable stops new collection. It does not imply immediate deletion of existing/private/backup evidence. Do not bind a fictional readiness provider or expose private image URLs.
- Migrations0038–0040 are additive and local-test verified. Do not drop populated tables, remove audit/receipt history, or clear IndexedDB as rollback. Any necessary data rollback requires a reviewed migration.
- Browser site-data clearing or OS eviction can remove local references; no perfect-durability guarantee is made. Canonical Owner receipt/Timecards review remains the operational escalation.

The local candidate and worktree are retained for review and completion of these gates. Task10 remains open for physical/operational/source acceptance; automated tests do not close it. Shared Impeccable context reported stale design-registry artifacts; the approved scoped tokens were used, and that unrelated registry drift was not silently repaired.
