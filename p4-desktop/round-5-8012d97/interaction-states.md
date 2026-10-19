# Interaction and states — Desktop round 5

**Verdict: not zero; incomplete.** No new interaction P0/P1/P2 is certified at this checkpoint. The required keyboard, state and submitting checks have not yet run.

## Earlier findings

IS-P4-06/20/21 fixes are present in source: closed-group rows excluded from arrow traversal; deeper section links use `aria-current=true`; status card sticky and status focus effect added. Measured closure is pending. IS-P4-05/11/19 remain under the ownership notes in the source round. Historical measurements are retained in `evidence/source-interaction-states.md`.

## Checked and correct

- No visible target under 24px and no axe violation in the completed Owner 1440/100 Chromium batch (21 routes).
- Source review confirms Request pages comes first in DOM; Refresh keeps native focus and exposes busy label with `aria-disabled`.

## Gaps

All manual focus/keyboard, menus, panes, closed groups, offline/paused/error/session/empty/partial/decided states, pending/double press, reduced motion and the remainder of the matrix. No mutation was sent to an app.


Exact source: `claude/p4-desktop-240fe0` at `8012d9790e72987140f939c7d70e1df9612ea009`, detached `/workspace/inspect-desktop`. Read only. No app source edits, saves, decisions, sign-outs or production access. Fictional fixture-only owned preview.

The parent paused browser work for the candidate publication’s isolated gate runs. This is a checkpoint report, not an exit certification. Required matrix: 320, 360, 390, 430, landscape 844×390, 761, 768, 1023, 1024, 1179, 1180, 1440 and collapsed 1440; root text 100/125/150/200%; Chromium and WebKit; all brief roles/states. It remains incomplete.

Evidence: [round metadata](evidence/round-metadata.json), [checker summary](evidence/checker-summary.json), [source round](evidence/source-ROUND.md). `checks.mjs` runs unchanged under the external-origin guard. Raw 404 failures are retained; `/api/manager/inbox-count` is absent by this branch’s documented contract and belongs to backend integration.

Checkpoint addition: Employee 12/14 routes passed at 1440/100 Chromium with axe (Availability and My pay have small text). Combined raw result 14/35 pass; see unchanged JSON. Browser work is idle after this batch.
