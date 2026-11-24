# Release follow-ups (Nov 24, 2026)

Four last UI follow-ups that Jose asked to fix before release. Each fix is its own commit on
`claude-codex-collab-nevora-kit-final`, after merging `origin/claude-codex-collab-nevora` at `5c713840` (`5aa24235`).

| # | Fix | Commit |
|---|---|---|
| 1 | Phone tab bar labels in rem, growing to a cap; the bar grows at large text | `3569a573` |
| 2 | Segment unread count stays centred on its label at every text size | `3efb3f01` |
| 3 | Insights range line: the band fill is clipped to the glyphs (no strip) | `2d340c6d` |
| 4 | Desktop back link: its 44px reach is placed on it with a mouse | `597ae7ff` |

**Evidence:**
- **Builds:** production (`next build` + `next start`) of `5c713840` (before), of `3569a573` (after, fixes 1–3) and of
  `597ae7ff` (after, fix 4, `/app/requests` only). Fictional data on a throwaway local Postgres.
- **Roles:** the Owner, a company-wide Manager (Elena) and a Lead (Luis).
- **Views:** Home, Notifications, Time off requests and Insights at 320, 390, 768, 1024 and 1440, each at 100% and 200%
  root text. That's 120 views before and 120 after, plus 8 for fix 4.
- **Shots:** in `shots/`, named `<role>-<screen>-<view>-<before|after>.webp`. Phone shots are at 1× CSS pixels.

## Default size: nothing else moved
Whole-page pixel diffs aren't usable here. The seeded schedule, hours and to-do counts follow the clock, so Home and the
lists differ between runs (for example "To do 13" before and "To do 11" after). Instead, every element the fixes touch
was measured in both builds at all five widths at 100%: the tab links, the segment counts, the back link and the
Insights range line (box width and height, font size, line height, computed height).

- **All 280 measurements are identical** before and after.
- **Insights range rows (134–158px) at 1024 and 1440:** at most 4 colour levels a channel, and one pixel over 3 levels.
  That's the old flat fill giving way to the band itself.
- **Back link region at 1440 (Owner and Manager):** pixel-identical.
- **axe (wcag2a/aa, 21a/aa, 22aa):** 0 violations on every view, before and after. Document overflow 0 everywhere.

## The fixes at 200% text
1. **Tab bar** (`owner-b-shell.css`). The labels were a fixed 10.5px. They're now `min(0.65625rem, 13px)` on
   `min(0.8125rem, 16px)` lines: 10.5/13px at 100%, growing with the reader's text to 13/16px.
   - A tab is 62–64px wide at 320. A one-word label can't wrap, and at 200% "Schedule" would need about 85px, so the
     labels stop where the widest still fits, as tab bar labels do on iOS (Apple HIG).
   - Measured at 320 and 390 with 200% text, all three roles: every label is 13px, on one line, inside its tab (widest
     "Schedule" and "Requests" at 59px in 62px). Nothing is clipped or truncated.
   - Once text is enlarged a label may take a second line and the tab grows from 56px. The Lead's bar is 60px tall.
   - `shots/*-home-320-text200-*`, `*-home-390-text200-*`.
2. **Segment count** (`messages-manager-b.css`, `b-foundation.css`). The Manager's and Owner's Notifications count pill
   (`.mb-segn`) was a fixed 20px while its numeral grew. At 200% the 24px "1" hung below a 28×20 pill, half out of the tab.
   - The pill is now 1.25rem: 20×20 at 100%, 40×40 at 200%, with the numeral centred on the label's line.
   - The shared segment count's 16px line is now 1rem (the Lead's Time off "1": 16px tall at 100%, 32px at 200%).
   - `shots/mgr-company-notifications-320-text200-*`, `-768/1024/1440-text200-*`.
3. **Insights range line** (`b-foundation.css`). The 9c807031 fill now has `background-clip: text`. It paints only
   inside the glyphs, under the 86% white text, so the band shows unchanged around the words at every size and the
   darker strip at 200% is gone.
   - axe reads `background-color`, so it still measures the fill: 5.96:1. axe on Insights: 0 at 320, 390, 768, 1024 and
     1440, at 100% and 200%.
   - `shots/*-reports-1440-text200-*`, `*-reports-1024-*`.
4. **Back link** (`owner-b-shell.css`). "‹ Things to do" over the Owner's time-off list is a quiet page's 32px back link.
   Its 44px `::after` (owner-b-pages.css, target size) needs a positioned link, and only the touch rule
   `(pointer: coarse)` made it relative.
   - With a mouse at 1440, the probe 21px above its centre landed on `main.page-frame` (`hits 1101`); after, all four
     points land on the link.
   - It's now relative from 768px at every pointer, with `inset: auto`, so it stays where it was drawn.
   - `shots/owner-requests-1440-*`.
   - **Gap:** the harness gives every view under 1000px a touch pointer, so its 768 views ran with the coarse rule that
     already worked. 768 with a mouse is covered by the same rule (`min-width: 768px`) but wasn't measured with a fine
     pointer.

## Checks
- **Tests:**
  - `kit-text-rem.test.ts`: tab bar, segment count and back link.
  - `b-foundation.test.ts`: the Insights fill.
- **`tsc --noEmit`:** clean.
- **`oxlint`:** 0 errors; 3 existing `no-img-element` warnings in files these changes don't touch.
- **`src/components` + `src/app`:** 4963 of 4963 pass.
