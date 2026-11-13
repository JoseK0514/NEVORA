# Billing recovery disclosure lifetime — November 13, 2026

Application source: `7f29fe2d7296991d20c978db62f7ef65bfa6014a`.
This is local qualification, not development delivery or hosted acceptance.
Jose assigned `/app/billing` and `/clocker/access/paused` to Codex for bounded
functional completion; Claude keeps the later redesign and unrelated UI.

## Reproduced defect and correction

The combined owned fixture provisions two actual fictional companies, enrolls
their original thirty-day trials in a real local commerce catalog, starts
separate company Next runtimes under actual APP principals, and signs in through
normal browser password forms. A new Owner browser opens its real billing page.
The test deletes only that browser-created session row. The former page retains
the private employee count and billing controls and never reads current
authority again; the twenty-second observation fails. Its trace preserves the
retained presentation. An earlier attempt expected the wrong trial capacity
and failed before revocation; it is a fixture error, not this regression.

The company billing API now returns its existing sanitized `CommerceStatus`
plus canonical `observedAt` and positive integer `validForMs`, at most 15,000 ms
and no longer than the original central authority's remaining lifetime. It still
checks current Owner, session, company, generation, origin and exact Host around
the remote read. No account, installation, customer or raw authority proof is
added to this response. Velani's separate `/v1/status` contract is unchanged.

The billing page uses the existing `createPrivateSnapshotController`. Renewal
keeps the original expiry armed, subtracts the full round trip, fences late
responses, and retires private fields on blur, hiding, page exit, offline and
unmount. Foreground recovery reads current authority. Confirmed 401/403 stops
renewal and removes billing controls; a read timeout or expired unknown result
clears private fields and retains unavailable wording, not a claim of denial.
Retirement also aborts a pending handoff so an old reply cannot navigate later.
There are no operational readers or operational pollers on this recovery page.

Preserve the 15-second disclosure bound and controller lifecycle when Claude
remakes the page. This supersedes the original recovery handoff's statement
that billing performs no automatic polling: bounded **financial** renewal now
runs only in the foreground. It does not activate a worker, subscription,
payment, message, push, model call or analytics.

The exact `/app/billing` sign-in return path was separately reproduced as being
discarded and added to the existing safe destination whitelist. Queries and
external destinations remain refused. Its destination/login set passed 65.

## Evidence and remaining scope

- Actual revocation scenario: RED at `823c3b1fd`; corrected source above records
  real status responses `[200,401]`, zero private details and no billing action.
  Both company apps report closed, sourceVerified and mirrorVerified true; the
  owned PostgreSQL cluster stopped and was removed. Overall combined journey
  remains incomplete: it next fails the known Clocker client contract below.
- Focused private-lifetime/API/public-status/controller/page tests: 84 passed,
  five files; typecheck and full repository lint passed.
- Recovery browser scenario: one test, both Chromium/WebKit, eight checks;
  320/390/768/1440, 200% text, keyboard, contrast, role/privacy and Back behavior.
  Errors empty and owned closure verified. Four other tests were deliberately
  unselected. Financial presentation states in this separate scenario are
  controlled response fixtures, not provider acceptance.
- Existing worker custody/real-child controls: 45 passed, four files. These are
  local component controls, not a hosted worker restart or external heartbeat.
- Follow-up `d01e296c0` retires the old snapshot before every foreground read.
  Recovery browser coverage passed again. A proposed physical tab-switch check
  failed its focus prerequisite: independent Chromium/WebKit, headed/headless
  probes show both pages keep focus under the pinned Playwright automation.
  This is not physical focus-retirement evidence. At `804b67376`, the existing
  component/effects fixture explicitly injects blur/focus, verifies a new held
  read was aborted and fenced, obtains fresh status, and preserves the late
  handoff/no-navigation checks. Both engines passed, errors empty and browsers
  closed. The real SQL session-revocation result above remains separate.

Private raw evidence lives in the finisher's project `work/` directories:
`step4-billing-retirement-red-second`, `step4-billing-retirement-green`,
`billing-private-lifetime-browser`, and their named logs. They contain only
owned fictional data. Never publish raw traces or authentication material.
The controlled effects report is `billing-controlled-effects/commerce-effects/report.json`;
the focus assumption probe is `native-focus-probe.json`.

## Expired handoff follow-up

At `70bae27d4`, the controlled component/browser fixture reproduces an additional
deadline defect: a short original status lifetime expires and clears the private
details, but the already pending billing handoff remains active. The expected new
handoff abort is absent, so the test fails. At
`4ccd84c04eed96dccf78f1725abb4ab4a8b635fe`, every unavailable snapshot cancels that
pending handoff. The unchanged disclosure-expiry assertions pass in both engines,
including fulfilling the old handoff afterward with zero attempted navigation,
then refreshing and completing a new trusted handoff normally. Errors are empty,
browsers closed and the owned cluster stopped. Four other tests were deliberately
unselected. Evidence: `billing-expired-handoff-red` and
`billing-expired-handoff-green` plus their logs. This is controlled component
evidence, not provider acceptance or a physical focus claim.

The latest development database-rehearsal delivery
`67dbf3deaf528d86057d3cd88ae2319ba000d851` was inspected and merged locally at
`9427507cb`. Its actual development GitHub CI/Mobile runs 43360264485/43360264628
pass the exact-source 20-job/10-required-context readback. The 73-source/3-branch
inventory passes after inclusion. These are incoming-release facts, not final
qualification or publication of this finisher's combined source.

Full mobile/recovery preparation at `f65fa74f2` passed all five tests with no
skips in 183.13 seconds. All three owned Next runtimes closed with source and
mirror verification; all 8,937 recorded source-file hashes match locally. The
separate scenario reports retain their financial-fixture and normal-session
scope. The source verifier is `combined-f65-mobile-verification.json`.

The next typecheck caught TypeScript narrowing a callback-populated handoff
receipt to `never` after its deletion in the new test. `b767a19dd` reads it
through the fixture's existing typed helper, preserving the same assertions.
Typecheck and the affected two-engine effects scenario pass (one selected,
four deliberately unselected). This test-only correction does not relabel the
earlier full-suite source; final current-source CI remains required.

## Combined release remains open

The actual protected Clocker setup code is 194 characters, while the existing
client accepts only a 72-character raw-code field and rejects the protected
format. The prepared two-line client compatibility patch is not applied.
Jose's answer to the narrow UI ownership exception is pending. Do not weaken
the server envelope/company/expiry verification or inject a tablet cookie to
manufacture browser acceptance.

Schedule/punch/correction/native-2026-payroll/publication/own-pay and controlled
billing lifecycle stages are prepared in the combined test but have not passed.
Its controlled clock changes application/commerce `Date.now` only; PostgreSQL
and host time stay real. It cannot certify SQL wall-clock expiry, which retains
its separate real-SQL boundary/race evidence. Do not claim a full Task D/E pass,
final manual qualification, independent review, final CI or development merge.

Development is the primary operating/acceptance release at production standards.
Main and production require Jose's later approval of the exact verified source.
The original finite hosted packet stays held and unstarted with zero effects.


November 13 combined-lifecycle update: Jose approved and the finisher applied the
narrow Clocker setup compatibility fix at 6727a1bd3. Complete owned-source
acceptance at 6e9067ad11423f8d464e2b02f37a6d5640067606 passed all 18 stages,
48 bilingual/two-engine recovery cells, real-session denial/offline/late-read
fencing and native sign-out/Back/reauthentication, with no page/window errors and
verified app/cluster cleanup. This is local synthetic SQL/browser/SDK evidence;
final-source CI/development and the original finite hosted packet remain separate.
