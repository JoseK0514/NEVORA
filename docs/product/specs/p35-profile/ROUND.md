# Profile: exit round 4

| | |
|---|---|
| Chat | Profile (Phase 3.5), docs folder `docs/product/specs/p35-profile/` |
| Round | **4** (rounds 1–3 ran locally; reports in `inspection/`) |
| Commit | the HEAD of `claude/p35-profile-6cdee8` at push time. App code is unchanged since `b8a3bad`; `04dcf3f` takes Codex's pooled test transport (test-only). |
| Exit round | **Yes (coordinator, October 19, to save a cycle).** One full sweep by all five areas, over the whole matrix in the brief, plus the open IDs below. Codex and the Profile chat's local inspectors run it on the same commit; whichever finishes first counts. |
| Brief | `docs/product/specs/codex-joint/INSPECTION-BRIEF.md` on `claude/premium-phase-1`, plus `inspection/BRIEF.md` here for this page's states |

## Route and roles

- `/app/profile` as **Owner `QAOWNER`** and **Manager `AUDIT-M`**: the new page.
- `AUDIT-E` and `AUDIT-LEAD`: must still get the Phase 3 employee Profile and never call `/api/management/profile`.

## The read and the save don't exist on this branch: serve them in the browser

`GET /api/management/profile` and `POST /api/management/profile/alerts` are built on `codex/premium-backend` (not merged). On this branch they 404, which the page shows as its failed-read state. To see every other state, answer them in your own browser with `page.route`, as `inspection/harness/profile.mjs` does:

- **Read:** `**/api/management/profile` → `200` with a fixture from `fixtures/` (`owner.json` for QAOWNER, `manager.json`, `manager-empty.json`, `owner-large.json`), with `observedAt` set to now. States: abort it (failed), `401` (signed out), never answer (loading, which gives up after 10s), delay 4s (slow), no route (today's 404 = failed).
- **Save:** `**/api/management/profile/alerts` → `200 {"ok":true}`, `500`, `401`, abort, or a 4s delay.
- **Pause and offline:** `context.setOffline(true)`, or dispatch `blur` and then `focus` on `window`.
- Payroll is on in the Mac previews. Without payroll (an Owner with four topics, no Pay card, summary "Your details and alerts."), check in the code: `manager-profile.tsx`, `manager-profile-live.tsx` (`payrollAlerts`).

## Full sweep, plus these IDs

| Area | IDs | Expected now |
|---|---|---|
| Interaction and states | **IS-15** (new in round 3, P1) | Focus goes back to a switch only if that switch had focus when the page was left, or when a save ended the session. It happens once, with no scroll (`focus({preventScroll:true})`). A reader who moved on (clicked elsewhere, scrolled) is never pulled back by a later or background read. Phone: tap a switch, scroll to the top, leave and return: no jump. Desktop: click a switch, click blank space, wait 30s: focus stays put. |
| Stability | **ST-03** (P2, narrowed) | The Email and Phone values stack under their labels when the value column is under 17rem (phones up to 430, and 1024 desktop), in every state, so loading and ready rows match. Load CLS 0 for Owner at 320–1440 and Manager at 390–1440 (all entries counted). **Set aside, not open:** Manager at 320–360 (CLS 0.029–0.030; Codex round 4 ST-PROFILE-03). Its 34-character address takes two lines even stacked, and the assigned list wraps. That needs the server read passed as `initial` after the merge (CODEX.md, README "Set aside"). |
| Stability | **ST-08** (P2; Codex round 4: WebKit 390/150% was 36px short) | Fixed after round 4: the band summary is now 24 characters ("Details, pay and alerts." / "Your details and alerts."), and the wrap threshold is 11.2rem with about 20px of margin either side. Measured placeholder = real in all 30 cells: Chromium and WebKit, 320/360/390/430, 100–200%. Earlier text: The placeholder band equals the real band at 320, 360, 390 and 430, at 100–200% (container query on the summary's wrap point). Desktop has no placeholder band (shared rule, Desktop session's). |
| Widths and roles | **WR-5** (P2) | With no email (`manager-empty`), Email and Phone read the same: both stack, "Not added" under the label, on narrow cards. |
| Alignment | none open | Re-measure what round 3's fixes touched: the Email and Phone rows stacked at 320, 390 and 430 (value at card + 20, hairline from card + 20 to the edge). |
| Type, colour and copy | none open | Quick pass on the stacked contact rows at 100–200%. |

## What round 3's fixes touched (commits `7713d75` → `b8a3bad`)

- `manager-profile-live.tsx`: focus restore (`restoreTo`, captured on leave or on a save that ended the session, used once, no scroll); kept row heights after an ended session are dropped on resize.
- `premium-profile.css`: Email and Phone value basis 17rem; placeholder band `calc(44px + 3.75rem)`, plus `calc(44px + 5.25rem)` under two `@container` rules where the summary wraps.

## Don't file

- One console 404 for `/api/manager/inbox-count` per page load (the route is on `codex/premium-backend`; see PARALLEL.md's coordinator notes).
- A console 404 for `/api/management/profile` when no fixture is served: the route isn't on this branch, and the page shows its failed-read state.
- Shared-shell items: phone header, tab bar, More sheet, desktop sidebar and header, and the desktop placeholder band.

## Approved, don't refile

The design as built, the payroll wording ("Pay", "My pay", "Your pay statements", "Payroll ready to review") and the alert topics (CODEX.md table) were approved by Jose on October 19.
