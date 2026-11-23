# Release batch: 44px targets and placeholder contrast (Nov 23, 2026)

- **Branch:** `claude-codex-collab-nevora-ds-pages`, on `91c08d19` (merged at `5c611bfb`).
- **Code:** `e0546597`, which follows `4529f254`, `4aa9c85a` and the follow-ups.
- **Method:** the same as `dd3c6d56`. Transparent `::after` rings, or padding that a negative margin gives back, so nothing drawn moves. Each target was measured as tap reach from its centre on a production build.

## Checks run
- **Before:** Owner (16 routes) and Employee (5 routes), on `91c08d19`.
- **After:** the same routes on `4529f254`, then focused re-checks of Employee and Lead Schedule at 1024 and 1440 on `e0546597`.
- **Widths:** 320, 390 (also at 200% text), 768, 1024 and 1440.
- **Axe:** wcag2a and wcag2aa on every view, including Team at 1440.
- **Gate:** before the push, the `src/components` and `src/app` suites had 4938 passed and 0 failed; tsc passed; oxlint had 0 errors.
- **Not run:** the full final scan of `e0546597` was stopped at the lead's request (time). The default-size pixel diff was therefore not repeated on that commit. The rings are transparent, so nothing drawn changes; the earlier rounds' diffs showed only live data.

## Fixed (reach from the centre, after)
| Target | Before | After |
|---|---|---|
| Week arrows, owner Schedule (768 to 1440) | 36–37 wide | 44 |
| Week arrows, Employee and Lead (1024, 1440) | 36×36 | 44×44. The ring is placed for the -50% translate that their own rule keeps; the build drops a later translate reset |
| Tablet rail icons (1024) | 40 wide | 44. The rail nav is 4px wider with 2px padding, so its sideways clip edge clears the ring |
| Bell | 40×40 | 44 wide (already 44 tall) |
| Schedule "Today", the "…" menu | 32 tall, 36 | 44 |
| Availability "Requests" | 42 tall | 44 |
| Publish "Done" | 42 tall | 44 |
| Team "See all" | 41 tall | 44 |
| "Apply search" (phones) | 42 wide | 44 |
| Desktop back link ("‹ Things to do", "‹ Settings") | 32 tall | 44 |
| Home card links at 320 | 41–43 | 44 |

Placeholders below 4.5:1 now use the kit greys:
- Employee hours (`--c-faint` #A7ACB1) → `--c-grey`, 4.96:1.
- The quiet input row (`--q-faint` #A3A3A0) → `--q-tab`.
- Mobile access on focus (#8a958f) → #6B7075.

## Already 44 by reach (no change)
The drawn sizes are smaller, but the kit's existing hit rings reach 44:
- the phone filter segments at 390;
- More schedule actions;
- "What this measures" (fixed in `dd3c6d56`);
- Save, Next, Edit, Open time off policies and Show password.

## Accepted under WCAG 2.5.8 spacing (lead's decision)
- **Sidebar links at 1440:** they reach 42px, because neighbouring links' rings meet in the 2–4px gaps. The top "Home" and the separate "Help" link reach 40px. Links aren't moved and rings don't overlap; each target is 40px tall, well over the 24px spacing minimum.
- **Week strip at 320:** seven days at 39–40px wide.
- **Team filter "All" at 1024:** 41 wide, inside the segmented track.

## Contrast: Team "Search people" at 1440, a known axe false positive
- The placeholder is solid white on the field's rendered colour, #1D6C67 (sampled from the shot): **6.2:1**.
- Axe can't compute it, because the field is translucent glass over the teal band and axe measures against the canvas behind it.
- On `91c08d19` my axe runs reported nothing on Team at 1440. The colour is unchanged, because a kit grey would drop to about 1:1 on teal.

## Deferred
None: the Employee/Lead desktop arrows and the 1024 rail icons are both done and measured in `e0546597`. The lead's message deferring them was sent before that push.

## Not changed
Inline links inside sentences (Privacy, Terms, Delete account) are exempt under WCAG 2.5.8.

## Shots
`shots/` holds before and after for Team, Schedule, Publish and Clocker recovery at 1440 (Owner), Availability at 390, and Employee Schedule at 1024 and 1440.

## Addendum: full check on `13509ca2` against `91c08d19` (lead, after Jose chose the full check)
Production builds of `origin/claude-codex-collab-nevora` at `91c08d19` (before) and `13509ca2` (after; it contains this
batch plus other sessions' changes, mainly accessible names and 200%-text rules). Owner: 15 routes. Employee: 5 routes.
Each at 320, 390, 768, 1024 and 1440: 100 views per side, 200 in all.

**Default-size pixel diff:** nothing moves beyond live data, with one drawn change.
- **The rail badge at 1024:** the Things to do count ("16") on the rail icon shows 2px more at its right edge. Before, the rail nav's sideways clip cut the badge's rounded end at x=56; now that the nav is 2px wider on each side, it's complete. That's 30 pixels per page, all inside the rail. Icons, badge position, content column and page don't move. Shot: `shots/final-rail-badge-1024-before-after.png`. The lead was told straight away and kept it: it is the one intended drawn change at 1024 (a badge that is no longer clipped is a fix, not a regression).
- **Live data only, each checked by eye:**
  - the bell's unread dot (768 and 1440);
  - Timecards' running minutes;
  - Employee Home's clock-driven shift card;
  - Owner Home at 768, the same faded card caught at a different point of its entrance animation.
- **Identical:** every other page and width. At 1024 the Owner pages (Team, Schedule, Publish, Add shift, Add person, Profile, Time off policies, Clocker recovery, Things to do, Requests and Delete account) differ only in the rail badge's 2px above. Employee Availability, Schedule, Time and Pick up and swap are pixel-identical at every width.

**44px probe (reach from the centre, inline text links excepted):**

| | Under 44px before | After |
|---|---|---|
| Total | 405 | 195 |
| Week arrows, desktop back links, bell, Done, See all, rail icons 40 → 44 wide | present | 0 |
| Left (accepted spacing group) | | sidebar links at 1440 (40–42 tall), Help at 1440 (40), the rail's top Home and Team at 1024 (42 and 41 tall, 44 wide: the rail's edge and the Team count badge), the 320 week strip (39–40 wide), Team "All" at 1024 (41 wide) |

Everything left is in the group the lead accepted under WCAG 2.5.8 spacing. The shots are `shots/final-*`.

## Last batch (QA's reach test: elementFromPoint at ±21.5px, production build, 390, mouse and touch emulation)
Tip `22293552`, merged at `4ed588b1`.

- **Team filters "All" and "On the clock" (`/app/employees`):** fixed.
  - **Cause:** the 2×2 grid already has an 8px row gap (4 + 36 + 8 + 36 + 4), so the row-gap change agreed as option (a) wasn't needed. The two rows' 4px rings meet at the gap's midline, and the second row, later in the DOM, won that boundary, so the first row fell a sub-pixel short below its centre.
  - **Fix:** the first row now sits above the second (`z-index: 1`, `owner-b-home.css`).
  - **After:** 0 misses for all four pills. Nothing drawn moves: the 390 pixel diff shows only a live figure further down the page.
  - **Shots:** `shots/team-filters-390-before.webp` and `-after.webp`.
- **Time off segments, Waiting / Approved / Declined (`/app/requests`):** all eight points hit for the Owner, both before and after. Not reproduced; the lead is asking QA for the role and state used.
- **"What this measures" on `/app/schedule/publish`:** can't be measured with the fixture. It only shows while the week is a draft, and the fixture week is published. It uses the same centred ring (`b-review-details.css`, 36 + 2 × 4 = 44) that measured 44 on Schedule.
- **Sidebar links at 1440 (still under the spacing exception):** `aside.sidebar .nav-link::after` does render, and the release-batch rule overrides the `display: none` in `owner-b-desktop.css`. The links are only about 2px apart, so each ring runs into its neighbour's in the gap and the later link paints over the earlier. Reach stops at about 42, and 40 for the first and last links where the nav's own edge clips. There's no free space for 44 without overlapping targets or moving the links.

**Checks:** the `src/components` and `src/app` suites had 4951 passed and 0 failed; tsc passed.

## Final two (Jose, before release): Time off segments and the Publish explain
Tip `7201e71c`. Code: `397f37d0`. Measured with QA's reach test (elementFromPoint at ±21.5px), production build, touch emulation.

- **Time off, empty state (`/app/requests`):** "You're all caught up" overlapped the segment pills by 14px on phones.
  - **Cause:** `owner-b-requests.css` forced `margin-top: 0` on the empty card, overriding the kit's gap after a segment row (34px on phones, 44px from 768px).
  - **Fix:** the empty card now takes that gap when it follows a segment row, so it sits exactly where the full list does: 20px below the pills at 320 and 390, 56px at 768 and 1440.
  - **Result:** 0 misses at 320, 390, 768 and 1440. Nothing overflows or clips at 390 with 200% text.
  - **Full list:** pixel-identical at 320 and 390. At 768 and 1440 the only difference is a 14×19px live figure inside the list.
  - **Shots:** `shots/timeoff-empty-390-before.webp` and `-after.webp`.
  - Raising the segments above the card would also have passed the test, but moving the card fixes the drawn overlap itself, so the simpler change was kept.
- **"What this measures" on Build and publish (draft week):** the centred ring had pill-rounded corners, and hit-testing follows rounded corners, so QA's diagonal points fell outside the tap area.
  - **Fix:** the transparent ring now has square corners (`b-review-details.css`), and the summary sits above the row text and the Publish form (`z-index`).
  - **Result:** 0 misses in the draft state, with empty and full lists. The 390 pixel diff is identical.
  - **Shots:** `shots/publish-draft-390-*.webp`.
  - **Fixture:** the draft week comes from a scratch-harness switch that leaves next week unpublished, opened at `?week=2026-11-30`.
- **Not in this brief:** with a full list at 768 and 1440, the desktop back link "‹ Things to do" misses at its top edge, where the point lands on `main.page-frame`.

**Checks:** the `src/components` and `src/app` suites had 4952 passed and 0 failed; tsc passed. `target-size-44-desk.test.ts` is extended.
