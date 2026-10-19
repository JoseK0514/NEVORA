# Merge 1 · backend · interaction and states

**Unpublished diagnostic snapshot, superseded by the concurrent Wave A candidate.** These measurements belong to `2fafc1a`, not published `0e01046` or the current coordinator refresh `25dca8d`. The protected push was rejected when the remote moved; no newer candidate was overwritten.

**Not zero: 0 newly verified P0, 0 P1, 0 P2 in this area; state coverage incomplete.** The copy defect in the forced failed state is counted once in type-colour-copy.md.

Source: `2fafc1aa84f43a120d2f8fff4c3855ebf4b15dcf`; backend merge `29ebdc5`, coordinator base `634795d`. These are combined checks of the initial backend integration and its separate authorized confirmation cleanup. No UI chat is admitted as zero. Later coordinator commits are queued and do not inherit this result.

## Earlier findings

No previous combined backend interaction IDs exist in this track. Other chats' open findings remain open until their own exact-commit checks close them.

## Findings

No new interaction defect filed in this bounded sample.

## Checked and correct

- 40 browser observations across Chromium (320, 390, 844×390, 1440) and WebKit (390), four roles, Home and Inbox: no probe exceptions or horizontal overflow.
- All 32 phone/landscape More openings put focus inside; all 32 close on Escape and return focus to the trigger. No sign-out control was submitted.
- Employee and Lead Inbox navigation settles at `/app/requests/hub`; Manager and Owner remain on Inbox. The earlier streamed-navigation checker race is a harness observation, not a role-access defect.
- Protected Profile and count GETs: Employee/Lead 403; Manager/Owner 200/ready. Manager Profile has four topics, Owner five; signed-out Profile GET returns 401. See `evidence/backend-read-smoke.json`.
- The deliberate failed-read reproduction aborts only the browser's action-center read, one per page. Read-only POST `/api/manager/action-center` is allowed during ready-state probes; saves and other submissions remain blocked or unclicked. The initial broad-POST-block probe is superseded for ready-state claims.
- Confirmation cleanup still increments the same generation ref on leave and cleanup. TypeScript passes, and exhaustive-deps reports 0 warnings. This is a mechanical closure refactor; no test mirrors the implementation.

## Gaps

The complete pending, failure, 401, offline, stale, double-tap and keyboard/reduced-motion matrices for all touched pages remain pending. The completed Schedule matrix is a visual recheck, not proof of a committed confirmation. No business mutations were tested against the server.
