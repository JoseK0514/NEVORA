# Dev integration, section B (Nov 23, 2026)

- **Branch:** `claude-codex-collab-nevora-ds-pages`, on base `72f80788`, which is merged at `aec7e188`.
- **Port method:** cherry-picked, one commit per item. Server data contracts are as Codex wrote them. Payroll, legal and permission wording is unchanged.
- **Data:** fictional only.
- **Build for every check:** production (`next build` + `next start`).

| Item | Source | Commit | Notes |
|---|---|---|---|
| B1 | `6e34589e` | `1307f77e` | Applied cleanly |
| B2 | `063aa49d` | `efd0f4d3` | Applied cleanly |
| B3 | `58c8c769` | `8d6f14f7` | Applied cleanly on top of B2, plus one fix (below) |
| B4 | `ae91c1b3` | `e2a64a08` | 10 conflicts, resolved as below |
| Leftover | — | `7c2e82bd` | Publish "What this measures" |

## B1: location-limited Manager time-off empty state
**Fixture:** Daniel (OWN-DANI) is a Manager limited to Condado (loc-2), with Approve time off granted at Condado.
- Four Waiting requests belong to employees who work at both locations. Each is held outside Daniel's scope and left to the Owner.
- To show a full list, the scratch harness adds one request for Miguel Reyes, who works only at Condado.

**Results:**
- **Full list:** Daniel sees only Miguel's request ("Waiting 1"), and his To do count goes from 2 to 3. Shots:
  - `b1-daniel-requests-full-390`
  - `-390-200pct`
  - `-1440`
- **Empty state:** "No requests you can review" / "An Owner can review requests outside your approval permissions."
  - It sits under the tabs with the kit gap from `397f37d0`: 20px on phones and 56px at 1440.
  - That's the same position as the Owner's empty card and as the full list.
  - Nothing is clipped or overflows at 390 with 200% text.
  - Shots: `b1-daniel-requests-empty-390`, `-390-200pct`, `-1440`.
- **Owner empty state unchanged:** "You're all caught up" / "New time off requests show up here." Shots: `b1-owner-requests-empty-390`, `-1440`.
- **Elena (company-wide Manager):**
  - She has no time-off approval in this fixture, so she sees the existing "Time off is decided by an Owner" page (`b1-elena-requests-390`), which B1 doesn't touch.
  - B1 only changes the copy when the Manager's coverage is `LOCATIONS`. For company-wide coverage the empty state is the Owner's "You're all caught up", by construction.
- **Without Approve time off:** Daniel sees the same "decided by an Owner" page as before.
- **Axe** (wcag2a + wcag2aa): 0 violations on every Daniel view.
- **Spanish strings** from B1 for the staff-branch list:
  - "No hay solicitudes que puedas revisar"
  - "Un dueño puede revisar las solicitudes que quedan fuera de tus permisos de aprobación."

## B2 and B3: Edit person phone
- **B2:** an untouched old-format phone saves unchanged.
- **B3:** the `(XXX) XXX-XXXX` pattern applies only while validation applies.
- **Fix folded into the B3 commit:** with `preserveLegacy`, an empty field counted as an "untouched legacy value" and dropped `required`. The field now stays required.
- **New test:** `src/components/team/phone-field.test.tsx`.
  - A legacy value (`555-0101`) keeps its value with no pattern.
  - An edited number must match `(787) 555-0123`.
  - An empty field keeps both `required` and the pattern.
- **Note on the brief's example:** `787.555.0101` isn't a legacy value. It parses, so it's shown as `(787) 555-0101` and validated like any other number.

## B4: action-center scope
- **Applied as written:**
  - the route's `X-Nevora-Action-Center-Scope: assigned` (anything else gets a 400);
  - `readActionCenterForCurrentScope`;
  - `inbox-count`;
  - `useActionCenter(…, scoped)`;
  - Inbox passing `scoped`.
- **Our side:** the redesigned Home (`company-access/scoped-home.tsx`) now passes `scoped` for location-limited Managers.
- **Conflicts:**
  - The page tests, `readiness-ui-browser.integration.ts` and the assembly-sources JSON were kept as ours. Ours are the redesigned versions, and the readiness test has the stronger settle and reload waits.
  - B4's test edits were taken where they still apply. `premium-projections.test.ts` now mocks `readActionCenterForCurrentScope`.
- **Daniel:**
  - Home and Inbox list only Condado items: "Condado · Needs 1 person" and "Find cover" for two Condado shifts today.
  - His To do count is 2, or 3 with the added Condado request.
  - Shots: `b4-daniel-home-390`, `b4-daniel-inbox-1440`.
- **Elena:** her To do count is 13, company-wide and unchanged (`b4-elena-inbox-390`).
- **Owner:** unchanged (`b4-owner-inbox-390`).

## Leftover: "What this measures" on Build and publish, this week's draft
**Fixture:** a scratch switch leaves this week unpublished, so Condado is a draft with 22 shifts. Owner, 390, touch emulation.

**Cause** (it matches QA's repro of the same state exactly):
- With shifts already in the week, "Start from" opens closed. The "What this measures" summary QA hit is inside that closed disclosure.
- Measured in that state, the summary:
  - is 36×36 at y=325;
  - has `checkVisibility()` false;
  - can't take focus;
  - is skipped by Chromium's hit-testing.
- That's why elementFromPoint at ±21.5px returned `form.c-publish__go` and `span.c-row__detail`, the elements drawn at that spot.
- Chromium still reports geometry for closed-disclosure content, so QA's probe counted it as visible.
- Raising its z-index couldn't change the result, because hidden content is never hit.

**Fix:** content of a closed "Start from" now has `display: none` (`owner-b-pages.css`), so it measures 0×0 like any hidden content. Opening "Start from" shows everything as before.

**After:**
- The summary measures 0×0 while closed. The probe has 0 misses with "Start from" closed and with it open (explain closed), on full and empty lists.
- The 390 shot is pixel-identical before and after.
- Shots: `publish-thisweek-draft-390-before`, `-after`, `-startfrom-open`.
- QA agreed it was a probe false positive. They now skip elements where `checkVisibility()` is false and anything inside a closed `<details>`, and will re-probe on the next tip.

## Checks
- **Beside each change:**
  - B4 areas: 356 passed.
  - B1–B3 areas: 63 passed.
  - Team and commands: 32 passed.
  - `target-size-44-desk.test.ts` is extended for the leftover.
- **Gate:**
  - `src/components` + `src/app` + `src/lib`: 15,077 passed and 1 failed. The failure was `src/lib/operations/managed-runtime.test.ts`, which runs the real CLI and checks its cleanup. It ran alongside a browser scan, and it passed alone (12 of 12). No commit here touches `src/lib/operations`.
  - tsc: passed.
  - oxlint: 0 errors.
- **Scratch-harness additions** (not committed; `tools/ui-scan` is unchanged): `NEVORA_SCAN_DRAFT_THIS`, an open-disclosure option, a summary-geometry probe, and Daniel's B1/B4 captures.
