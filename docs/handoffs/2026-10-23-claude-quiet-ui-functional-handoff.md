# Claude handoff: preserve Quiet v4 and restore existing workflows

Prepared October 23, 2026 for Jose to give to Claude. This is a requested implementation scope, not release approval or a completed verification report.

## Jose's instruction

Keep Claude's visual style. Changes may be made when necessary to meet NEVORA's goals, but Jose must first receive the proposed scope. The purpose is informed management decisions, retained workflows, approved policy wording, and reliable verification. Do not redesign the product to resolve these findings.

Keep Quiet v4's palette, typography, spacing system, icons, grouped rows, navigation, and existing sheet/disclosure patterns. Use the approved mockups and templates in `docs/product/specs/owner-v4-quiet/` and `kit4.css`. Do not restore the earlier visual design, introduce a second component style, or add unrelated features. If a necessary repair cannot fit these patterns, show Jose the specific proposed UI change before implementing it.

## Verified source and current state

- Claude UI: `Claude-UI-Fix`, `34a974d87c5842934bc06721381c7f9a5299c4dd`.
- Current remote development: `8d4a3792aceb9cd56e7e33ce318f4d5e9a74f9bb`.
- The UI commit is directly based on that development commit: 242 changed files covering the Owner/Manager and sign-in rebuild. Findings below are a focused risk review, not exhaustive certification of every changed file.
- Codex's unpublished local UI corrections were removed after Jose requested that the design remain intact. Application source, public assets, and DESIGN.MD in Codex's review checkout are identical to Claude's UI commit. No UI correction was pushed, merged, or deployed.
- Do not use Codex's temporary local assembly commit as your starting point. Fetch first and work from the current reviewed development/UI lineage. Reconcile any newer changes before applying this handoff.
- Preserve other active worktrees. Six remote branches currently exist, including the held spending-controls draft and a separate CI-repair branch. Do not delete branches, overwrite another owner's work, or create an extra remote branch without resolving the existing six-branch limit.

## 1. Full shift facts before an approval decision

File: `src/components/manager-shift-requests.tsx`, particularly `at`/`exchangeLine` around lines 39-47 and pending exchange/callout rendering around lines 103-116 at the reviewed UI commit.

Observed regression: a pending swap shows the source weekday/start time and the other employee's name. It does not expose the other shift's date, hours or location; the source end time, location and unambiguous calendar date also disappear. The row has no replacement detail link. Callouts similarly omit duration/location. This affects desktop and phones. The previous implementation exposed the source and target shift records through ExchangeShifts/ShiftBlock.

Requested repair:

- Keep the Quiet summary row. Make complete decision facts available through an existing Quiet detail/disclosure or sheet pattern before a manager decides.
- For a swap, show both employees and both calendar dates, start/end times, and locations. For a coverage transfer, show the source shift and intended recipient when known. For a callout, show the affected shift and the submitted reason/note.
- Preserve real data and existing date/time semantics; never fill missing records with invented values.
- Preserve server authorization, company scope, availability checks, expected revision, operation identity, decline behavior and unavailable/stale handling. Adding information must not make an ineligible request approvable.

Acceptance:

- Use a fictional swap whose source is October 5, 2026, 08:00-12:00 at North Office and whose target is October 8, 2026, 14:00-18:00 at South Office. A manager can inspect both records before approval; this catches accidentally repeating the source for the target.
- Cover coverage and callout records as well as the swap. Verify denied/unknown availability and missing revisions still withhold approval.
- Exercise the real detail-opening interaction on phone and desktop, by keyboard as well as pointer. Check readable wrapping, focus, closing/return focus when modal, and no horizontal document overflow.
- Add a regression test that fails on the reviewed commit and passes with the repair. Server render tests alone do not prove an expandable detail is reachable.

## 2. Retain the existing phone bulk timecard workflow

File: `src/components/timecards.tsx`. The phone return at lines 395-418 bypasses the Select action at line 422 and selected-set review/confirmation/results at lines 441-455.

Observed regression: individual detail and approval remain available, but phone managers lose the established bulk select/review/confirm workflow. Resizing from desktop to phone can also hide an in-progress review or results.

Requested repair:

- Add Select/Done through QuietNav's existing right action slot or another already established Quiet action pattern. Retain the current page style and individual detail sheet.
- Reuse the existing batch state and commands. Make eligible row selection, action choice, exact selected-set review, explicit confirmation, and per-card results reachable on phones.
- Preserve approval versus finalization as separate actions. Reuse the already-approved confirmation text; do not change payroll policy or calculation behavior.
- Preserve the 100-card limit, self-review restriction, issue/state exclusions, revision/source checks, expiration, actor-change clearing, and lifecycle fencing.
- Keep partial/unknown results and retry of the original attempted action reachable. Do not replace an uncertain command with a newly generated operation or imply that the whole set committed atomically.
- Keep review/results accessible across viewport changes while retaining the existing private-data retirement rules.

Acceptance:

- On a narrow phone viewport, select two eligible fictional cards; the current actor's own card remains excluded. Verify review and fresh confirmation are required before submission.
- Exercise the distinct finalization path, partial/uncertain results, and original-command retry using isolated fictional fixtures.
- Resize while a review/result is open and verify it remains reachable. Verify source/revision changes and session/actor/lifecycle invalidation cannot reuse an old reviewed set.
- Existing desktop and employee timecards must continue to work. A custom historical date picker was already desktop-only in the base; do not add one as an alleged regression fix.
- Extend `src/components/timecards.batch.test.tsx` as appropriate, plus a real browser interaction at the actual phone breakpoint. Width-only desktop screenshots are insufficient: the component also checks pointer/media conditions.

## 3. Restore the already-approved Support wording

Files: `src/app/support/page.tsx` lines 29, 35, 38; canonical facts/blocks in `src/lib/legal/policies.ts`, especially lines 16, 25 and the SUPPORT contact section around line 101.

Observed regression: the page says "Reply within 2 business days" and omits the canonical contact block using `slice(1)`. It loses the approved aim, public-holiday qualification, and investigation qualification. The mailing address is copied into JSX instead of read from its source.

Requested repair:

- Display the existing approved policy content using the existing Quiet support content/accordion pattern. Do not invent a new promise or revise policy.
- Canonical response fact: "We aim to respond to support and privacy inquiries within two business days. Business days are Monday through Friday, excluding public holidays observed in Puerto Rico. Requests that need investigation may take longer to resolve."
- Read `POLICY_FACTS.SUPPORT_RESPONSE_TIME` and `POLICY_FACTS.BUSINESS_CONTACT_DETAILS`, or render their existing canonical SUPPORT blocks through BlockView, so future approved facts cannot diverge from this page.
- Keep the existing support email, privacy-safe assistance and policy visibility rules. Do not change the legal policy source/version or other legal/payroll wording without Jose's approval.

Acceptance: render the real page, confirm the complete canonical qualifications and mailing address appear, and check the public page on a narrow phone for readable, accessible expansion and wrapping. Test the rendered content rather than grepping source code.

## 4. Restore meaningful device-management coverage

Files: `src/components/clocker-device-manager.test.tsx` around lines 28-32 and `src/components/clocker-device-manager.tsx`.

Observed test gap: a test titled as opening device options only checks initial static row markup and asserts that search was removed. It would pass if management controls became unreachable. This is not a proven production failure of those controls.

Requested repair:

- Add actual interactions that select Active / Needs setup / Removed, open the relevant device row, and reach the correct Rename, Replace tablet, Reconnect tablet, New setup code and Revoke access controls for their states.
- Verify cancellation, keyboard focus, disabled actions for inactive locations, and the hydration restriction.
- Use fictional devices and isolated action boundaries. Do not register, rotate, reconnect or revoke a real hosted device.
- Replace removal-only assertions with behavioral coverage where they do not represent a documented requirement. Keep other meaningful assertions. Do not restore search merely to make the old test pass.
- Production UI changes are needed here only if an interaction test demonstrates a real defect; keep any such fix inside the existing design and report it.

## CI dependency: separate from these UI corrections

Existing PR29: https://github.com/JoseK0514/NEVORA/pull/29

Reviewed repair head: `2ea580d623c76dd7d717492d209552461b5b4a28`. Its changed paths do not overlap the Claude UI changes and contain no application UI changes. That compatibility does not establish that the repair is complete.

Exact candidate workflow https://github.com/JoseK0514/NEVORA/actions/runs/40035586510 completed FAILURE. The retained artifacts show three primary blockers:

1. Phase E SQL: employee-navigation assertions passed, but owned process supervision failed with `OWNERSHIP_UNAVAILABLE` after a descendant lease had been recorded. The initial-root zero-lease correction does not close this case. The precise historical timing is unproved.
2. Phase D: WebKit Reports navigation hit the original 15-second wait at `scripts/phase-d-report-navigation.mjs:47`; the destination remained payroll-export. Follow-up diagnostics support an unresolved recovery/navigation interaction, not a proven historical timing cause.
3. Attention: startup failed with "canceling statement due to statement timeout" before browser cells executed. Browser runtimeErrors were empty. Do not relabel this as the earlier unclassified WebKit error.

The aggregate/evidence failures are downstream. Validate, Clocker SQL, release SQL, Home, Communications, Calendar and Navigation passed on that named candidate, not on a future UI assembly. Failed, skipped, pending and unstarted checks do not count as successful verification.

Recommended ownership: Claude supplies the bounded UI corrections and evidence; Codex reviews them and coordinates the remaining CI repair, development assembly and DEV Preview. Do not race the separately owned repair work or silently absorb unrelated branches. If Jose assigns CI repair to Claude too, coordinate ownership first and retain all negative ownership/authorization controls. Never substitute blanket longer timeouts, repeat clicks, ignored page errors or removed tests for a diagnosis.

## Verification and return package

1. Record exact base/head and changed files. Read AGENTS.md and relevant project skills. Inspect package scripts before running them; never use production credentials.
2. Keep the patch bounded to these functional repairs and meaningful regression tests. Report any additional discovered app defect with its proposed repair to Jose before expanding scope.
3. Provide failing-before/passing-after evidence for the reproduced regressions, plus phone/desktop screenshots matched to the same existing Quiet reference. Include keyboard/focus, loading, unavailable, empty and success/uncertain states where relevant.
4. Run appropriate focused tests. Jose prefers the heavy verification in GitHub cloud: types, repository lint, full unit suite, production build, audits, all SQL jobs, Attendance/remediation/D2/Clocker browser, all 70 Phase E cells across the five suites, and both evidence gates. Retain all 12 mandatory jobs. Coordinate one combined candidate before starting a full cloud run where practical; never describe an older head's success as verification of the new one.
5. Return commit SHA, branch/PR, changed scope, test commands/results, browser evidence paths, and every remaining blocker. Do not say "perfect" or "all verified" from unit tests or screenshots alone.

## Integration and release boundaries

- Re-fetch development and run `npm run check:development-sources` before assembly. Its inventory currently needs reconciliation for the advanced Claude UI and assembly line; this is not permission to weaken the check or overwrite recorded sources blindly.
- Preserve the existing remote branch ceiling and recoverable history. Push only your own authorized branch. Do not merge main, force-push or delete another owner's branch.
- No production deployment, hosted database writes/migrations, real SMS/email/push, paid inference, or customer-data changes are authorized by this handoff. Use fictional data in disposable environments.
- DEV Preview is a later, gated delivery step. Existing public link: https://nevora-git-development-josekarlo-5933s-projects.vercel.app/login
- Current accepted DEV deployment is `dpl_3i9LDQMt67MNd5n9hLqZRUVfUt6f` from `e37d08e3fedda00a949168c491216bba12ab4a13`; use it as rollback if a later approved Preview is promoted. Recheck the actual alias/deployment before acting. A deployment record alone does not prove the workspace/database configuration is correct.
- Current development also contains the default-off Owner advisor. Its pending DEV migrations 0036/0037 and any paid inference activation remain separate from this visual/functional repair; do not apply or enable them as an incidental deployment step.
- Keep existing DEV environment isolation and disabled real delivery. Verify a new deployment's own URL, workspace identity and required pages before moving the NEVORA alias, then verify the public link. Production remains held.
