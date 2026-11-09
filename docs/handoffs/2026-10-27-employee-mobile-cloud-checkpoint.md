# Employee mobile: Cloud checkpoint, 2026-10-27

> Subsequent phone delivery: Jose authorized uploading the source and full handoff on `codex/employee-mobile-cloud-handoff-20261027`. Start at [the direct GitHub handoff](employee-mobile-cloud-2026-10-27/README.md). The local-only statements below describe the earlier archive checkpoint, not this later authorized upload. The application/test candidate and known RED issue remain unchanged.

Jose requested a detailed handoff to Codex Cloud. Implementation stops at application/test candidate `6110790f48cd6563de05c8cb7e1fcc496dfda135` on local branch `codex/employee-mobile-communications-20261027`. This checkpoint is not an acceptance or release record. No new cloud task, remote push, PR, merge or deployment was performed.

Continue the accepted Employee/Lead teal system and the current Notifications/Updates batch. Read `docs/product/specs/employee-mobile-teal/README.md`, `docs/execution/employee-mobile-communications-plan.md`, `docs/execution/employee-mobile-phase2/STATUS.md` and the prior batch handoffs. Phase2 remains active; Phase3 has not started.

## First open issue

The new browser regression at `src/test/integration/employee-mobile-communications.integration.ts` (`pending-module-fence`, around line95) is **RED** at this candidate: expected immediate unknown/recoverable state after current Updates-module disable, got0 matching status paragraphs. The ordinary module-off DOM/action removal works; the pending recovery controller is not immediately paused because `src/components/employee-mobile/use-messages.ts` currently calls `pause` only when the outer read is absent. A ready own identity with `updates:'off'` also needs to fence the shared communication operation. Preserve the immutable original command/UUID and mounted draft. Do not change the test, merely hide the pending copy, automatically retry, or clear the original command. Proposed smallest fix: pause when the read is missing **or its Updates availability is not on**; verify the actual lifecycle before claiming fixed. This fix has NOT been applied.

## Evidence available at transfer

- Task1 own SQL8/8 passed on `1ade15c0`; bounded source/session/role/module/recipient/destination/paging checks.
- Preflight8 on `2ff4c014`: all3engines passed;66checkpoints,210captures,90contrast samples, minimum6.08945:1, zero runtime page errors.12 retained unused-development-preload warnings. This passing run predates the newly added pending-module regression.
- Broad unit/render/model suite:76files,600/600 passed,14.80s on the same product input before candidate611's added browser/config regression. TypeScript passed for candidate611's source. Scoped lint passed before that last test addition.
- Preflight9 on `6110790f`: failed in Chromium at the new pending-module assertion; owned app and PostgreSQL cluster closed. Failure and all earlier attempts are preserved in the transfer archive.
- Final whole-change code review and independent UI/QA acceptance for this batch have NOT occurred. The expanded combined suite now includes the prior71employee cases plus this batch and six relevant canonical communications suites; this expanded invocation has NOT run.

Current plan ledger: Task1 complete; Task2 in progress; Task3 not started. The portable handoff archive includes the still-active ledger, exact76-file unit argv, raw logs/results, selected actual captures, the original prototype/reference package, source bundle and portable skill instructions. Keep the active ledger until the plan's final review and fixes actually pass; do not delete it as though this batch were complete.

## Source and release boundaries

Accepted Hours/docs parent: `564c71371e16f528a94aa242e42bf906d5890314`; review the communications change from this parent. The accepted unassembled employee stack forks from `46e202786863279302026ee03a0e225c359fa55c`. Last fetched `origin/development` was `84c3fc357b006220ef6bbf29580e7327228c9659`; it is not this feature branch's ancestor. Import/checkout the exact source bundle/branch instead of applying its diff blindly to current development. Reconcile `docs/handoffs/2026-10-21-development-assembly-sources.json` with `npm run check:development-sources` before a later assembly. No production authority or Updates activation exception is implied.

Remaining Phase2 groups after this batch: own profile/preferences/support/legal/sign-out and cleanup; capability-dependent calendar/passkeys/current-device alerts/deletion-request lifecycle; own published Pay and protected PDFs. Earlier browser mockups for these groups are references, not completed real-app ports. Phase3 remains combined actual-device/AT/background/performance/release acceptance after every Phase2 group is implemented and independently accepted.
