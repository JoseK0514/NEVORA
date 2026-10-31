# Owner experience: visual-craft review (reviewer 1 of 2)

Date: 2026-10-31. Code: frozen Release 1, commit `7b14776a` (`.claude/worktrees/r1-integrate`), served as the owned fictional preview. Owner: QAOWNER (Carmen Ortiz), fictional data only. Nothing was submitted, approved, published, saved or deleted. Menus and sheets were opened and then closed. Where a click opened a form page, I stopped at the form.

Judged against: the corporate boards in `.claude/r1-tools/mock/` (C-Owner, G-O-*, O-*), `corporate-mockups/DESIGN-SPEC.md`, Jose's eight UI rules and the "don't overwhelm" rules. I don't propose replacing the approved direction. Every proposal below either brings the build back to the spec or tightens it within the spec. The few that would change a board token are labelled **needs Jose's OK**.

Evidence root: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-visual/` (written `RV/` below; every path is under that folder).

| Folder | What it holds |
|---|---|
| `RV/d1440/`, `RV/d1440-2/` | Desktop 1440×900, top-level and second-level pages, plus `probe.json` (type, colour, radius, button, icon and layout measurements) |
| `RV/d1024/` | 1024×768 |
| `RV/p390/`, `RV/p390-2/` | iPhone 390×844 at DPR 2 |
| `RV/p320/` | 320×568 |
| `RV/cap/webkit-QAOWNER-light-390x844/` | WebKit at 390 |
| `RV/overlays/` | Menus, sheets and pickers |
| `RV/sheets/` | Contact sheets (side-by-side captures) |

The measurement scripts are in `RV/` too: `probe.mjs`, `fonts.mjs`, `offscale.mjs`, `tokens.mjs`, `icons.mjs`, `hover.mjs`, `h1pos.mjs`, `overlays.mjs`. Their output is quoted below.

---

## 1. Verdict

On the **phone**, the Owner side is close to the approved boards and already reads as calm and corporate. The type is almost entirely on the scale (`offscale.mjs` at 390 found off-scale text only in the Time-exports module), and WebKit matches Chromium (`RV/sheets/webkit-390.png`). Measured against Gusto, the **desktop** is where it stops feeling premium: it is the phone stretched into a 992px column, with older "clean manager" islands showing through. The three biggest things holding it back:

1. **Two typefaces and three generations of tokens on one screen.** About 90% of the text renders in the system font (SF on Mac and iOS, Segoe on Windows) although the kit says Inter. On top of that, the desktop shell, Timecards and the Schedule grid use an older palette: greys #6B6B68, #111 and #222, teal #0B6B67 and #087571, radii of 5, 7, 10 and 20px, and sizes of 12, 12.5, 13.5 and 14px.
2. **Desktop has no page grammar.** The page title sits at 8 different heights (y = 104 to 188) and 5 different x positions. Forms come in four different shapes. Phone-only parts appear on desktop: white Cancel/Save strips, "‹ More" bars, full-width 992px buttons. Rows have no hover state. Single-column lists run 952px from title to chevron.
3. **Status noise instead of hierarchy.** The same pill is repeated on every row: 8× "Off", 6× "Below target", 9× "Not set", 3× "Approved". The phone Schedule shows 10 red elements for one day. Counts are big numbers with small labels ("0" at 22px beside "of 9" at 13px). Bare one-line empty states sit straight on the grey page.

---

## 2. Cross-cutting fixes (kit and shell)

Each fix lists the current value (measured or read from the CSS) and the exact proposed value. A–C are the font, type scale and colours; D–F are page layout; G–K are colour, status, numbers, empty states and buttons; L–Q are icons, phone headers, sheets, motion, avatars and grouping.

### A. One typeface (Rule 2). Severity High, effort S
- **Current.** `fonts.mjs` at 1440 shows page text rendering in `-apple-system` on every page: 25 of 25 nodes on Home, 197 of 197 on Schedule, 46 of 46 on Timecards. The exceptions are H1s and a few labels on q-page pages, which render in Inter (Settings: 6 Inter / 20 system; Profile: 2 / 45). In the sidebar, 4 nodes are Inter and 11 are system.
- **Cause.** `premium-clean-manager.css:8` defines `--cm-sys: -apple-system…`. It is applied by the `[data-nv-clean]…:not(.cm-a)…` rules, which beat `.c-page { font-family: Inter }` (`corp.css:11`). Separately, `corp-shell.css:202,233` forces Inter on q-page headings only. So Settings, Profile, Updates, Templates and the other q-page pages get an Inter H1 above system-font rows. Home, Schedule, Payroll and Team get a system H1.
- **Proposed.** One stack for everything inside `.app-shell[data-nv-corp]`: `Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, sans-serif`. Do this by pointing `--cm-sys` at that stack under `[data-nv-corp]`, which is a one-line override, and dropping the heading-only `!important` at `corp-shell.css:233`. The spec (Oct 26) says "Font Inter (local)". Jose's Oct 23 rule said "system SF". Either is acceptable as long as there is **one**. I recommend Inter because it is the approved spec and renders the same on Windows and Android.

### B. Shell type onto the scale. Severity High, effort S
Measured with `offscale.mjs` at 1440 (`RV/offscale-1440x900.json`). Allowed sizes are 22/600, 20/600, 17/600, 15/400 or 600, 13/400 or 600, and 11 for tab labels.

| Element | Current | Proposed |
|---|---|---|
| Sidebar nav label (`.nav-label`, `corp-shell.css:87`) | 15/20 **500** | 15/20 **400**, #1A1C1E; active 15/600 teal |
| Workspace name (`.cm-org__name`) | **14**/18 600, **#111** | 15/20 600, #1A1C1E |
| Top-bar page label | **13.5**/18 600, **#111** | Remove (see F), or 15/600 #1A1C1E |
| Search trigger | **14**/20.3 400, radius **7**, keycap radius **5** | 13/18 400 #6B7075, radius 8, keycap radius 6 |
| Account name | **14**/14 500 | 15/20 400 |
| Account avatar initials | **12**/600, #07605F | 13/600 (kit `.c-av`) |
| "Powered by VELANI LLC" | **14**/400 | 13/18 #6B7075, or remove from the app chrome (Rule 6: it has no job for the Owner) |
| Section tabs (Payroll) `.section-tab` | **13.5**/500, #6B6B68 | Becomes the kit `.c-seg`, or 15/400 tabs with a 2px teal underline (see D) |
| Sidebar group label "More" | 13/600 | Keep |

### C. Retire the older palette inside the corporate shell. Severity High, effort M
From `tokens.mjs` (off-token colours and radii, with the class that carries them):
- **Desktop Timecards** (`cm-tc-*`):
  - text greys are #6B6B68 (`.nv-stat__label`, `TH`, `.cm-num`, `.cm-tc-of`) and inks are #111 or #222;
  - amber is #93500A (`.cm-tc-status`) where the spec says #8A4B00;
  - the "Refresh" teal is #0B6B67 where the spec says #0B6E69;
  - card radius is **10px** (`.cm-tc-stats`, `.cm-tc-table-box`) where the spec says 12;
  - controls are 7px radius and 30px tall (`.cm-tc-kbtn`);
  - avatars are grey gradient discs with white 11px initials.
- **Schedule grid** (`cm-grid`, `cm-block`):
  - text is #111 and #6B6B68;
  - blocks have a 5px radius (×44);
  - shift text is **12**/500 (×44), avatars are **10.5**/600 at a 20px radius, the open-shift icon tile has a 13px radius, and the "Mon 26" headers are 12px.
- **Top bar**: radius 7 (`.command-finder-trigger`), the Timecards date picker has radius 10, and `.cm-insights__button` has radius 7.
- **Proposed.** Remap the `cm` variables to the corporate tokens under `[data-nv-corp]`:

  | Variable | New value |
  |---|---|
  | `--cm-label` | #6B7075 |
  | Ink | #1A1C1E |
  | Tint | #0B6E69 |
  | Card radius | 12 |
  | Control radius | 8 |
  | Block radius | 6 |
  | Grid text | 13/18 (shift chips 13/600, time 13/400) |
  | Avatars | `.c-av` 32px, #EDEEEF on #4A4F54 |
  | Table head | 13/600 #4A4F54 |
  | Table cells | 15/400 |

  Spec values only; no new tokens.

### D. One desktop page header and one title position. Severity High, effort M
`h1pos.mjs` at 1440 measured the title (H1) top edge and left edge on each page.

**Title top (y):**

| y | Pages |
|---|---|
| 104 | Home, Inbox, More, Settings, Insights, Templates, Hours this week, Who's working |
| 106 | Team |
| 108 | Person |
| 112 | Schedule, Timecards |
| 119 | Edit shift, Build and publish (17px titles) |
| 134 | Pay history (a "‹ Payroll" link sits above it) |
| 169 | Time exports (under section tabs) |
| 177 | Payroll (under section tabs) |
| 188 | Profile (under a white "‹ More / Edit" strip) |

**Title left (x):** 340 for most pages. The exceptions are 403 (Add employee), 416 (Profile, beside a 56px avatar), 768 (Publish) and 801 (Edit shift), where the title is centred.

**Proposed desktop header, used by every page:**
- Optional row 1: a 13/600 teal "‹ Section" back link, 20px tall. Use it on every pushed page or on none; today only the Payroll sub-pages have it.
- Row 2: the H1 at 22/28 600 −0.3, **y = 104**, x = the column's left edge, with actions right-aligned in the same row (`.c-title__actions`).
- Row 3: the 13px subtitle.
- Section tabs (Payroll) go *under* the title as a `.c-seg` or 15px underline tabs, never above it. That moves the Payroll title from y = 177 to 104.

### E. Desktop forms: one pattern instead of four. Severity High, effort M
Today the forms take four shapes:
- **Phone white strip.** A 1024px "Cancel · Title · Add" strip at x = 324, 16px *wider* than the 992px column on each side, with bare fields beneath. Seen on New location, New update, Clocker PIN and the Profile header (`RV/d1440-2/app_settings_locations_new-0.png`, `RV/d1440/app_profile-0.png`). Field labels there are 15/400 grey, not the spec's 13/600 #4A4F54.
- **Centred 720px card** with "Cancel · Edit shift · Save" inside *and* a full-width "Save changes" plus a full-width red "Delete shift" (`RV/d1440-2/app_schedule_edit_shiftId_pv_2026_10_26_0-0.png`).
- **Centred 380px card** (Build and publish, `RV/sheets/d2-a.png`).
- **Wide card** with Cancel and the title inline at the left and "Next" at the right (Add employee, `RV/sheets/d2-f.png`).

**Proposed.** On desktop a form is a normal page:
- the standard header from D (title "Edit shift", back link "‹ Schedule");
- one card of 640px maximum width, left-aligned with the title;
- fields at 48px with 13/600 labels and 16px gaps (`.c-form`);
- a card footer, right-aligned, with "Cancel" as a secondary button (auto width) and "Save" as primary (auto width, minimum 120px);
- destructive actions as a 15/600 red text button at the far left of that footer, never a second full-width bar;
- the phone Cancel/Save strip hidden at 768px and above.

### F. Desktop width and use of space. Severity Med, effort S
- **Current.** Every list, settings and detail page fills the 992px column (`.c-page` max 1040px minus 24px padding each side). On Team, Inbox and Settings the row title starts at x = 356 and the chevron or value sits at x = 1308, so the eye travels 952px per row (`RV/d1440/app_settings-0.png`, `RV/d1440/app_employees-0.png`). Home uses 424 of 900px of height (content bottom 424), so the bottom 53% is empty (`RV/d1440/app-0.png`).
- **Proposed.**
  - Add a `.c-page--narrow` that caps content at **720px**, left-aligned (not centred), so the title stays at x = 340. Use it for Team, Inbox, Settings, the Settings sub-pages, Person, Profile, More, Scheduling rules, Payroll settings, Pay history, Time exports and every form.
  - Keep 992px only for real two-dimensional content: Home's two columns, the Schedule week grid, the Timecards table, Insights.
  - Remove the top-bar page label when the H1 is present. Today it repeats the H1 or contradicts it: "Time" vs "Timecards", "Team overview" vs "Hours this week", "Attendance" vs "Who's working", "Schedule activity" vs "Activity", "Templates" vs "Week templates". On More it is missing, so "Search" becomes the first item. Gusto shows the title once.

### G. Desktop interaction states. Severity Med, effort S
- **Current.**
  - `hover.mjs`: hovering a Home to-do row changes nothing (background stays `rgba(0,0,0,0)`), and the row has `transition: all`.
  - `corp.css:61` gives `a.c-row` and `button.c-row` only `:active { background:#F7F8F8 }`.
  - Sidebar links do have a hover (#F5F6F6, 160ms).
- **Proposed.** Add `@media (hover:hover){ a.c-row:hover, button.c-row:hover { background:#F7F8F8 } }` and replace `transition: all` with `transition: background-color 120ms ease-out`. The active state can stay as it is. Focus is already good: a 2px teal ring inset by −2px (`corp.css:284`).

### H. Teal discipline. Severity Med, effort S
`probe.json` counts of teal-coloured text plus teal fills per screen:

| Screen | Teal elements |
|---|---|
| Home, desktop | 10 (sidebar badge 5, Find cover, three row count badges, 3 teal links) plus the active nav item and 2 teal avatars |
| Team | 12 (8 teal avatars, Add, Show all 9, …) |
| Hours this week | 13 |
| Pay history, phone | 15 (View and Download ×6) |
| Scheduling rules, desktop | 16 |
| Insights | the bar chart in teal |

**Proposed.** Within the spec, teal stays for buttons, links, the active tab and the sidebar badge.
- Avatars become the spec's neutral variant (#EDEEEF / #4A4F54) everywhere.
- Repeated per-row text actions (View / Download, Prepare ×3) become one row with a chevron, or a single "…" menu.
- **Needs Jose's OK:** counts inside rows (Home "Things to do", More to review) become neutral badges, #EDEEEF with #1A1C1E 13/600, and only the sidebar or tab total stays teal. Chart bars become #4A4F54, with teal for the current day only.

### I. Status colour and pills. Severity High, effort S
- **Current.**
  - Team shows an "Off" pill on all 8 rows (`RV/d1440/app_employees-0.png`).
  - Hours this week shows 6 amber "Below target", 1 "Above target", 1 teal "On target" and 1 grey "Not set" (`RV/d1440/app_view_team-0.png`).
  - Employee PINs shows "Not set" ×9 (`RV/sheets/d2-d.png`). Payroll shows "Approved" ×3. Timecards on the phone shows amber "Needs review" ×3.
  - Phone Timecards adds a **blue** "Open until Sunday" pill, a fourth status hue on the screen (`RV/sheets/p390-a.png`).
  - The phone Schedule for one day has 3 red-outlined cards, 3 red "Open shift" labels, 3 red dashed "+" circles and 1 red "No clock-in" pill, so 10 red elements (`RV/p390/app_schedule-0.png`). Jose's rule is red at most once per screen.
- **Proposed.**
  - Show a pill only for the exception, never for the default state. Drop "Off", "Approved" (when every row is approved) and "Not set" (when all are not set); put the count in the card header ("All 9 not set"). On Hours this week, write the variance as plain 13px detail text ("8 h under") and keep at most one pill colour.
  - Replace the blue "Open until Sunday" with the neutral pill.
  - Schedule:
    - Keep the red outline on the first open shift only; the rest become 1px #E3E5E6 rows with "Open shift" at 15/600 ink and the "+" circle in #A7ACB1.
    - Or collapse the open shifts into one red-outlined row, "3 open shifts today · Find cover".
    - The board shows a single red row, so either option matches it.

### J. Rule 4: no big number with a small context. Severity Med, effort S
- **Current.**
  - Desktop Timecards shows "0" at 22/600 next to "of 9" at 13/400 #6B6B68 (`.cm-tc-of`, `RV/d1440/app_timecards-0.png`).
  - Insights shows "24.1 h" at 20/600 next to "recorded" at 13/400 (`RV/d1440/app_reports-0.png`).
  - The stat strip on Timecards desktop puts four 22px numbers side by side.
- **Proposed.** The number and its context at one size: "0 of 9 approved" at 17/600, as the phone Timecards already does (`RV/sheets/p390-a.png`), and "24.1 h recorded" at 17/600. Stat values use the spec's 17/600 (`.c-stat__value`), never 22.

### K. Empty states. Severity Med, effort S
- **Current.** A bare 15px line straight on the #F5F6F6 page, with no card and no next step:
  - Updates: "No updates yet." (`RV/sheets/p2-d.png`);
  - Shift requests: "You're all caught up." (`RV/sheets/d1440-e.png`);
  - Notifications: "No notifications yet." (`RV/sheets/ov-p1.png`);
  - My pay: "No statements yet…";
  - Payroll People and Fix: "This payroll isn't available…" in a lone card (`RV/sheets/d2-c.png`).
- **Proposed.**
  - **Kit `.c-empty` inside a `.c-card`.** Padding 32px 16px, centred, with a 15/600 #1A1C1E line ("No updates yet") and a 13/18 #6B7075 line ("Updates you send appear here.").
  - **Next step.** At most one secondary 40px button ("New update"). No illustration and no icon tile, per Jose's rule.
  - **Lists with a segmented control.** The empty card sits 12px under the control.

### L. Buttons. Severity Med, effort S
- **Current.** Heights are consistent at 44px, which is good. But on desktop many buttons are full-width bars:
  - Check: 992px (Clocker recovery);
  - Prepare draft: 960px;
  - Create export: 960px, disabled;
  - Set up a new tablet: about 970px;
  - Sign out: a red outline 992px wide on both More and Profile;
  - Save changes: 672px.

  Other problems:
  - **Duplicate save on Edit shift**, on both phone and desktop: the header "Save" *and* a full-width "Save changes". Two primaries on one screen.
  - **Mixed controls in the Payroll title row**: an underlined "Settings" text link sits beside a "Pay history" neutral button (`RV/sheets/p390-b.png`).
  - **Unstyled browser buttons**: the Schedule "…" menu contains a "Set deadline" button with the user-agent style (background rgb(239,239,239), radius 0, 15/400), found ×15 in the hidden Scheduling-rules panels. It sits beside a native `datetime-local` input showing "mm/dd/yyyy, --:-- --" (`RV/sheets/ov-d2.png`, `RV/sheets/ov-p1.png`).
- **Proposed.**
  - At 768px and above, `.c-btn--full` becomes `width:auto; min-width:160px`, right-aligned in its card footer. Phones keep full width.
  - Sign out becomes a 15/600 red text row in the last card (as iOS Settings does), not an outlined bar, and is not repeated on Profile.
  - Remove "Save changes" when the header has Save (phone), or remove the header Save (desktop, per E).
  - "Settings" in the Payroll title row becomes a second neutral 32/44px button identical to "Pay history", or moves into the section tabs.
  - The Schedule menu's deadline becomes a row ("Availability deadline · Not set ›") that opens the existing deadline page. No inline native input.

### M. Icons (Rule 1). Severity Low, effort S
- **Current.** `icons.mjs` at 1440:
  - Sizes on one screen are 22 (bell, sidebar toggle), 20 (nav), 18 (search), 16 (chevrons), 14 (account chevron), 13 (Timecards controls) and 12 (schedule lead marker).
  - The account-menu chevron (`nevora-action-menu-chevron`) and select chevron (`nevora-select-chevron`) are **not Phosphor**: a 16-unit viewBox with a 1.6 stroke. `corp.css:162` draws the `select.c-in` chevron as a data-URI Lucide-style path (`m6 9 6 6 6-6`, stroke 2).
- **Proposed.**
  - **Sizes.** Shell icons (nav, bell, sidebar toggle) at 20px. The search glyph inside its control and every inline chevron or caret at 16px. The tab bar stays at 22px. Nothing at 12–14px.
  - **Glyphs.** Phosphor `CaretDown` regular replaces both custom chevrons and the data-URI.

### N. Phone pushed-page headers. Severity Med, effort M
- **Current.** Three variants:
  - **(a) Kit `.c-nav`**: back on the left, title centred at 17/600. Used by Person, Payroll settings, Pay history, Things to do.
  - **(b) Title left-aligned against the back label**: "‹ Settings  Punch photos", "‹ Schedule  Week templates", "‹ Things to do  Time off request" (`RV/sheets/p2-c.png`, `RV/sheets/p2-d.png`).
  - **(c) A back-only bar plus a 22px large title below**: Updates, My pay, Availability, Notifications.

  Bar heights are 52px and 60px.
- **Proposed.** (a) everywhere: a 44px row at safe-area + 8px, the title centred at 17/600 with a 220px maximum width, and the action at the right.

### O. Sheets and pickers. Severity Med, effort M
- **Current.**
  - The phone Schedule "…" and "All locations" sheets are inset cards with no title, closed by a grey "× Close" pill (`RV/sheets/ov-p1.png`). The spec's sheet is a white top sheet with radius 16, a 36×5 grabber and a 52px "Cancel · Title · Done" header.
  - The locations picker shows no checkmark on the current choice. The desktop dropdown shows none either (`RV/sheets/ov-d2.png`). The Insights period dropdown does show one.
  - The Schedule menu mixes a title-and-detail item, a neutral button, an icon item and a form.
- **Proposed.**
  - Use the spec sheet: the header "Schedule options" or "Location", rows of `.c-row--one` (52px) with a 16px teal Phosphor `Check` on the current option.
  - On desktop, the same rows in a 280px popover with the 12px radius, ring `0 0 0 1px #E3E5E6` and shadow `0 8px 24px rgba(26,28,30,.10)` that `corp-shell.css:218` already uses.

### P. Motion (Rule 8). Severity Low, effort S
- **Current.** Across the loaded CSS there are 16 distinct durations: 110, 120, 150, 160, 180, 200, 220, 240, 300, 320, 560, 600 and 900ms, plus .16s and .18s. Easings are 48× `ease-out`, 25× `ease` and two different custom curves. Rows use `transition: all`.
- **Proposed.** Three tokens:

  | Token | Duration | Easing | Used for |
  |---|---|---|---|
  | `--c-dur-press` | 120ms | `ease-out` | Hover and press |
  | `--c-dur-ui` | 200ms | `cubic-bezier(.32,.72,0,1)` | Switch, popover, segmented control |
  | `--c-dur-sheet` | 280ms in / 200ms out | same curve | Sheets |

  Under `prefers-reduced-motion`, keep opacity fades at 120ms and remove transforms. The kit already does this for buttons and switches (`corp.css:211`); extend it to sheets and popovers.

### Q. Avatars and grouping. Severity Low, effort S
- **Avatars.** Today there are four treatments:
  - 32px teal tint (Team);
  - 24px grey gradient with white 11px initials (Timecards, desktop);
  - 26px at a 20px radius with 10.5px initials (Schedule grid);
  - 56px at a 28px radius (Profile).

  Use one: `.c-av` 32px in rows and 36px in headers, #EDEEEF on #4A4F54 at 13/600.
- **Card inside a card.** Profile's "Face ID and passkeys" is a nested card (`.nv-card.pk-section`, radius 10, a 13.5/600 header, its own ring) inside the rows card (`RV/d1440/app_profile-0.png`). Make it a normal row: "Face ID and passkeys · Add ›".
- **Section labels.** Settings puts 13/600 group labels outside the cards. Elsewhere the label is the card's 44px header. Use the card header everywhere.
- **Bold rows.** Settings rows are all 15/**600** (×15), while More rows are 15/400. Per the spec, 600 is only for a row's main label when it has a detail line. Make Settings rows 15/400.

---

## 3. Page-by-page findings

Severity: H = High, M = Med, L = Low. Effort: S, M, L. Paths are relative to `RV/`.

### Home
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| Desktop uses 47% of the height; two half-width cards (488px) and a lone Payday card (488px) leave the right column ragged | `d1440/app-0.png`, content bottom 424 of 900 | Keep the 2 columns. Move Payday into the right column above Things to do so both columns end level | M | S |
| 10 teal elements (the three count badges plus Find cover, links and the sidebar badge) | `probe.json` /app: tealText 5, tealFill 5 | Neutral row counts (H, needs Jose's OK) | M | S |
| Rule 4: "0 of 1" is fine, but "1" (red) and "3" (amber) sit alone with 13px labels above | `d1440/app-0.png` | Acceptable per board C-Owner. No change in R1 | L | – |
| Title is "Welcome back, Carmen" while the top bar says "Home" | `h1pos` | Remove the top-bar label (F) | L | S |
| 1024: fine, single column 680px | `sheets/d1024-a.png` | – | – | – |

### Schedule
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| Phone: 10 red elements for one day | `p390/app_schedule-0.png` | Red outline on one row, or one summary row (I) | H | S |
| Desktop grid on the older palette: 12px/500 shift text ×44, 5px radius blocks, #111 / #6B6B68, 10.5px avatars, 24 red dashed open-shift outlines | `d1440/app_schedule-0.png`, `tokens.mjs` | Remap to corporate tokens (C). Open-shift blocks get a 1px #B42318 ring and white fill only, with the dash removed | H | M |
| "…" menu: native datetime input, user-agent "Set deadline" button, four item styles | `sheets/ov-d2.png`, `sheets/ov-p1.png` | Rows-only menu (O, L) | H | S |
| Locations picker has no checkmark and no title | `overlays/d-locations.png`, `overlays/p-locations.png` | O | M | S |
| "Publish" is outlined secondary even as the page's one main action (the board shows it filled) | `d1440/app_schedule-0.png` vs `mock/G-O-Schedule.png` | Filled when there are unpublished changes; hidden or neutral when "Published" | M | S |
| 1024 shows the phone day list instead of the week grid | `sheets/d1024-a.png` | OK for R1. Note for Reviewer 2 | L | – |

### Time (Timecards)
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| **1024: the "Recorded" (hours) column is missing**, and the header fill and row dividers stop about 140px short of the card edge | `sheets/crop-time-1024-table.png`, `d1024/app_timecards-0.png` | Give the table `width:100%` and keep Recorded; hide Breaks first below 1100px | H | S |
| Desktop is an older component: 10px card radius, 7px controls, 12.5 / 13.5px text, #6B6B68, amber #93500A, grey gradient avatars | `tokens.mjs`, `offscale-1440x900.json` | C | H | M |
| Rule 4: "0" at 22px next to "of 9" at 13px; four 22px stats | `d1440/app_timecards-0.png` | J | M | S |
| Two period controls: the top-bar "‹ This week · Oct 26 – Nov 1 ›" and the in-page "This week / Last week" segmented control (at 1024 the stepper moves into the page) | `d1440/app_timecards-0.png`, `sheets/d1024-b.png` | Keep one: the segmented control on the page | M | S |
| Phone and desktop are different designs: phone has a summary card and list, desktop a stat strip, tabs and a table | `sheets/p390-a.png` vs `d1440` | Desktop: phone summary card on top (17/600 "0 of 9 approved" plus progress bar), then the table | M | M |
| 320: names truncated ("Alexandra …", "Jordan Torr…") by the "Needs review" pills | `sheets/p320-a.png` | Pill removed (I), or pill moves to the detail line | M | S |
| Select mode: "Approve selected" in faint text, a disabled full-width button, helper text wrapping to 2 lines | `sheets/ov-p1.png`, `overlays/d-time-select.png` | One 13px line, "0 of 9 selected"; the action button stays hidden until something is selected | L | S |

### Payroll (hub, history, prepare, details, people/fix, Time exports, settings)
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| Section tabs sit above the title (y = 102), pushing the H1 to y = 177; the tab line runs 1040px, wider than the 992px content | `d1440/app_payroll-0.png` | Tabs under the title (D) | H | S |
| An underlined "Settings" link next to a neutral "Pay history" button; "Payroll settings" is also a tab | `d1440/app_payroll-0.png` | L | M | S |
| "Approved" pill ×3 on every recent run | same | I | M | S |
| Pay history: each statement has 2 bold lines, 3 detail lines and two teal text links (15 teal elements on the phone); filenames wrap at 320px | `sheets/p2-c.png`, `p320/app_payroll_history-0.png` | One row per statement: "Alexandra Rivera · Oct 12 – 18" with a 13px detail line "Correction · Revision 1", and a chevron to a detail page with Download | M | M |
| Prepare: a 960px teal bar plus "Prepare" ×3 as teal list actions | `sheets/d2-b.png` | Auto-width primary (L). List rows open the period ("›") | M | S |
| "‹ Payroll" back link above the title appears only on Payroll sub-pages | `sheets/d2-b.png`, `sheets/d2-c.png` | D | L | S |
| Time exports: a 960px disabled bar, a radio, an amber line and helper text inside one card | `d1440/app_payroll_export-0.png` | Disabled button auto-width, right. Amber line becomes `.c-callout` above the button | M | S |
| Time exports module: 11px column numbers, 12px legends ×27, 14/600 buttons | `offscale-1440x900.json` | Onto the scale (13/600 labels, 15/600 buttons) | M | M |
| Payroll settings: clean; matches the kit | `sheets/d2-d.png` | Width cap (F) | L | S |

### Team (list, person, edit/add, PIN, Hours this week, Help someone sign in)
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| "Off" pill on all 8 rows; 8 teal avatars | `d1440/app_employees-0.png` | I, H | H | S |
| "Show all 9" when 8 are shown and only one is hidden | same | Show all 9 when there are 12 or fewer | L | S |
| 992px rows (952px eye travel) | same | F | M | S |
| Person: "Off" pill in the card header; teal outlined phone and message buttons are fine | `d1440-2/app_employees_AR0142-0.png` | Drop the default "Off" | L | S |
| Add employee (desktop): Cancel and the title inline at the left, Next at the right, inside a 1040px card; the title at x = 403 | `sheets/d2-f.png`, `h1pos` | E | M | M |
| Clocker PIN: phone strip; 28/34 name heading (off scale); grey filled PIN boxes | `sheets/d2-f.png`, `probe` h1 28px | E. Name at 22/600. PIN boxes white with a 1px #D5D8DA ring (the input token) | M | S |
| Hours this week: top bar says "Team overview"; 6 amber pills; "Availability 0 of 6" | `d1440/app_view_team-0.png` | F, I | M | S |
| Account and Clocker recovery: full-width 992px buttons; 20/550 hidden headings (weight 550 is off scale) | `sheets/d1440-c.png`, `sheets/d1440-d.png`, `offscale` | L. Weight 600 | L | S |

### Things to do (Inbox) and its children
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| Lowercase "all day" as a row title, next to "12:00 AM – 8:00 AM" and "2:00 PM – midnight" | `d1440/app_inbox-0.png` | "All day" | L | S |
| Time format differs from Schedule's "12a – 6a" | same vs `d1440/app_schedule-0.png` | One format per density: rows "12:00 AM – 8:00 AM", the grid "12a – 6a" (documented) | L | S |
| More to review: teal count badges ×5 in rows | `sheets/d2-h.png` | H (needs Jose's OK) | L | S |
| Time-off detail: clean; Decline/Approve as a split pair is OK (a detail page, not a list) | `sheets/d2-h.png` | Desktop buttons auto-width, right (L) | L | S |
| Shift requests and Time off lists: bare empty line; full-width segmented control 992px | `sheets/d1440-e.png` | K. Segmented control max 480px | M | S |
| Availability: clean list; 6 teal avatars | `sheets/d1440-a.png` | H | L | S |
| Phone pushed headers (b) on Time-off detail and Availability | `sheets/p2-c.png`, `sheets/p2-d.png` | N | M | S |

### Clocker setup (Settings › Clocker tablets, Employee PINs, Punch photos)
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| Punch photos is an older form: 17.55px headings outside cards, a horizontal rule, 4 separate checkbox cards in a 2×2 grid, a grey-ring 44px "Review punch photos" button; on the phone the cards run edge to edge (0px gutter instead of 16) | `sheets/d2-g.png`, `sheets/p2-c.png`, `offscale` 17.55/600 | Rebuild on the kit: one card "Which punches need a photo?" with 4 switch rows (51×31), a "Keep photos for" field and a 16px gutter | H | M |
| Clocker tablets: "Needs setup" amber ×2; grey numbered step circles; a 970px teal bar | `sheets/d2-j.png` | One amber pill is fine. Steps as plain 15px rows with "1." text. Button auto-width (L) | M | S |
| Employee PINs: "Not set" ×9 | `sheets/d2-d.png` | I: header "9 not set", no row pills | M | S |

### Settings hub and sub-pages
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| All row titles bold (15/600 ×15); labels outside the cards | `d1440/app_settings-0.png`, `probe.json` | Q | M | S |
| H1 in Inter, rows in the system font | `fonts.mjs` /app/settings | A | H | S |
| Branding: a teal "Save" text link at top right plus a full-width teal "Clock in on the Main Street tablet" preview button; the preview's teal reads as the page's action | `sheets/d2-i.png`, `sheets/p2-b.png` | Preview card inside a 1px dashed #D5D8DA frame labelled "Preview", with the preview button `pointer-events:none`. Save as a primary button in the title row | M | S |
| Branding "Upload": a 32px outlined button inside a row (a third button size in the row) | same | A "Upload ›" value-and-chevron row | L | S |
| Positions: helper text at 13px under the card spans 992px | `sheets/d2-i.png` | F | L | S |
| New location: phone strip; 15/400 grey labels; bare 992px fields | `d1440-2/app_settings_locations_new-0.png` | E | H | M |
| Features and words: clean; teal switches OK | `sheets/d2-g.png` | F | L | S |
| Scheduling rules: the "Rules" card header has no divider under it (other cards do) | `d1440/app_schedule_settings-0.png` | `.c-card__head` inset shadow | L | S |

### Profile / account (Profile, My pay, Notifications, Delete account)
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| Desktop shows the phone white "‹ More / Edit" strip (x = 324, 1024px wide), the H1 at x = 416 / y = 188 beside a 56px avatar | `d1440/app_profile-0.png`, `h1pos` | D: H1 "Carmen Ortiz" at x = 340, y = 104, "Edit" in the title row, a 36px avatar in the first card | H | S |
| Face ID as a card inside a card | same | Q | M | S |
| Phone number unformatted "7875550100" (Person shows "(787) 555-0142") | `d1440/app_profile-0.png` | Format as on Person | M | S |
| Full-width red "Sign out", here and again on More | `d1440/app_profile-0.png`, `d1440/app_more-0.png` | L | M | S |
| My pay: no cards; bare text on the page | `sheets/d1440-d.png`, `sheets/p2-d.png` | Kit card "Next payday · Tue, Nov 3" plus K | M | S |
| Notifications: bare "No notifications yet." | `sheets/ov-p1.png` | K | M | S |
| `/app/profile/calendar`, `/passkeys` and `/device-alerts` render the Profile page unchanged | `d1440-2/app_profile_*` | For Reviewer 2: deep links don't open their section | L | – |

### More, Insights, Updates, Activity, Who's working
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| More (desktop) repeats the sidebar (Insights, Updates) and has no top-bar label | `d1440/app_more-0.png` | For Reviewer 2. Visually: F width cap | L | S |
| Insights: two period controls with different options (top-bar dropdown "This week so far / Last week / Last 30 days / Custom" and the segmented control "This week / Last week / Month") | `sheets/ov-d3.png` | Keep the segmented control only | H | S |
| Insights: "24.1 h recorded" big and small; "—" values; bars labelled "0" with a teal underline for empty days | `d1440/app_reports-0.png` | J. Empty days get no bar and no "0", only a #EDEEEF baseline. The day labels are enough | M | S |
| Insights at 320: stat labels wrap to 2 lines ("Late clock-ins", "Cover filled") | `sheets/p320-b.png` | 2 columns at 340px and below, or shorter labels ("Late", "Covered") | M | S |
| Updates: "+" icon-only title action; bare empty line; segmented control 992px | `sheets/d1440-b.png`, `sheets/p2-d.png` | "New update" secondary button with a text label; K | M | S |
| Compose: phone strip on desktop, 15/400 labels, fields outside a card while the options are in a card | `sheets/d2-e.png` | E | M | M |
| Activity: grey round icon tiles on every row (rule: no icon tiles); "Coverage gap at …" repeated ×9 | `sheets/d1440-c.png` | Remove the tiles. Group gaps: "9 coverage gaps · Tue, Oct 27 ›" | M | S |
| Who's working: "Live" teal pill; empty "No one is clocked in right now." | `sheets/d1440-b.png` | Fine | L | – |

### Shell (desktop sidebar and top bar; phone header and tab bar)
| Problem | Evidence | Fix | Sev | Eff |
|---|---|---|---|---|
| Off-scale shell type: 15/500 nav, 14px org name and search, 13.5px label, 12px avatar | `offscale-1440x900.json` | B | H | S |
| Top-bar icons at 22 / 18 / 14px plus a non-Phosphor chevron | `icons.mjs` | M | L | S |
| "Powered by VELANI LLC" pinned at the bottom of the sidebar at 14px | `d1440/app-0.png` | B | L | S |
| Phone header and tab bar match the boards; Chromium and WebKit identical | `sheets/webkit-390.png` | – | – | – |
| Bell has no unread dot although 5 to-dos are open (board C-Owner shows a #D92D20 dot) | `p390/app-0.png` vs `mock/C-Owner.png` | Confirm whether the dot means unread notifications or to-dos; show it per the board | L | S |

---

## 4. Top 10 upgrades (premium impact per effort)

| # | Upgrade | Fixes | Sev | Eff |
|---|---|---|---|---|
| 1 | **One typeface.** Point `--cm-sys` at the Inter stack under `[data-nv-corp]` and drop the heading-only Inter override. Every page then renders in one family | A | H | S |
| 2 | **Desktop shell on the scale.** Nav 15/400 (active 600), org 15/600, search 13px with radius 8, icons 20/16, #111 and #6B6B68 replaced with #1A1C1E and #6B7075, the duplicate top-bar title removed | B, F, M | H | S |
| 3 | **Remove default-state pills and the red flood.** No "Off", "Approved" or "Not set" on every row; one red open-shift row on Schedule; no blue pill | I | H | S |
| 4 | **Desktop row hover plus a 720px list width.** `a.c-row:hover #F7F8F8 120ms` and `.c-page--narrow` for list, settings, detail and form pages | G, F | M | S |
| 5 | **One desktop page header.** H1 at y = 104, x = column left edge, actions in the title row, Payroll tabs under the title, the phone strips (Profile, New location, Compose, PIN) hidden at 768px and above | D | H | M |
| 6 | **Timecards desktop table and Schedule grid repainted on corporate tokens**, and the missing Recorded column at 1024 fixed | C, Time row 1 | H | M |
| 7 | **Desktop buttons and the Schedule menu.** No full-width bars at 768px and above, one Save per form, Sign out as a red text row, user-agent button and native datetime removed from the "…" menu | L, O | M | S |
| 8 | **Rule 4 numbers.** "0 of 9 approved" and "24.1 h recorded" at 17/600; stats at 17/600 | J | M | S |
| 9 | **Empty-state card** for Updates, Shift requests, Notifications, My pay and Payroll People/Fix | K | M | S |
| 10 | **Phone pushed headers and sheets unified on the kit.** Centred 17/600 nav; sheets with a 52px titled header and a checkmark on the current option | N, O | M | M |

Next after these:
- Punch photos rebuilt on the kit (H, M).
- Neutral avatars and row counts, which **needs Jose's OK** (H, Q).
- Motion tokens (P).
- Profile's nested Face ID card (Q).

---

## 5. Not checked

- **Viewports.** 1920 was not captured. 1024 was checked for 10 pages only. 320 was checked for 13 pages. WebKit was checked at 390 only, for Home, Schedule, Timecards, Payroll, Team and More, and matched Chromium. No WebKit desktop.
- **Overlays.**
  - Not reached by my selectors: the desktop bell popover, the desktop Timecards period dropdown, and the phone avatar tap that opens More. I reviewed `/app/more` directly instead.
  - Not opened on purpose: confirmation dialogs (Publish, Approve, Delete shift, Sign out, Prepare draft, Create export), because that would mean starting a submit. I saw the forms and detail pages that lead to them.
- **States.**
  - Loading states (skeletons or spinners) were not captured: every capture waited for network idle.
  - Error states and validation states were not triggered, because that needs a submit.
  - The Schedule draft state ("Draft · 3 changes", filled Publish) was not seen: the fictional week is fully published.
  - Payroll People and Fix showed "This payroll isn't available…", so their real layouts were not seen.
  - Updates, Shift requests, Notifications and My pay statements were all empty in the fixture.
- **Keyboard and reduced motion.** Keyboard focus was reviewed from the kit CSS (a 2px teal ring, inset inside cards), not tabbed through page by page. Reduced motion was reviewed from the CSS: captures from `cap.mjs` ran with `reducedMotion: reduce` and those from `probe.mjs` without it. No live motion timing was recorded.
- **Other pages.**
  - The Clocker kiosk (`P-ClockerKiosk`) was not checked: it is the iPad clock-in surface, not an Owner page.
  - Dark mode was not checked: it is out of scope for Release 1.
  - `/app/ai-manager` returns the "There's no page here" page for the Owner. It isn't in the Owner sidebar; noted for Reviewer 2.
  - Settings › Breaks, Company policies and Company profile (workspace) were captured (`d1440-2/`) but only skimmed. They use the same q-page frame as the other Settings pages, so findings A, D, F and Q apply to them.
