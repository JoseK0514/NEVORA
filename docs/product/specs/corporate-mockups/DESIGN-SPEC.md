# NEVORA corporate style — build spec (approved by Jose, Oct 26 2026)

The 69 mockups in `project/*.dc.html` are the source of truth (390×844 phone boards; canvas
https://claude.ai/artifact/6pobRNvAx7LVezFkULYNt8). Overviews: `1-…png` to `6-…png`. Build every page to match
its board: same order, sizes, spacing, colors, copy pattern. Zero tolerance: no collisions, no wrapped labels,
no misaligned edges, no off-token colors.

## Tokens
- Page `#F5F6F6`. Card `#FFFFFF`, radius 12, `box-shadow: 0 0 0 1px #E3E5E6`. No soft shadows anywhere.
- Inner dividers `inset 0 1px 0 #EDEEEF` (`inset 0 -1px 0 #EDEEEF` under a card header; `inset 1px 0 0 #EDEEEF` between stat columns).
- Text `#1A1C1E`; secondary `#4A4F54` (15px) / `#6B7075` (13px); chevrons and disabled `#A7ACB1`.
- Brand teal `#0B6E69` (buttons, links, active tab, counts), hover `#084F4B`, tint `#E6F1EF`.
- Status pills (22px tall, radius 11, padding 0 8px, 13px/600, filled): teal `#E6F1EF`/`#0B6E69`; amber `#FEF4E6`/`#8A4B00`;
  blue `#EAF0FD`/`#1D4ED8`; red `#FDECEA`/`#B42318`; neutral `#EDEEEF`/`#4A4F54`.
- Problem numbers: color text only, red `#B42318`, amber `#8A4B00`. Notification dot `#D92D20`.
- Buttons: primary teal fill, radius 8, height 44 (40 inside cards), 15px/600 white. Secondary: white with `inset 0 0 0 1px #0B6E69`,
  teal text. Neutral control ("All locations ▾"): white, radius 8, 32px, `0 0 0 1px #D5D8DA`, 13/600. Destructive: red text or red outline.
- Count badges: teal circle 22px, white 13/600.
- Inputs: white, radius 8, height 48, `inset 0 0 0 1px #D5D8DA`, 15px; label 13/600 `#4A4F54` with 6px gap; focus `inset 0 0 0 2px #0B6E69`.
- Segmented: track `#EDEEEF` radius 8 height 36; selected white radius 6 `0 1px 2px rgba(0,0,0,0.08)`, 13/600.
- Switch 51×31, teal on, `#D5D8DA` off, white knob. Avatars 32–36px: `#E6F1EF`/teal initials or `#EDEEEF`/`#4A4F54`.
- Type (only these): page title 22/28 600 −0.3px · big value 20/26 600, stat 17/600 · row title 15 (600 for the main label) ·
  detail 13 `#6B7075` · card header 13/600 `#4A4F54` · tab label 11. Font Inter (local), tabular numbers.

## Frame
- Tab pages: white header (`0 1px 0 #E3E5E6`, safe-area top + 12px bottom, 44px row): logo left, bell + avatar right. Then content
  padding 16px 16px, cards gap 12px, page title 22/600 + 13px subtitle at the top.
- Logo: the real NEVORA wordmark (no flame icon), 14px tall, with "WORKFORCE" centered under it (9px/600 uppercase, 2.4px tracking,
  `#6B7075`). Sign-in and Clocker: 20px wordmark, 11px/3.2px label.
- Pushed pages: same white header with "‹ Back label" (teal 15/600, 44px) left and the title centered 17/600.
- Card: optional 44px header row (13/600 label left; teal 13/600 link or pill right) · body · optional action row.
- Sheets: dim `rgba(26,28,30,0.40)`; white sheet radius 16 top; grabber 36×5 `#D5D8DA`; 52px header Cancel · title 17/600 · Save
  (teal 600; `#A7ACB1` disabled); fields stacked with 16px gaps. Sheets, sign-in and Clocker have no tab bar.
- Tab bars (white, 84px incl. safe area, `0 -1px 0 #E3E5E6`, 11px labels, active teal 600 filled/2.2 icon, inactive `#6B7075`):
  Employee/Lead: Home, Schedule, Time, Pay, Requests · Owner and company-wide Manager: Home, Schedule, Time, Payroll, Team ·
  Location Manager: Home, Schedule, Time, Inbox, Team. More opens from the avatar. Pushed pages keep their section's tab bar.

## Jose's rules (Oct 26)
- One primary action per screen; at most 3 cards on a tab page; no Approve/Decline buttons inside lists (decide on a detail page);
  split long forms into steps; add pages rather than stacking everything together.

## Roles
- Employee: own shifts, time, pay, requests. Never other people's pay or approvals.
- Lead: Employee + Today's team and messaging the team.
- Manager (company-wide): Owner screens minus payroll settings and billing. Location Manager: only their locations, no payroll.
- Owner: everything.

## Build rules
- Presentation only: keep server routes, actions, authorization, data contracts and private-data clearing as they are.
- Payroll, legal and activation wording unchanged unless Jose approved it.
- Fictional data only in tests and previews.
