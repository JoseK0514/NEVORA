# November 16 readiness: bounded UI completion

Jose explicitly asked this chat to finish the two remaining UI flows after the
backend handoff. Both are now implemented in this chat's isolated detached
worktree. Claude's checkout, the integration checkout and Rondo were neither
contacted nor edited. This replaces the earlier pending UI-wiring disposition;
it does not authorize development assembly, main, deployment or production.

## Source and commits

Base development: `22a9d598eb470cd380ee739d7396f06ecf335ed5`.
Backend: `c9de85ecef4f8eb2fb9f109e494bfde892022f65`.
Original delivery/contract: `78b80c07c35c2a13b411c41beaadca74e9a67346`.

Apply the following UI commits in order after those backend commits:

- `eeed508eb475707912b998dbab6dcf0d7993cafa`: forms, conflict recovery,
  paginated history, regression tests and browser scenario.
- `db542220e94a64d6b1590cbf85de3f52b6747c85`: use the owned app's existing
  payroll schema in the browser fixture.
- `c62da88b5cbc7fe80a30e26a37905227568698aa`: supply fictional worker
  availability for the valid-save browser case.
- `0087fc18a8316a39bf850cd8f8c09491520996d6`: retire browser fixture reads
  before navigation/closing and capture the expanded mobile history.

The full SHAs above must match `git log`; the last three commits change only
the new browser test. Final verified application/test tree:
`524e7560b3122d24cc3d0019dc1760291f459e31`.
The documentation/evidence commit follows these commits. No branch was created
or pushed. Remote heads were rechecked: development still `22a9d598...`,
collaboration still `40ccc4e4e5b74b48c8fd86ef50c4ec6efe9b4dd1`.

## Delivered behavior

**SCRUM-205.** Company and location-scoped edit and delete paths submit hidden
`expectedReviewVersion`. The version belongs to the mounted draft, survives
unrelated refreshed props and remains unchanged on retries. A different shift
identity remounts the form. No fresh read silently authorizes an old intention.

`ConfigurationForm`, `ScheduleShiftForm`, `ActionForm`, the edit page and
`ScopedManualShiftForm` connect this contract. Returned refusals now appear in
the delete form as well as edit forms. `SHIFT_REVIEW_CONFLICT` preserves entered
values and offers a transient, copyable summary of submitted changes plus an
explicit reload. Reloading replaces the draft; the UI says to copy needed
values first. No draft is persisted to storage, sent to telemetry or restored
past the existing protected frame's privacy retirement. Uncertain scoped saves
retain their existing recovery lock. There is no automatic rebase or retry with
a newer review token.

**SCRUM-206.** `PayrollPeriodClose` labels each manifest's latest-per-kind summary
and its returned/total count. `PeriodCloseHistory` offers Load history, Load older
events and Refresh history through the existing protected endpoint, 50 events
per request. It carries the opaque cursor unchanged, keys rows by event ID and
reports loaded/total coverage. Completeness is claimed only after all pages in
the snapshot are loaded. Broken page chains are refused rather than silently
deduplicated or truncated. Refresh begins a new watermark. Original artifact
links and fingerprints remain available.

History is transient, has a 15-second request-start lifetime and withdraws on
blur, hidden, offline, pagehide or parent retirement. Pending responses cannot
revive a retired view. No private history is cached in browser storage.

## Executed evidence

Tracked receipts: [readiness-ui-evidence](2026-11-16-readiness-ui-evidence/).
Full raw evidence remains in the external owned directory
`/Users/josek0514/.codex/worktrees/nevora-readiness-ui-evidence-20261116`.

| Check | Result |
|---|---|
| Original-form reproduction | The new token regression was run against the pre-wiring `78b80c07` ConfigurationForm. It failed with `null` review tokens on both retries; the restored implementation passes. |
| Targeted component tests | 39 passed: original token retention, existing population lifetime/recovery, history page chains at 0/1,000/1,001/3,507 events, broken chains, transient draft field allowlist, retirement and late-response fences. |
| Full unit suite | 13,223 passed, 944 skipped, one mandatory failure: `src/test/manual-publication.test.ts`, because generated manuals carry the earlier application content hash. No assertion, guide or PDF was changed to bypass that gate. |
| Owned PostgreSQL + actual browsers | One complete scenario passed in Chromium and WebKit on `0087fc18...`. Separate authenticated Company and location-scoped Manager contexts perform stale edit/delete refusals, retained notes/original tokens, copyable drafts, keyboard delete confirmation, explicit reload, valid save and valid delete. Widths 320/390/768/1440 checked for horizontal overflow. Each browser traverses all 1,001 real immutable events in explicit 50-row pages, checks final coverage/artifact hash, and verifies blur withdrawal. Zero page errors. |
| TypeScript | `npm run typecheck`: passed. |
| ESLint | `npm run lint`: zero errors; one existing warning in untouched `services/hosted/neon/workforcemonitor.entry.ts`. |
| Test project inventory | 80 named projects registered; no orphan configurations. |
| Optimized build | `scripts/release-build.mjs` passed on exact clean `0087fc18...` / tree `524e7560...`; receipt confirms unchanged source and exit 0. No deployment. |

Browser setup failures were corrected in the fixture: duplicate schema setup,
missing fictional availability, then requests left active at navigation/close.
The final run keeps the zero-page-error assertion; no errors were filtered out.
Earlier backend SQL evidence (639 passing tests, including two-session races,
generated/manual transitions and lost-response replay) remains recorded in the
backend delivery. Those SQL suites were not rerun for this UI-only follow-up.

## Ownership, controls and next gate

Product/experience scope: reuse the existing forms and disclosure layout;
no redesign or business-policy change. Engineering: connect the original review
contract and explicit history pages. Security: preserve authority/freshness
retirement and avoid new durable private data. Delivery/governance: distinguish
local implementation/tests from combined acceptance and deployment.

No remaining Claude wiring is required for these two contracts. Claude may
review the bounded presentation when combining it with his current UI work.
The existing integration owner must incorporate these commits, preserve all
other reviewed fixes and reconcile the source inventory before assembly.

Before development acceptance: rebuild/qualify required generated manuals on
the final combined source with their existing owner; run CI/required SQL,
unit/type/lint/build gates; qualify the exact combined SHA and the remaining
two-manager browser matrix (edit/edit, reassignment/edit and edit/delete in both
orders, generated/manual transitions and lost-response recovery). This follow-up
browser scenario uses real actions plus direct concurrent SQL on fictional
records, not two simultaneously editing manager windows, and does not replace
that complete acceptance matrix. Independent finding closure also remains open.

Verified Jira delivery comments
[SCRUM-205 / 10415](https://thevelani-team.atlassian.net/browse/SCRUM-205?focusedCommentId=10415)
and [SCRUM-206 / 10416](https://thevelani-team.atlassian.net/browse/SCRUM-206?focusedCommentId=10416)
record this follow-up; the issues remain
open pending integration/acceptance. Development remains the operating and
acceptance release, held to production standards. No main merge, real messages,
customer-data testing, paid activation or production deployment occurred.

## Combined acceptance follow-up

The original pending two-session matrix above is now superseded by
`2026-11-16-readiness-development-integration.md` and its tracked receipt: 38
checks passed in Chromium/WebKit on `9f23c2f37c376d7974c71f1536eb73666a4fce9e`.
A committed deletion with a lost reply now retains the Company draft and locks
further deletion submissions until explicit review; see the updated UI contract.
Combined Actions/development acceptance remains pending.
