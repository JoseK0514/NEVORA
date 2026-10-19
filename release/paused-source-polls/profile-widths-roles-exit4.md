## Exit round 4

October 19. Preview `http://127.0.0.1:50933`, with Codex's pooled transport. App code is as of `b8a3bad`, with the band re-measured on the exit commit `ee088cf` (summary "Details, pay and alerts."). Full sweep of the area:
- **Chromium:** 320, 360, 390, 430, 768, 1024 and 1440 at 100/125/150/200% text, and 844×390 on fresh pages with viewport captures at the same text sizes.
- **WebKit spot checks:** 320, 390, 1024, 1440 and 844×390 at 100 and 200%.
- **Data:** `owner`, `manager`, `manager-empty` and `owner-large`, plus my fictional `manager-mid` (4 assigned, one 75 characters long) and `manager-large` (12 assigned).
- **Comparisons:** Employee and Lead on 6 sizes at 100/200% (Chromium) and 390/1440 (WebKit); `/app/employees` for both roles on 6 sizes.

290 Profile page measurements loaded, with no 500s and no failed loads. That is 168 Chromium portrait and desktop, 24 Chromium landscape, 28 WebKit and 70 band re-checks. Scripts and results: `…/widths/r4/`.

### WR-5: fixed

Email and Phone now stack together whenever the value column is under 17rem (`premium-profile.css:105-107`). With `manager-empty`, both rows read "Not added" under their label at x=36 with equal heights: 77/77 at 320–430 and 1024 (100%), 88/88 at 125%, 98/98 at 150% and 119/119 at 200%. At 768 and 1440 (100%) and in landscape both sit beside their labels (53/53). The two rows never differ in layout in any case or browser.

### Findings

None. No P0, P1 or P2.

### Checked and correct (exit)

- **No sideways overflow or clipping.** On all 290 pages `scrollWidth` equals the viewport, and no element sits past the edge except the band's decorative SVG. No text is clipped, ellipsised, clamped or within 12px of a card edge.
- **Targets, overlaps, columns and text floor:**
  - No target under 44px on phones and in landscape, or 24px on desktop.
  - No head/meta or switch/text overlap.
  - One column at 320–768 and in landscape, two at 1024 and 1440.
  - Text floor: 15px on phones and in landscape, 14px on desktop, scaling with text size.
- **Band (exit commit):**
  - Phones: 104px at 100% and 119 at 125%. At 150% it is 134, or 170 at 320 where the summary wraps. 212 at 200%.
  - Landscape: 104/119/134/164.
  - Desktop: 108/124/140/172.
  - Band-to-card gap is 16px on every page.
  - Same in WebKit at 320, 390, 1440 and 844×390.
- **Consistency with `/app/employees` (Chromium, both roles):** bands and cards line up at every width.
  - 320: cards 16–304.
  - 390: cards 16–374.
  - 844×390: cards 16–828 (the shell gutter is now 16 in landscape for both pages).
  - 768: band 244–736, cards 260–720.
  - 1024: band 244–992, cards 260–976.
  - 1440: band 282–1402, cards 298–1386.
- **Consistency with the employee Profile:** same band position on phones, 768 and 1024. At 1440 the employee band starts at 276 against 282 here and on Team, a difference on the employee side, not this page. Labels sit at x=36 on both pages. Value-column position and row heights are each page's own design (noted in round 3, not filed).
- **Contact rows:**
  - The 91-character address breaks only between parts, at every size.
  - "ext. 4021" never splits: on one line at 360–1440, and at 320/200% "+1 (787)" / "555-0100" / "ext. 4021".
  - The 34-character Manager address takes two lines at 320/360 (100%), stacked.
- **Locations:**
  - "All 3 locations" and "All 60 locations" are one line.
  - Short assigned lists are inline.
  - `manager-large` "Show all 12" stays put when tapped, at y=751/729/615/644 (320/390/844/1440 at 100%) and 1722/1591/970/1170 at 200%. It stays in view and focused, and "Show fewer" brings back 5.
- **Roles:**
  - Owner (Fictional Owner): Edit your details goes to `/app/employees/QAOWNER`, which opens (200, the owner's own record). 5 topics: Time-off requests, Shift requests, Unable to work, Clock-ins to review, Payroll ready to review. My pay is shown.
  - Manager (Morgan Rivera): the ask-the-owner note, 4 topics, assigned locations and My pay.
  - Summary "Details, pay and alerts." for both.
  - Owner without payroll (4 topics, no Pay card, "Details and alerts."): checked by code only, since payroll is on in this preview.
- **Employee, Lead and long name:** `AUDIT-E`, `AUDIT-LEAD` and `AUDIT-LONG` get the Phase 3 Profile ("Your work information and app settings.") at every size checked, with zero requests to `/api/management/profile`. No overflow, and their 5 rows never stack.
- **Background runs:** none of mine are running. The other node processes in `inspect/widths-roles` folders belong to other sessions' inspectors.

Open P0–P2 in widths and roles: 0
