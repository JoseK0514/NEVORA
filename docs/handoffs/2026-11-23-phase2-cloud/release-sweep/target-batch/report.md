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
