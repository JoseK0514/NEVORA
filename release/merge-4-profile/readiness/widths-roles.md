# Profile (Phase 3.5): widths and roles

Inspector: widths and roles (prefix WR). October 19, 2026. Preview `http://127.0.0.1:52269` (frozen), source `claude/p35-profile-6cdee8` at `d27d6ce`. Scripts and screenshots: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/inspect/widths/` (below: `…/widths/`).

## Verdict

The layout holds everywhere I could load it. Across 465 measured pages (5 data cases × 8 sizes × 4 text sizes × Chromium, Firefox and WebKit) there is no sideways overflow (document and body `scrollWidth` equal the viewport on every page), no text clipped or closer than 12px to its card edge, no head/meta overlap, no switch overlapping its text, no target under 44px on phones or 24px with a mouse, the band-to-card gap is 16px on every page, and the one-to-two-column switch happens exactly at 1024. Roles are right: Owner gets "Edit your details" (to its own record, which opens), 5 topics, "All N locations" with Show names, and My pay; Manager gets the ask-the-owner note, 4 topics, its assigned locations and My pay (payroll is on); Employee, Lead and the long-name employee get the Phase 3 Profile and never call the management read. Three P2s remain. The most consequential is not visual: the page runs a second workspace-locking payroll read on every load, and on this shared preview Profile requests timed out in the database often enough (667 of 2,194 `/app/profile` loads answered 500) that it cost part of my matrix (gaps listed at the end). The other two are a 60-location list that throws its own toggle 2,820px down the page, and details rows that stack at 320 and 360 where the employee Profile keeps them side by side.

## Findings

| ID | Page, role, width, browser, text | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR-1 | `/app/profile`, Owner and Manager, every width, all browsers | Server render of the page (`ManagerProfilePage`) | Each load runs `readPayrollCapabilities` twice: once in the shared layout and once again in this page. Each run is a transaction that takes `FOR NO KEY UPDATE` on the single workspaces row, `SHARE ROW EXCLUSIVE` on `employees`, `FOR UPDATE` on every employee and `SHARE` locks on 15 payroll tables (`src/lib/payroll/store.ts:20-28`), so concurrent loads queue behind each other. Preview log during this round: 1,032 `canceling statement due to statement timeout` errors on `while locking tuple … in relation "workspaces"`. 396 of them were raised from `manager-profile.tsx:16`, the other 636 from `layout.tsx:42`. 667 of 2,194 `/app/profile` requests answered 500 ("This page could not be loaded"), some after 50–76 s. The Employee/Lead branch makes one locking read per load and also failed, so the shared load is the trigger, but this page doubles its own share. | `…/widths/shots/crops/WR-1-profile-500-360.png`; log `…/preview/evidence-2026-10-19T13-12-07-874Z/owned-next-Dd11jq/next.log` | `src/components/manager-profile/manager-profile.tsx:16` repeats `src/app/app/layout.tsx:42` | Read capabilities once per request. Ask the coordinator (owner of `layout.tsx`) and Codex (owner of `src/lib/payroll`) for a request-cached reader, `export const readPayrollCapabilitiesForRequest = cache(readPayrollCapabilities)` using React `cache`, and call it from both `layout.tsx:42` and `manager-profile.tsx:16`. That makes one locking transaction per page load instead of two. Don't build a separate non-locking query in the UI: the My pay rule has to stay the shell's rule (CODEX.md table, row "My pay row"). Judgment: P2 because one user on an idle server never sees it. It is measured here, but under shared load. | P2 |
| WR-2 | `/app/profile`, Owner, `owner-large` (60 locations), 390×844 Chromium (also 320, 768, 844×390, 1024, 1440, 100% and 200%) | "Show names" / "Hide names" (`button[aria-controls=profile-all-locations]`) | The toggle sits under "All 60 locations". Tapping it inserts the 60 names *above* it, so the control you just pressed moves from y=703 (in view) to y=3,523, which is 2,820px down and off screen. It keeps focus (`document.activeElement` is the button, `inView: false`). Your details grows to 3,447px, about 4 screens at 390. Pay moves from y=831 to y=3,651, and Sign out ends at y=4,492. At 200% text the card is 7,025px (390) or 7,605px (320), and the toggle moves from y≈1,463 to y=7,219. To close the list you scroll to its end. A keyboard user's next Tab starts from an off-screen control. Same pattern for a Manager with more than five assigned locations ("Show all 12" moves to the end of the list; 12 items, smaller). | `…/widths/shots/crops/WR-2-show-names-390-after.png` (right after the tap: the list, no toggle), `…/widths/shots/crops/WR-2-hide-names-390-bottom.png` (where "Hide names" ended up) | `src/components/manager-profile/manager-profile-live.tsx:79-81` (scope line, then list, then button); `:86-87` for assigned | Render the button directly after the scope line and before the list: `<span class="pmp-locations-scope">All 60 locations</span><button …>Hide names</button><ul …>`. It stays where it was tapped, keeps `aria-expanded`/`aria-controls`, and closing needs no scrolling. Use the same order for assigned locations (`Show all 12`/`Show fewer` under the first five, above the rest). The CSS already allows it: `.pmp-details dd > .pmp-text-button { display: flex }` (`premium-profile.css:24`); change `.pmp-locations-scope + .pmp-locations` (`:23`) to `.pmp-text-button + .pmp-locations { margin-top: var(--nv-s-1) }`. | P2 |
| WR-3 | `/app/profile`, Owner and Manager, 320×640 and 360×780, 100% text, all three browsers | Your details rows (`.pmp-details > div`) | At 320 and 360 every value drops under its label (7 of 7 rows stacked), while at 390 all 7 sit beside it, and the Phase 3 employee Profile keeps label and value side by side at 320 (value column 140px wide) and 360 (164px). The switch comes from a fixed basis: label 6.5rem (104px) + gap 16px + value basis 11rem (176px) = 296px against a 288px row at 360, missing by 8px. On the Owner the card is 685px tall at 360 against 539px at 390, 27% taller for the same seven values. (Stacking at 125%+ text is the intended large-text behaviour and is not part of this finding.) | `…/widths/shots/crops/WR-3-owner-360.png` vs `…/widths/shots/crops/WR-3-employee-360.png` | `src/app/app/premium-profile.css:17` (`dd { flex: 1 1 11rem }`) with `:16` (`dt { flex: 0 0 6.5rem }`) | Lower the value basis to `flex: 1 1 8rem` (128px). Then 104 + 16 + 128 = 248 fits the 248px row at 320 and the 288px row at 360, so both stay side by side like the employee Profile at 100%. At 125% the need becomes 310px, so 320–430 still stack with large text as intended. The long email and phone already break between their parts (`Parts`, `manager-profile-live.tsx:55-67`), so a 128–198px value column stays tidy. Judgment: stacking at 320 is defensible on its own; the finding is the 8px miss at 360 and the mismatch with the employee Profile. | P2 |

## Checked and correct

Matrix: `…/widths/matrix.mjs`, results `…/widths/results-*.json` (merged: `results-merged.json`). Sizes 320×640, 360×780, 390×844, 430×932, 844×390 (landscape, touch), 768×1024, 1024×768, 1440×900. Text 100/125/150/200% via root font size after hydration. Data: `owner`, `manager`, `owner-large`, `manager-empty`, and my own `manager-large` (`…/widths/fixtures/manager-large.json`: assigned, 12 long names, the long email and phone).

- **Sideways overflow:** `documentElement.scrollWidth` and `body.scrollWidth` equal `innerWidth` on all 465 pages. The only elements past the viewport edge are the band's decorative SVG (inside the band's `overflow: hidden`, by design).
- **Clipping:** no element in the page with `scrollWidth > clientWidth` under a non-visible overflow; no ellipsis or line clamp cutting text; no text run within 12px of its card's edge. Longest cases: `owner-large` email (91 characters) breaks at its dots and @ into 5 lines at 1024/200% and stays inside the 350px column; the 75-character location stays 21px inside the card at 320/200% (text right 283, card right 304) and 29px inside at 390/200%.
- **Columns:** one column at 320–768 and in landscape, two at 1024 and 1440 in all browsers and text sizes. Column widths: 350+350 at 1024 (16px gap), 462+462 at 1280, 536+536 at 1440. At 1024/200% the right column leaves 254px for a topic title and 4 of 5 titles take two lines, which is normal wrapping with nothing cut; at 1280/200% (366px) all fit on one line. Details on the left, Pay, Notifications and Sign out on the right, tops aligned (217 at 1024 and 1440, 100%).
- **Band and cards against Phase 2 (`/app/employees`, Chromium, 100%):** card edges match at every size. Phones: cards 16px from the edge (16–374 at 390). Landscape: 24–820 (same as Team). 768: band 244–736, cards 260–720 (same). 1440: band 282–1402, cards 298–1386 (same). The Profile uses the flat band (16px band-to-card gap on every page) where Team overlaps its band (−72/−56). That follows the employee Profile and the brief.
- **Against the Phase 3 employee Profile:** same flat band. Band height is 104px on phones portrait for both at 390; the employee band is 128 at 320/360/430 because its longer summary wraps. The new page's 1440 band starts at 282, the same as Team. The employee Profile's band starts at 276, a difference on the employee side, not this page. Detail rows differ at 320/360 (WR-3).
- **Text floor:** smallest text in the page is 15px on phones and in landscape (label column, callout), 14px on desktop (desktop kit roles), and scales with text size (17.5/21/28 at 125/150/200 on desktop, 18.75–30 on phones).
- **Targets:** no link, button or switch under 44×44 on phones/landscape or 24×24 with a mouse, at any text size. Show names and Edit your details are 44px tall, switch rows 64px, Sign out 64px.
- **Landscape 844×390 (fresh page per text size, viewport captures, all browsers):** phone layout (the landscape media query matches), 24px gutters, one column, the phone type roles (15px floor). Scrolled to the end, Sign out ends at y=302 and the tab bar starts at 322/319/315/307 (100/125/150/200%), so it is never covered.
- **Phones, end of page:** scrolled to the end, Sign out's bottom edge sits above the tab bar at 320–430 in all browsers, by 20px at 100% text, 17px at 125%, 13px at 150% and 5px at 200%. The bar grows from 68 to 83px with text size, and the shell's bottom padding doesn't. It's never covered. The shrinking margin belongs to the shell, not this page.
- **Owner (QAOWNER):** name "Fictional Owner", role Owner. Foot link "Edit your details" goes to `/app/employees/QAOWNER`, which opens with the owner's own record (200, heading "Fictional Owner"). 5 switches: Time-off requests, Shift swaps and cover, Unable to work, Clock-ins to review, Payroll ready to review. "All 3 locations" and Show names; with `owner-large` "All 60 locations", Show names lists 60 items and toggles back (`aria-expanded` true/false; label "Show names" ↔ "Hide names"). Pay card with My pay to `/app/my-pay`. No ask-the-owner note.
- **Manager (AUDIT-M):** name "Morgan Rivera", role Manager. No Edit link. Foot reads "Something wrong here? Ask the account owner to update it." 4 switches, without Payroll ready. Assigned list "Main Office", "West Office". `manager-large`: first five, then "Show all 12" ↔ "Show fewer" (12 items). My pay shown, which matches the shell rule: payroll is on in this preview (`navigation.ts:128-131`, used at `manager-profile.tsx:17`). The payroll-off case can't be switched on this preview without server changes; by code the row disappears (`manager-profile-live.tsx:134`).
- **Empty (`manager-empty`):** Email "Not added", Phone "Not added", Locations "None assigned yet", 4 switches all off. No overflow at any width or text size.
- **Employee and Lead:** `AUDIT-E` (Alexandra Rivera), `AUDIT-LEAD` (Taylor Rivera) and `AUDIT-LONG` (María José Rivera Santiago With A Long Name) get the Phase 3 Profile ("Your work information and app settings.", `.premium-employee-profile`), never `.premium-manager-profile`. Zero requests to `/api/management/profile` across 96 employee/lead pages (3 browsers × 8 sizes × 100/200%). No overflow at any of them; their details rows stay side by side at every width and text size.
- **No cross-role data:** the page's identity comes from the session (`manager-profile.tsx:22-30`). The live view is keyed by the employee id (`ManagerProfileLive key={proof.employee.id}`). Neither `private-snapshot-client.ts` nor the component writes to local, session or IndexedDB storage. Each account showed only its own name, role and edit target.

## Not findings (recorded so the next round doesn't re-file them)

- **Chromium full-page captures in landscape** switch the page to the desktop layout (band at x=244, 14px type) for the measurements taken after the first full-page capture. Chromium's full-page screenshot in mobile emulation resizes the viewport past 430px tall, so `(max-height: 430px)` stops matching. A fresh page per text size with viewport captures shows the phone layout in all three browsers. It's a capture artifact, like the sticky tab bar drawn mid-page.
- The dark "N" circle over the Home tab and the sidebar footer is the Next.js dev indicator. It's dev only.
- Two management reads on a single load for the Manager in one run (initial `sync` plus `pageshow`). That belongs to the interaction area and is noted for that inspector, not filed here.

## Gaps

- Matrix: 465 of the 480 planned page measurements loaded and were measured (failed loads were retried after the server recovered; every 500 page was excluded, never counted as a pass). The 15 not counted are Chromium 844×390 at 125/150/200% for the five data cases: Chromium's full-page capture had switched them to the desktop layout (see "Not findings"). These were re-measured on fresh pages with viewport captures for Owner (125/150/200%) and Manager (125/150%). The Chromium Manager landscape at 200% failed to load twice, and `owner-large`, `manager-empty` and `manager-large` landscape at 125–200% have Firefox and WebKit coverage only.
- Consistency with `/app/employees` was measured in Chromium at 100% only (Owner and Manager, all 8 sizes; Owner 430 and Manager 1024 didn't load and weren't retried).
- The dev server was overloaded by concurrent inspector runs (WR-1). I stopped my own retries while it was failing and re-ran the gaps one at a time once it recovered.
- My pay with payroll off, and a Manager whose scope is "all", can't be produced on this preview without server data changes. Both were checked by code only.

Open P0–P2 in widths and roles: 3

## Round 2

October 19, build `1f29c3b` (the preview's `manager-profile.tsx`, `manager-profile-live.tsx` and `premium-profile.css` are byte-identical to HEAD). Chromium at 320×640, 390×844, 844×390 and 1440×900 at 100/125/150/200% text. WebKit spot checks at the same sizes, 100 and 200%. 360 and 430 at 100 and 125% for WR-3. Data cases: `owner`, `manager`, `owner-large`, `manager-empty`, `manager-large` (12 assigned), plus two new fictional ones of mine, `manager-mid` (4 assigned, including the 75-character name) and `manager-all` (Manager with company-wide scope). Landscape is measured on fresh pages with viewport captures only. Scripts and results: `…/widths/r2/`. A 500 or timeout was retried once. 154 manager-page measurements loaded (Chromium 124, WebKit 30), plus 16 Employee/Lead pages. No Firefox, no shell.

### Round-1 findings

| ID | Status | Evidence |
|---|---|---|
| WR-1 | **Fixed** | `manager-profile.tsx:19-20` no longer calls `readPayrollCapabilities`. It passes `{ enabled: payrollFeatureEnabled() }` to `navigationForRole`. That matches the shell, because `readPayrollCapabilities` returns `enabled: false` exactly when the flag is off and `enabled: true` otherwise (`src/lib/payroll/service.ts:813-827`, `:107`), and My pay in the navigation depends only on `enabled` plus the module (`navigation.ts:128-131`). Server log since the last old-build trace (`next.log` line 39830): 10 statement timeouts, all from `layout.tsx:42` and none from the Profile page; 343 `/app/profile` 200s against 17 500s, where round 1 had 667 500s against 1,527 200s. My pay still shows for Owner and Manager in every case (payroll on). |
| WR-2 | **Fixed** | Assigned lists over five now show "12 locations" and the toggle above the names. `manager-large`, Chromium: "Show all 12" sits at y=793 (320), 703 (390), 615 (844×390) and 644 (1440) at 100%, and at 1,722, 1,591, 970 and 1,214 at 200%. After the tap it is at **the same y** every time, in view and still focused. It opens 12 names, then "Show fewer" brings back 5 (`aria-expanded` true/false). WebKit: same positions. (The button isn't focused after a click there, which is WebKit's normal behaviour for buttons.) The 60-location Owner case no longer lists: "All 60 locations" is one line at every size. |
| WR-3 | **Fixed** | Label 5rem, value basis 8rem. At 100% text all 7 rows keep label and value side by side at 320 (value column 152px), 360 (192), 390 (222) and 430 (262) for Owner and Manager in Chromium and WebKit, and at 125% at 360 (172) and 430 (242). Rows stack only at 200% on phones (320 and 390: value 248 and 318px wide, at the card's text edge, x=36), which is the intended large-text behaviour. At 1440 and in landscape they never stack. |

### New finding

| ID | Page, role, width, browser, text | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR-4 | `/app/profile`, Owner (`owner-large`), 390×844 Chromium 100%; also 320×640 Chromium 200% | Phone value "+1 (787) 555-0100 ext. 4021" | The extension's number breaks away from "ext.". The line ends "… 555-0100 ext." and "4021" sits alone on line 2 (390/100%). At 320/200% it reads "+1 (787)", then "555-0100 ext.", then "4021". Every space is an equal break point, so "ext." and its number are two separate wrap units. WebKit happens to break before "ext." at the same sizes ("555-0100 ⏎ ext. 4021"), so this shows in Chromium, which Android phones use. | `…/widths/shots/crops/WR-4-phone-ext-390.png` | `src/components/manager-profile/manager-profile-live.tsx:90-91` (`number.split(/\s+/)`) | Bind the extension to its number before splitting: `number.replace(/\b(ext\.?|x)\s+(?=\d)/gi, '$1 ').split(/\s+/)`. Each part is an inline-block (`premium-profile.css:99`), so "ext. 4021" then moves as one unit and the line breaks after "555-0100". | P2 |

### Checked and correct (round 2)

- **No sideways overflow, clipping or edge-hugging text** on any of the 154 pages: `scrollWidth` equals the viewport, no element past the edge except the band's decorative SVG, no clamp or ellipsis, no text within 12px of a card edge. No targets under 44px (phones and landscape) or 24px (desktop). Card head never overlaps its meta. Band-to-card gap 16px. One column at 320/360/390/430 and in landscape, two at 1440. Smallest text 15px on phones and in landscape, 14px on desktop, scaling with text size.
- **Landscape 844×390 (fresh page, viewport captures):** phone layout, cards 24–820, labels and values side by side at 100% (value column 676px) and 200% (596px), for Owner, Manager and all data cases in Chromium, and Owner and `manager-mid` in WebKit.
- **Locations:**
  - Owner "All 3 locations" and "All 60 locations" are one line with no Show names.
  - The Manager's company-wide scope (`manager-all`) reads "All 3 locations", one line.
  - Short assigned lists are inline ("Main Office · West Office", one row 53px tall at 390).
  - `manager-mid` (4 names, the first 75 characters) wraps between and inside names within the 222px column and stays inside the card at 320–1440 and 100–200%.
  - `manager-empty` reads "None assigned yet", with "Not added" for email and phone.
- **Contact values:** the 91-character email breaks only after the @ or before dots (and at the domain's hyphens when a part is wider than the line), never mid-word: at 390/100% it reads "maria.jose.rivera.santiago" / ".with.a.long.name@" / "northside-quality-" / "assurance-workforce" / ".example". It is one or two lines at 844 and 1440.
- **Roles:** Owner has "Edit your details", 5 alert switches, My pay, and band summary "Your details, pay and alerts.". Manager has the ask-the-owner note, 4 switches and My pay. The Owner's alert rows follow payroll: with payroll on (this preview) the ready list has 5 and the loading rows are sized for 5. With payroll off the loading rows size for the 4-topic set (`manager-profile-live.tsx:162`, `payrollAlerts` from `manager-profile.tsx:33`). That last part is checked by code only, because payroll can't be switched off on this preview.
- **Employee and Lead:** `AUDIT-E` and `AUDIT-LEAD` get the Phase 3 Profile (`.premium-employee-profile`, 5 detail rows) at 320, 390, 844×390 and 1440 in Chromium and WebKit. None of these pages calls `/api/management/profile`, and none overflows.

### Gaps (round 2)

- Payroll off (My pay hidden, band "Your details and alerts.", Owner with 4 alert rows) can't be produced on this preview, so it's checked by code only.
- WebKit `manager-mid` at 320 didn't load after one retry. Chromium covers it at 320 for 100% and 200%.

Open P0–P2 in widths and roles: 1

## Round 3

October 19, build `7713d75` (the preview's `manager-profile-live.tsx` and `premium-profile.css` match HEAD).
- **Chromium:** 320, 360, 390, 430, 768, 1024 and 1440 at 100/125/150/200% text, and 844×390 (fresh page, viewport captures) at the same text sizes.
- **WebKit spot checks:** 320, 390, 430 and 844×390 at 100 and 200%.
- **Data cases:** `owner`, `manager`, `owner-large`, `manager-empty` and `manager-mid` (Owner and Manager).
- **Employee and Lead:** Chromium at 320, 360, 390, 430 and 844×390, WebKit at 390.
- **Loads:** 182 Profile measurements, no failed loads.
- **Scripts, results and crops:** `…/widths/r3/` and `…/widths/shots/crops/R3-*`.

### WR-4: fixed

"ext. 4021" is now one part (`manager-profile-live.tsx:92-98`) and never splits, in Chromium and WebKit.

| Text size | 320 | 390 | 430 |
|---|---|---|---|
| 100% | "+1 (787) 555-0100" / "ext. 4021" | "+1 (787) 555-0100" / "ext. 4021" | one line |
| 125% | "+1 (787) 555-0100" / "ext. 4021" | "+1 (787) 555-0100" / "ext. 4021" | "+1 (787) 555-0100" / "ext. 4021" |
| 150% | "+1 (787) 555-0100" / "ext. 4021" | "+1 (787) 555-0100" / "ext. 4021" | "+1 (787) 555-0100" / "ext. 4021" |
| 200% | "+1 (787)" / "555-0100" / "ext. 4021" | "+1 (787) 555-0100" / "ext. 4021" | "+1 (787) 555-0100" / "ext. 4021" |

Landscape and 1440 show the number on one line. The extension's number never sits alone.

### New finding

| ID | Page, role, width, browser, text | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR-5 | `/app/profile`, Manager with no email (`manager-empty`), 320, 360 and 390 at 100%, and 430 at 125–150%; also 1024 at 100% (desktop column), Chromium and WebKit | Email row when the value is "Not added" | The 14rem rule stacks the Email row even when it holds the 9-character muted "Not added". The result is "Email" on one line and "Not added" under it at x=36, in a 77px row. Directly below, Phone shows the same "Not added" beside its label at x=132, in a 53px row. Two adjacent rows with identical values use two layouts. The rule exists so an address keeps its parts whole, which doesn't apply to "Not added" (one 63px line). | `…/widths/shots/crops/R3-mgrempty-390-email-stacked.png` | `src/app/app/premium-profile.css:107` (`.pmp-details > [data-row="email"] > dd { flex-basis: 14rem }`) applies to every Email value | Limit the wide basis to rows that show an address. The address parts are `.pmp-part`, so use `.pmp-details > [data-row="email"]:has(.pmp-part) > dd { flex-basis: 14rem }`. Then loading and held rows keep their size (the hidden held value contains `.pmp-part`), and only a ready "Not added" row sits beside its label. Cost: when the read returns no email, that row shrinks once by 24px (77 to 53) as the empty value arrives, only for accounts without an email. Judgment: P2 because it is visible in the card. If the stability owner prefers no shrink, keep the rule and show "Not added" stacked for Phone too, so the two rows match. | P2 |

### The stacked Email row against the other rows and the employee Profile

- **Where it stacks with an address (intended):**
  - 320, 360 and 390 at 100%.
  - 430 from 125%.
  - 1024 at 100%. This is the desktop's two-column layout, where the details column (214px) is narrower than a 390 phone's (222px). It follows the rule as written, though the coordinator's note described it as phones only. Recorded, not filed.
  - 1440 at 200%.
- **Where it sits beside its label:** 430 at 100%, 768 at 100%, 1440 at 100–150%, and landscape at every text size.
- **Line breaks in the stacked row:** the label is at x=36 like every label, and the value starts at x=36 under it, the same position all rows take when they stack at large text. The address breaks only between parts:
  - "owner@northside-qa.example" is one line at 320–390.
  - The 91-character address is "maria.jose.rivera.santiago" / ".with.a.long.name@" / "northside-quality-" / … at 390.
- **Row heights:** 77px for a one-line address against 52–53px for the other rows. The other rows are unchanged from round 2 (value at x=132, side by side at 100% on every phone).
- **Employee Profile (Phase 3, AUDIT-E and AUDIT-LEAD):** no email row; 5 rows, never stacked at 320–430 or in landscape. Labels at x=36 like this page. Values at x=144/160/172/188 (320/360/390/430) against this page's fixed 132, and rows 59–60px against 52–53px. These are the two pages' own geometries and were not changed this round; noted for the alignment owner, not filed.

### Checked and correct (round 3)

- **Overflow and clipping:**
  - `scrollWidth` equals the viewport on all 182 Profile pages.
  - No element past the edge (except the band's decorative SVG).
  - No text clipped or within 12px of a card edge.
  - No targets under 44px (phones and landscape) or 24px (desktop).
  - No head/meta overlap; the head stacks only below 16rem and never collides.
  - Band-to-card gap 16px.
  - Columns: one up to 768, two at 1024 and 1440.
  - Text floor: 15px on phones and in landscape, 14px on desktop.
- **Landscape 844×390:** every row side by side at 100–200%, Chromium and WebKit, for both roles. The phone reads "+1 (787) 555-0100 ext. 4021" on one line.
- **Roles:** Owner has 5 alert switches and Manager 4 (payroll on), and both have My pay. The Owner-without-payroll case hides the payroll topic (`manager-profile-live.tsx:164`, `:177`). That is checked by code only, because payroll can't be switched off on this preview.
- **Employee and Lead:** they get the Phase 3 Profile at every size checked, make zero requests to `/api/management/profile`, and nothing overflows.
- **Background runs:** none of mine are running.

Open P0–P2 in widths and roles: 1

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
