# November 16 readiness: bounded CI driver follow-ups

Codex owns the four backend findings and these test-driver repairs. Claude owns
application UI; Rondo has its separate owner. The existing integration chat owns
combined assembly. No other chat or checkout was messaged, interrupted or edited.

Development is the operating/acceptance release, held to production standards.
No development/main push or deployment was performed. No paid activation, real
messages, customer-data tests or policy change was introduced. SCRUM-199 remains
outside this work.

## Source and implementation

Fresh remote fetch and source inventory check passed: 73 classified sources,
three active branches. The remote heads remain:

- development/base: `22a9d598eb470cd380ee739d7396f06ecf335ed5`
- collaboration: `40ccc4e4e5b74b48c8fd86ef50c4ec6efe9b4dd1`
- main: `46d6dc76922bb273379baccd329e0af636d1dcb6`

The original four fixes are implemented in
`c9de85ecef4f8eb2fb9f109e494bfde892022f65`. Their required form/history wiring
and backend test evidence remain in the existing
[backend UI contract](2026-11-16-readiness-backend-ui-contract.md),
[development handoff](2026-11-16-readiness-development-integration.md) and
[scheduling browser follow-up](2026-11-16-readiness-webkit-navigation.md).

Candidate 04 (`321a7bb5f6a9165ec29fb6cb90d0059540070b4a`) passed validation,
release/Phase E/Clocker PostgreSQL, onboarding backend and management-review UI
in [Actions 43903205719](https://github.com/JoseK0514/NEVORA/actions/runs/43903205719).
The combined release remains unaccepted because other required browser gates
failed. Those receipts do not qualify later test-driver source.

This cumulative follow-up ends at
`47b4c6ab402406b2bdb7bb06544b947ad34c6f4c`; its application/test source is
`749beb1993b4f1f4b3ebe258e54f7b3e1bd7e010`. Take the cumulative final changes,
including the regenerated manuals, when reviewing/integrating. Earlier test
revisions and their failed runs remain preserved.

Only four test-driver files changed:

- `scripts/phase-e-home-browser-scenarios.mjs`: current visible task rows,
  Notifications readiness at every Employee width, and attached lifecycle
  markers with visible/private-content assertions. The offline test follows
  existing Review B2/NV-001: loaded own data stays within its original lease;
  blur clears private rows/name/time, offline return restores nothing, and
  reconnect requires a fresh authorized read. The pagehide test compares read
  counts at the actual pause boundary, preserving the requirement that clearing
  does not start a new read.
- `scripts/phase-e-communications-browser-scenarios.mjs`: visible conflict,
  recovery, audience and access-state matches; current recovery label at every
  Employee width; an eligible ordinary Employee fixture (not a designated Lead).
  The real publication guard remains unchanged. The lost-reply probe drains its
  intercepted HTTP 200 response and abort before recovery/unrouting. Unexpected
  route failures are asserted, and exact receipt identity/time must remain
  unchanged after recovery. Private Updates still clear immediately offline.
- `scripts/phase-e-calendar-browser-scenarios.mjs`: verifies complete native
  selection of the actually labelled calendar field rather than its older ID.
- `scripts/phase-e-browser-qa.mjs`: waits for finite entry animations to settle
  before the same zero-violation axe assertion. Separate diagnostics retain
  violation IDs and sanitized CSS targets, without HTML, text or capability URLs.

No application UI/backend files changed in this follow-up. All six manual PDFs
were rebuilt solely for source qualification, including Rondo's PDF; no Rondo
application/content change was made. Their source is `749beb1993b4f1f4b3ebe258e54f7b3e1bd7e010`
and application hash is
`5d8f4fc92a74f20dd7dd84e3765ff7673d93953a2a802dadeddf0c3c4027d5bc`.

## Executed evidence

The compact [receipt](readiness-development-evidence-20261116/ci-driver-followups-receipt.json)
records hashes, exact sources, cell coverage, failed rounds and teardown.
Detailed local evidence is under
`/Users/josek0514/.codex/worktrees/nevora-readiness-integration-evidence-20261116`.
All browser/SQL data was owned and disposable; all resources in the recorded
rounds are stopped and their ownership records closed.

- 37 focused tests passed across four files, including private lease expiry,
  Home lifecycle, calendar lifetime and manual publication. Log:
  `current-presentation-unit-final.log`.
- Real PostgreSQL TCP startup and teardown regression: one passed. Three earlier
  invocations refused missing runtime/evidence settings before the application
  test; the correctly configured run used `PHASE_E_STARTUP_EVIDENCE_DIR`.
- Full typecheck passed. Full lint passed with the existing anonymous-default-
  export warning in `services/hosted/neon/workforcemonitor.entry.ts`; affected
  scripts also passed targeted lint. No warning/assertion was suppressed.
- Six source-qualified manuals built and verified. The stale-content guard
  correctly refused the old PDFs before regeneration.
- Optimized build passed on clean, unchanged `47b4c6ab402406b2bdb7bb06544b947ad34c6f4c`:
  exit 0, 5,119 hashed artifacts, `current-presentation-build.json`.
- Home round 6 passed four complete Chromium phone cells on
  `84bdda52cafe950c929d8bda3d8aaf55f50f7d99`, then found an obsolete tablet
  Notifications readiness selector. The final source repairs that selector.
  Round 7 stalled earlier at canonical communications; it was explicitly stopped
  through its verified owned supervisor and remains **unqualified**. Its
  `bounded-stop.json` and failed ownership receipt are retained. The final Home
  matrix, including the tablet selector repair, still needs qualification.
- Updates round 8 passed five complete Chromium cells (320–768px) on `47b4c6ab402406b2bdb7bb06544b947ad34c6f4c`,
  including stale revision refusal, committed lost-reply recovery, ordinary
  Employee publication, privacy clearing and exact receipt preservation. It
  failed the 1024px layout axe assertion. A preceding concurrent round timed out
  at login and remains failed evidence.
- Calendar round 7 passed five complete Chromium cells (320–768px) on the same
  source. The 1024px functional scenario completed, including clipboard failure,
  native full-field selection and token lifecycle. Its settled axe scan failed
  `color-contrast` at `.command-finder-trigger > kbd`.

None of these partial browser rounds is a passed full Chromium/WebKit matrix or
hosted acceptance. Old failed rounds were not overwritten or reclassified.

## Claude contract and next gate

The independently reproduced UI item is the desktop command finder's shortcut
hint: `.command-finder-trigger > kbd`, at 1024px. The existing style is in
`src/app/app/owner-b-desktop.css` near line 43; the control is rendered by
`src/components/command-finder.tsx`. Claude should correct the contrast using the
existing design tokens, preserve the hint and keyboard/focus behavior, and
verify tablet/desktop themes. The exact settled failure is
`current-presentation7-calendar/axe-calendar-chromium-1024.json`.
Updates also fails its 1024px axe assertion; additional violations must be checked
rather than assumed resolved by this one repair. No new form field/API contract
is required by this follow-up. The existing SCRUM-205 contract remains binding.

The integration owner must qualify the final Home matrix and the combined
candidate's complete required gates after the UI repair, reconcile remaining
navigation/correction/attendance/Clocker workflow drivers with the current UI,
and take the separate Rondo owner's qualified work. This backend handoff does
not certify those other workstreams. Keep failed gates visible.

Engineering recommends these bounded test repairs; privacy controls and current
publication authority remain intact. Release impact is **BLOCKER** until the
combined candidate has its required evidence. There is no requested risk
exception or new Jose approval needed to continue authorized backend/test work.
SCRUM-204–207 remain **In Progress / implemented / acceptance pending**;
integration and deployment are separate, unclaimed states.

Jira follow-up comments were written and echoed back after this handoff:
[SCRUM-204 / 10435](https://thevelani-team.atlassian.net/browse/SCRUM-204?focusedCommentId=10435),
[SCRUM-205 / 10436](https://thevelani-team.atlassian.net/browse/SCRUM-205?focusedCommentId=10436),
[SCRUM-206 / 10437](https://thevelani-team.atlassian.net/browse/SCRUM-206?focusedCommentId=10437),
[SCRUM-207 / 10438](https://thevelani-team.atlassian.net/browse/SCRUM-207?focusedCommentId=10438).
Current issue reads confirmed In Progress with implemented/acceptance-pending
labels; no workflow completion or integration/deployment claim was added.
