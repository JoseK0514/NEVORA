# Interaction and states — Desktop round 5

**Verdict: not zero; incomplete.** No new interaction-area P0/P1/P2 was established. Keyboard, menus, submitting and state recovery were not fully inspected.

## Earlier findings

IS-P4-06/20/21 fixes are present in source (closed-group traversal, deeper-section current semantics, sticky status/focus). Their manual rechecks remain incomplete. IS-P4-05/11/19 follow ownership notes in the source round. Historical evidence: `evidence/source-interaction-states.md`.

## Checked and correct

- No visible mouse target below24px and no axe violation in all 35 initial checker cells.
- Controlled protected reads were held/released in the browser; every other non-read mutation was blocked. No app save, decision, sign-out or publication reached the server.
- ST-P4-13’s late selected-group expansion is filed under stability; the chosen group is visible in the final ready viewport. Its before-paint correction remains the owning branch’s work.

## Gaps

All manual focus/keyboard, account menus, closed-group navigation, panes, offline/paused/failure/session/empty/partial/decided states, pending/double press, reduced motion and remaining matrix.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only; fictional owned preview only. No app source edits or app mutations. No production access.

The unchanged checker completed **35 unique cells**: Owner 21 + Employee 14, Chromium 1440×900/100%, axe enabled; **14 raw pass / 21 raw fail**. Owner 19 cells include the documented absent `/api/manager/inbox-count`404; legacy folded-request/Reports/Settings/manager-Updates body floors are retained as out-of-scope observations. Employee’s two failures are TC-P4-22/23. Raw JSON is unchanged. See [checker summary](evidence/checker-summary.json), [Owner raw](evidence/checks-QAOWNER-chromium-1440-100.json), [Employee raw](evidence/checks-AUDIT-E-chromium-1440-100.json), [source round](evidence/source-ROUND.md).

**Exit matrix incomplete.** Gates required pausing browser work; the resumed scope was limited to font crops, a sidebar reference, and controlled Inbox CLS attribution. No WebKit, other widths, collapsed sidebar, full role/state matrix or full manual five-area sweep was completed. No earlier finding is independently closed beyond the measurements stated here. Full matrix requirements are retained in [metadata](evidence/round-metadata.json).

All owned browser/checker/Next/PostgreSQL processes were stopped. Final closure verifies unchanged source and mirror, PostgreSQL stopped, and zero closure errors: [audit](evidence/closure-audit.json). Runtime substitutions are disclosed in [adapter manifest](evidence/runtime-adapter-manifest.json) and [source hashes](evidence/source-manifest.json).
