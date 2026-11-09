# Wave C inspection, round 1: type, colour and copy

October 19, 2026 · Inspector: type, colour and copy · Preview `http://127.0.0.1:49855` (fictional data) · Source: worktree `p35-wave-c-93e13c`, read only. I changed no code or data and didn't sign out. Every submission was aborted in the browser or answered by a mocked response. The one exception was the Clocker recovery "well-formed unknown reference" check, which is a read.

## Verdict

**Not ready. 0 P0, 8 P1 and 17 P2 findings.**

**What holds.** At 100% text, every Wave C element uses a kit role, on phone and on desktop:

| Element | Phone | Desktop |
|---|---|---|
| Body | 17/24 | 16/24 |
| Row | 17/22/500 | 16/22/500 |
| Callout | 15/20 | 14/20 |
| Label | 15/20/500 | 14/20/500 |
| Headline | 17/22/600 | 16/22/600 |
| Title | 30/36 | 32/40 |

- **Type floor.** No Wave C text is below the floor (15px on phones, 14px on desktop).
- **Contrast.** All enabled text measures 4.5:1 or more. The lowest is 5.14:1 (muted text on the inset fill).

**Where it breaks:**

- **Errors shown twice.** A legacy global validator adds a second error message to every Wave C form. It's red with a dot, in different words, and at 13px on desktop.
- **Large text at phone widths.** At 320@150, 320@200 and 390@200, several fixed or non-wrapping parts cut or break words:
  - the Readability rows on Branding
  - the Clocker link box
  - the preview tabs on Branding
  - long button labels
  - location card titles
- **Switch contrast.** The switch in its off state fails the 3:1 contrast needed for controls.
- **Words.** The copy is mostly clean. The remaining defects are small and spread across pages: straight apostrophes, inconsistent names, count lines, company words applied only partly, and jargon.

## How it was measured

- **Script.** A browser-side scan (`S/scan.js`) reads every visible text run in `.wc-page` and in toasts. For each it records:
  - computed size, line height, weight, family and colour
  - the background, composited through the ancestors' opacity
  - the WCAG contrast ratio
  - the words on each line, and any time, date or word broken across lines
  - clamp, ellipsis and overflow past the card or the viewport
- **Form fields.** For inputs and selects it also reads value and placeholder contrast, and whether the value overflows the field.
- **Graphics.** It reads the switches, pills, disabled buttons and notices.
- **Matrix:**
  - Ready states:
    - Owner on all 13 routes at 320, 390 and 1440, with text at 100%, 150% and 200% (117 snapshots).
    - Landscape 844×390: Hub and Branding.
    - WebKit spot check: Hub at 320@100/200, Branding at 390@100/150, Location at 320@100/150.
  - States (about 200 snapshots, mostly at 390, with 320 and 1440 where they matter):
    - field errors
    - blocked saves, and mocked 401, 409 and success answers
    - every dialog: Add, Edit and Archive break type; Add, Rename, Replace and Revoke device
    - inline Position editor
    - no-match searches
    - unknown location
    - Account recovery with `?employee=` and `?from=settings`, plus mocked issued, expired and 401
    - Clocker recovery malformed, unknown (real read), found (mocked), blocked and 401
    - Manager on both recovery pages
    - Manager, Lead and Employee on `/app/settings`
- **Not covered:**
  - Firefox (cut by the scope change).
  - 360, 430, 768 and 1024 (cut).
  - The Lead and Manager refusal at 1440: the page didn't load within 180s on the loaded server.
  - Large data: long location names were simulated by replacing the title text in the DOM, marked "(simulated)".
  - Loading placeholders: words compared from source only. Every `loading.tsx` band uses the same title and summary as its page.
- **Files.** `S/` = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-c-93e13c/75458b9c-fbac-4a0a-b5f7-fa683890e520/scratchpad/inspect/type/`. Raw JSON is in `S/data/`, full shots in `S/shots/`, crops in `S/crops/`. The contrast calculator is `S/cr.mjs`.

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-01 | Every Wave C form · Owner, Manager · all widths | Field errors | A second, legacy error appears beside Wave C's own error after submit or blur:<br>• **Company profile:** "• Enter business name" (#B42318, dot, no icon), then "Enter your business name."<br>• **New location key:** "Please match the requested format." (the browser's generic message), then "Use lowercase letters, numbers and single hyphens…"<br>• **Policies threshold:** "Use 0 or more", then "Enter whole minutes, 0 or more."<br>• **Break dialog:** "Enter break name" and "Choose classification", each doubled.<br>• **Device dialog:** "Enter device name" and "Choose location", each doubled.<br>• **Position name:** doubled.<br>• **Account recovery Employee ID:** doubled.<br>• **Account recovery checkbox:** "• Select this to continue" is injected inside the checkbox row as a column. It squeezes the sentence to about 110px, and at 390@200 the sentence ends at x 414, past the card edge at 374.<br>• **Size:** at 1440 the legacy errors are 13px, under the 14px floor. | `S/crops/tc-profile-390-duplicate-error.png`, `tc-newloc-390-duplicate-error.png`, `tc-acctrec-390-check-error.png`, `S/shots/breaks-add-invalid__390__100.png` | `src/components/form-validation.tsx:18` (`isField` takes every form in `.page-frame` that isn't `noValidate`), mounted at `app-shell.tsx:376` (shared, coordinator) | In `isField` add `&& !target.closest(".wc-page")`, or skip forms with `data-own-errors`. Wave C's `useFieldErrors` already writes the sentence and sets `aria-invalid`. | P1 |
| TC-02 | Branding · Owner · 320@150, 390@200, 320@200 | Readability rows `.nv-row__title` | The row titles are clamped at 3 lines with an ellipsis. The text column is only 113px wide, because the "Passes" pill keeps 123px:<br>• At 320@150, 6 of 10 titles are cut ("White text on pressed…"). scrollHeight 132 against clientHeight 99.<br>• At 320@200, all 10 are cut, in an 86px column, with words broken mid-word.<br>• At 390@200, 5 are cut. | `S/crops/tc-brand-checks-320-150.png` | `kit.css:205` (`-webkit-line-clamp:3`), with `.nv-status{white-space:nowrap}` (`kit.css:224`) in the trail, `brand-editor.tsx:195-200` | `.wc-brand__checks .nv-row{flex-wrap:wrap}` `.wc-brand__checks .nv-row__text{flex:1 1 12rem}` `.wc-brand__checks .nv-row__title{-webkit-line-clamp:unset;display:block}`. The pill then drops under the label at large text. | P1 |
| TC-03 | Location detail · Owner · 320@150, 320@200, 390@200, 1440@150 (aside); WebKit too | Clocker link box `.wc-linkbox__path span` "/clocker/2" | The path breaks inside itself:<br>• 320@150: "/cloc / ker/2" in a 53px box.<br>• 320@200: "/cl / oc / ker / /2" over 4 lines in 42px.<br>• The Copy button keeps its full width beside it. | `S/crops/tc-location-320-150-link.png`, `tc-location-320-200-link.png` | `premium-wave-c.css:264-272` (`.wc-linkbox` is a no-wrap flex row, the button is `flex:none`, and `:269` sets `overflow-wrap:anywhere`) | `.wc-linkbox{flex-wrap:wrap}` `.wc-linkbox__path{flex:1 1 11rem}`. Copy then drops below when the path can't keep about 11rem. | P1 |
| TC-04 | Branding, Locations no-match, Break Archive dialog · Owner · 320@200, 390@200 | `.nv-btn` labels | Long button labels don't wrap:<br>• "Reset to NEVORA teal" ends at x 341 against the button and viewport edge at 304/320 at 320@200, so it reads "Reset to NEVORA tea". At 390@200 it ends at 376 against 374.<br>• "Clear search and filters": 372 against 354 at 390@200.<br>• "Archive break type": 305 against 300 at 320@200. | `S/crops/tc-brand-reset-320-200.png` | `premium-wave-c.css:32` (`.nv-btn{white-space:nowrap}` on every Wave C button) | Under 600px use `white-space:normal; text-align:center; text-wrap:balance; padding-block:12px`, keeping the 52px minimum. Keep `nowrap` from 600px. | P1 |
| TC-05 | Branding · Owner · 320@150, 320@200, 390@200 | Preview tabs `.wc-segmented .nv-filter` (Phone / Desktop / Clocker) | The labels spill out of their pills:<br>• 320@150: Desktop text ends at 206 against its pill at 199; Clocker at 288 against 284.<br>• 390@200: Desktop 254 against 245.<br>• 320@200: labels overlap the next pill.<br>The labels touch with no gap ("DesktopClocker"). | `S/crops/tc-brand-tabs-320-150.png` | `premium-wave-c.css:359-360` (`flex-wrap:nowrap`, `flex:1 1 0`), plus `.nv-filter{white-space:nowrap}` (`kit.css:177`) | `.wc-segmented{flex-wrap:wrap}` `.wc-segmented .nv-filter{flex:1 1 auto;min-width:0}`. Or hide the icons under `@container (max-width:20rem)`. | P1 |
| TC-06 | Company profile · Owner · 320@150, 320@200, 390@200 | Protected timezone `#workspace-timezone` (disabled input) | The value "America/Puerto_Rico" is cut by an ellipsis: scrollWidth is more than clientWidth at 25.5px and 34px. A disabled input can't be focused or scrolled, so the owner can't read their own timezone at large text. The raw IANA id is also jargon: Company policies shows the same zone as "Company time: Puerto Rico". | `S/shots/profile__320__150.png` | `src/app/app/settings/workspace/page.tsx:41-50` (locked state renders a disabled `<input>`) | When locked, show the zone as a `Fact` (text that wraps), e.g. "Puerto Rico (America/Puerto_Rico)", and post it as a hidden input. Keep the editable input only when it's unlocked. | P1 |
| TC-07 | Features, Location detail, Positions editor · Owner · all widths | Switch `.wc-switch`, off state | Measured against the white card:<br>• Track #DDE2E1: **1.31:1**.<br>• Ring #C9D0CE: **1.57:1**.<br>• White knob on the track: 1.31:1.<br>Controls need 3:1 (WCAG 1.4.11), so an off switch is hard to see as a control. The on state is fine: #077572, 5.53:1. | `S/shots/features-dirty__390__100.png` (Company updates turned off) | `premium-wave-c.css:98-100` | Off state: keep the track #EEF1F0 and add `box-shadow: inset 0 0 0 1.5px var(--nv-icon)` (#858B8F, 3.45:1). Give the knob a 1px #858B8F ring. | P1 |
| TC-08 | Locations · Owner · 320@200; 320@150, 390@200 (long names, simulated) | Location card title `.wc-location .nv-card__title` | The title column is 93px wide because the status pill stays beside it:<br>• "North / side Main Office" breaks mid-word at 320@200 (WebKit too).<br>• A 90-character name (simulated) breaks "Waterfront" and "Distribution" at 320@150 and 390@200, across 11 lines. | `S/crops/tc-locations-320-200-title.png` | `premium-wave-c.css:246-248` (head `nowrap`, meta `flex:none`, title `overflow-wrap:anywhere`) | `.wc-location .nv-card__head{flex-wrap:wrap}` `.wc-location .nv-card__title{flex:1 1 9em;overflow-wrap:break-word}`. The pill then moves under the title. | P1 |
| TC-09 | Location detail, Branding, Features (default state); Account recovery and Positions before hydration · all widths | Disabled `.nv-btn`, `button.nv-link:disabled`, band control | The kit's disabled style should read #5F666A on #EEF1F0 at 5.14:1. A legacy rule adds 55% opacity, so it measures **2.2:1**:<br>• "Save changes" on Location detail and Features.<br>• "Save brand" and "Reset to NEVORA teal" on Branding.<br>Wave C's guarded "finished look" before hydration is also faded: "Issue recovery code" is white on teal at **2.78:1** (390). Disabled controls are exempt from WCAG, but this is the default look on three pages and undoes the kit and `premium-wave-c.css:283-286`. | `S/crops/tc-brand-reset-320-200.png` | `src/app/app/portal-gusto.css:129` (`:is(button,.button):disabled{opacity:.55}`) | Add `W :is(.nv-btn, .nv-link, .nv-band-control):disabled { opacity: 1; }` to `premium-wave-c.css`, or have the coordinator retire that rule for `.wc-page`. | P2 |
| TC-10 | Hub, Positions · Owner · 320@200 (Chromium and WebKit) | `.nv-row__title`, `.nv-row__meta` | Words break mid-word:<br>• "Schedulin / g rules" (Hub).<br>• "Operation / s" (Positions).<br>The Hub meta "Announcements," runs under the chevron and ends at 311, past the card at 304, so it's clipped. | `S/crops/tc-hub-320-200-sched.png`, `tc-hub-320-200-updates.png`, `tc-positions-320-200-row.png` | `kit.css:205` (title `overflow-wrap:break-word` in a column next to a fixed trail). `.nv-row__meta` has no wrap rule. | In `premium-wave-c.css` set `W :is(.nv-row__title,.nv-row__meta,.nv-card__title){hyphens:auto}` (the document is `lang="en"`) and `W .nv-row__meta{overflow-wrap:break-word}`. | P2 |
| TC-11 | Company profile · Owner · 390@200 | Fact value "Monday at 12:00 AM" | The time breaks inside itself: "Monday at 12:00" / "AM".<br>The same unguarded format is used in these places, not seen with this data:<br>• "Expires Oct 19, 3:04 PM" and "Last checked …" (`clocker-device-manager.tsx:63`)<br>• Policy history meta (`company-policy-editor.tsx:251`, via `formatBusinessDateTime`) | `S/shots/profile__390__200.png` | `workspace/page.tsx:51` | `keepWhole("Monday at 12:00 AM")`. Wrap `date()` and `formatBusinessTimestamp()` output in `keepWhole()`. | P2 |
| TC-12 | Company policies · Owner · 390@200, 320@150, 320@200 | Rule titles "No clock-in recorded", "No clock-out recorded" | The title breaks at the hyphen: "No clock-" / "in recorded". | `S/crops/tc-policies-390-200-clockin.png` | `company-policy-editor.tsx:16-17` | Use the non-breaking hyphen U+2011: "clock‑in", "clock‑out". | P2 |
| TC-13 | Hub, Features, Branding · Owner | Visible strings | Straight apostrophes:<br>• "choose your team's words" (`settings/page.tsx:34`)<br>• "Review an employee's saved…" (`settings/page.tsx:69`)<br>• Feature off notes "Employees can't…" ×3 (`lib/workspace-presentation/modules.ts:21,23,29`)<br>• Branding adjustment "can't be mistaken" (`lib/workspace-presentation/derive.ts:76`) | `S/shots/hub__390__100.png` | Lines listed | Use ’ in each. | P2 |
| TC-14 | Locations, Clocker devices, Break types, Positions · Owner | Count lines | There are four patterns, and one plural bug:<br>• "Showing 2 of 2 locations." (with a period)<br>• "Showing 1 of 1 devices" (no period, and "devices" with 1)<br>• "1 of 1" (no noun)<br>• "Showing x of y" or "2 positions" | `S/shots/devices__390__100.png` | `locations/page.tsx:83`, `clocker-device-manager.tsx:182`, `clocker-break-types.tsx:147`, `position-catalog.tsx:139` | Use one pattern everywhere: "Showing {n} of {total} {noun}" with a singular noun for a total of 1, and no period. | P2 |
| TC-15 | Locations, Location detail, New location, Clocker devices · Owner · other word presets | Company words | Only part of each page follows the chosen words. Locations takes `words.locations` for its title, eyebrow and "Add {place}", but these stay hard-coded:<br>• the count line ("locations")<br>• "No matching locations"<br>• "every location"<br>• "Edit location"<br>• the footnote<br>• the error page title "Locations"<br>• the issue link "Employee eligibility"<br>• "{n} eligible employees"<br>With Retail chosen, one card would read "Add store" in the band and "Edit location" on the card. | Source | `locations/page.tsx:83,99,131,140-147,152`; `locations/error.tsx:12`; `[locationId]/page.tsx:20`; `new/page.tsx:9` | Pass `place`, `places` and `words.people` into these strings, or keep the whole page on the default words until B5. Don't mix them. | P2 |
| TC-16 | Several · Owner | Names for the same thing | One thing has several names:<br>• **Company profile.** The Locations issue link says "Workspace settings" but opens the page titled "Company profile" (`locations/page.tsx:28`).<br>• **Locations page.** It's "Check locations" (`new-location-form.tsx:104`, `edit-location-form.tsx:122`), "Check Locations before trying again" (same notices), "Go to Locations" (`clocker-device-manager.tsx:144`) and "Manage locations".<br>• **Policy off state.** The pill says "Off" / "Off by default", but the option says "Disabled" / "Disabled by default" (`company-policy-editor.tsx:178,183-184`).<br>• **Break reference time.** It's "Reference minutes", "reference duration", "reference time" and "15 min reference" (`clocker-break-types.tsx:128,156,170,188-189`; Hub `:44`).<br>• **Idle save line.** It's "No changes yet." (Location), "No changes to save." (Branding) and "All changes saved" (Features, no period).<br>• **Revoke.** The link says "Revoke access", the button says "Revoke device" (`clocker-device-manager.tsx:128,205`).<br>• **Name help.** It says "shown across your workspace" on New location (`:80`) and "across NEVORA" on Edit (`:98`).<br>• **Add break type dialog.** Its subtitle reads "Changes apply to future breaks only.", but there's nothing to change yet (`clocker-break-types.tsx:178`). | `S/shots/policies__390__100.png`, `devices-revoke__390__100.png` | Lines listed | • "Company profile".<br>• "Check Locations" / "Go to Locations".<br>• "Off" in both places.<br>• "Reference time" throughout.<br>• One idle line ("No unsaved changes").<br>• "Revoke access".<br>• "across NEVORA".<br>• For Add: "It's offered for new breaks right away." | P2 |
| TC-17 | Location detail success; every "Not saved" notice | Notice title and body | The body repeats the title:<br>• Success: "Location updated" / "Location updated. Its Clocker link is unchanged." (server sentence).<br>• Failure: "Not saved" / "Changes could not be saved. Your entries are kept; try again." | Source; `S/shots/profile-fail__320__100.png` | `edit-location-form.tsx:121`; `wave-c-form.tsx:177` | • Strip the first sentence of the server's success text, as Company profile does with `showServerSuccess`.<br>• Body: "Your entries are kept. Try again." | P2 |
| TC-18 | Branding · Owner | Readability copy | The thresholds disagree: the adjustment says "readable (at least 5:1)", but the checks say "needs 4.5:1".<br>The ratio is floored and then rounded with `toFixed(1)`. A value of 4.45–4.49 would read "4.5:1, needs 4.5:1" next to "Too low" (`brand-editor.tsx:198`, from source; not seen with this data). | `S/shots/brand-yellow__390__100.png` | `derive.ts:83`; `brand-editor.tsx:198` | Say "at least 4.5:1", or match the actual floor. Show the ratio floored to 2 decimals (`Math.floor(r*10)/10`). | P2 |
| TC-19 | Clocker devices · Owner | Device row | "Registered" sits beside "No tablet has connected yet". | `S/shots/devices__390__100.png` | `clocker-device-manager.tsx:199` (independent of state) | For ACTIVE with no `lastSeenAt`, say "Registered, not checked in yet". Keep "No tablet has connected yet" for setup states. | P2 |
| TC-20 | Account recovery · Owner, Manager | Fallback error and expiry time | • The general failure reads "Recovery could not be confirmed. Keep your current access and try again." That's employee wording shown to the Owner (`account-recovery.tsx:37`).<br>• "Valid until" uses the device's timezone and doesn't say so (`assisted-recovery.tsx:41`). Clocker recovery shows company time with the zone ("AST"). | Source | Lines listed | • "The code wasn't issued. Try again."<br>• Format with the workspace `timeZone` and `timeZoneName:"short"`. | P2 |
| TC-21 | Company profile, Company policies, Clocker recovery | Jargon | Each of these is jargon:<br>• "Enter an IANA timezone" (`workspace/page.tsx:49`)<br>• "Operational records exist" (`:44`)<br>• "Disabled rules do not produce comparisons" (`company-policy-editor.tsx:146`)<br>• "Policy scope"<br>• "Observation cutoff"<br>• "Aggregation"<br>• "Recorded elapsed" and "Effective elapsed after corrections"<br>• "Greater than or equal" (missing "to")<br>• "No committed receipt was found" (`clocker-recovery-review.tsx:167`)<br>• "time correction workflow" (`:188`)<br>Policy wording sits next to legal text, so Jose decides. | `S/shots/policies-custom__390__100.png` | Lines listed | • "Enter a timezone, such as America/New_York"<br>• "Your team already has schedules and timecards"<br>• "Rules that are off don't flag anything"<br>• "Applies to"<br>• "Greater than or equal to"<br>• "No recorded action was found"<br>• "a time correction" | P2 |
| TC-22 | Company policies, Branding · Owner · loaded network | Choices made before scripts load | A choice made before scripts load stays on screen, but the page ignores it:<br>• **Policies (1440):** "Rule setting: Custom threshold" sits beside the pill "Off by default", with no threshold fields.<br>• **Branding:** the hex field reads "#12" with the help "Six digits after #…" and no error. | `S/crops/tc-policies-1440-prehydration.png` | No `data-guard` on `company-policy-editor.tsx` or `brand-editor.tsx` (Positions and recovery have one) | Disable the controls until hydrated (`useSyncExternalStore` hydrated flag), as Positions does. For the interaction inspector too. | P2 |
| TC-23 | All forms (judgment) | Field border | `--nv-border` #D5DAD9 on white measures 1.41:1. The label above each field makes the field identifiable, so this is a judgment call. Search fields and the other Wave C fields follow the shared pattern. | — | `premium-wave-c.css:48` | Consider #8F9799 (3.0:1), or keep it if the coordinator decides labels carry it. | P2 |
| TC-24 | Company policies · Owner · 320@100, 390@150 | "Effective from" `datetime-local` | The calendar icon is cut at the right edge at 320@100 and pushed out of the field at 390@150. The empty field shows "mm/dd/yyyy, --:-- --". | `S/crops/tc-policies-320-effective.png`, `tc-policies-390-150-effective.png` | `premium-wave-c.css:438-440` (`appearance:none; display:flex` on the date input) | Drop `display:flex`, or set `::-webkit-calendar-picker-indicator{margin-left:auto;flex:none}` with `padding-right:12px`. | P2 |
| TC-25 | Branding vs Positions (judgment) | Spelling | British "colour" appears 12 times (Branding and the Hub), next to US "recognizes" (Positions) and "acknowledgement". The product is en-US. | — | `brand-editor.tsx`, `branding/page.tsx:17`, `settings/page.tsx:33`, `position-catalog.tsx:55` | Choose one spelling. "color" fits en-US formatting. | P2 |

Payroll and legal wording: I changed and propose nothing for "These rules do not determine pay, discipline, or legal entitlements." (decided) or the Payroll row on the Hub. The CODEX §3 server sentences are only mentioned in TC-17.

## Checked and correct

**Type roles at 100%** (all 13 routes, plus dialogs, notices and recovery receipts):
- **Phone:**
  - Card titles 17/22/600.
  - Rows 17/22/500.
  - Meta, help, empty, guide and footnote 15/20/400 #5F666A.
  - Labels 15/20/500 #3E4347.
  - Notice title 15/20/600.
  - Buttons 17/22/600.
  - Filters 15/20 (500, or 600 when on).
  - Pills 15/20/500.
  - Stats 30/34/600.
  - Back 17/22/500.
- **Desktop:** the same roles at 16 and 14.
- **Floor:** no Wave C text is under 15 on phones or 14 on desktop.
- **Larger text:** at 150% and 200% every role scales in rem.

**Colour, measured:**
- Ink on white 17.65:1.
- Muted on white 5.84:1, on the canvas 5.29:1, on the inset fill 5.14:1.
- Labels 10.0:1.
- Teal links and active filters 5.53:1. Active filter ink on wash 6.50:1.
- Pills: done 5.59:1, review 5.66:1, urgent 5.80:1, neutral 7.43:1.
- Masthead summary and eyebrow 7.42:1.
- Danger button: white on #A3361F.
- Placeholders 5.84:1.
- Disabled field text 5.14:1.
- Feature note (review ink on white) 6.33:1.

**Colour never alone:** every error has a filled WarningCircle and words. Every notice has an icon and a title. Every pill has a glyph and a word. "Ready" and "Scheduling setup is complete." carry a check and words.

**Words:**
- Sentence case everywhere.
- Ellipses are the single character "…".
- No "missing", "missed" or "failed" in any visible string. "No clock-in recorded" replaces "missing".
- Curly quotes around search terms (“zzz”).
- Back labels match where they go:
  - Settings
  - Locations
  - Home, Employee and Settings on the recovery pages
- Hub row titles match the page titles.

**Wrapping at 100%:** no word, time or date is broken at 320, 390 or 1440. The single break at 844×390 was a false positive (two full lines). WebKit reproduces TC-03, TC-09 and TC-10 and adds nothing new.

**States read:**
- **Notices:**
  - Profile blocked save.
  - Location "Save not confirmed" with a Check link.
  - New location "Save not confirmed".
  - Branding: saved, blocked and 401.
  - Features: blocked and 409 busy.
  - Policies: saved, blocked, and threshold range error.
  - Break and device dialogs: blocked, with Reload / Refresh.
  - Positions blocked.
- **Account recovery:**
  - Blocked: "Code not issued".
  - 401: "Sign in again".
  - Expired.
  - Issued receipt: the 43-character code fits the field at 390 and 200%. "Single use" is correct.
- **Clocker recovery:**
  - Malformed reference: the error names the format.
  - Unknown reference: "Action still unconfirmed", info tone.
  - Found (mocked): a long name and a long tablet name wrap whole.
  - Blocked and 401.
- **No-match:** Locations, Positions, Break types and Devices.
- **Unknown location:** the shared "Page unavailable" page.

**Refused roles:** Manager, Lead and Employee on `/app/settings` are sent to Home with no message. That's the routing area's call, and it has no copy to check.

Zero open P0–P2 in my area: **no**.

## Round 2

October 19, 2026 · Same preview, frozen at `0490d84`.

**Verdict: no P0 or P1 left in my area. 9 P2 are open: 7 from round 1 that are partly or not fixed, and 2 new.**

**Fixed:**
- Duplicate errors
- Branding rows, tabs and long buttons
- Clocker link box
- Protected timezone
- Off switch
- Disabled fade
- Count lines
- Apostrophes
- Recovery strings

**Still open:**
- One mid-word break at 320@200.
- Hyphens added on the round-2 fix now split words at 100% on phones.
- Leftovers in company words, names and spelling.

**How it was checked:**
- **Ready states (Chromium):** all 13 routes at 320, 390 and 1440, text 100% and 200%.
- **Landscape 844×390:** Hub, Company profile, Branding, Features and Company policies, at 100% and 200%.
- **Other states:** 30 snapshots at 390, with 320 and 1440 where they matter:
  - field errors on 6 forms
  - Location and Features toggled
  - Branding with yellow
  - Policies custom, and range error
  - long names (simulated)
  - Account recovery issued (mocked) and opened from an employee
  - Branding 401 (mocked)
  - Locations no-match
  - Archive and Revoke dialogs
  - unknown location
- **WebKit:** Hub 390, Branding 320, Location 320 and Company profile 390, at 100% and 200%.
- **Saving:** every submission was aborted or answered by a mock.
- **Not checked:** Firefox, and the shell.
- **Files:** crops are in `S/r2/`, data in `S/data/`. Round 1 data moved to `S/r1-data/`.

### Status of round-1 findings

| ID | Status | Measurement now |
|---|---|---|
| TC-01 | Fixed | One error per field on Company profile, New location, Policies threshold, the Break and Device dialogs, and Account recovery (all 3 fields and the checkbox), at 390 and 1440. No `.field-error` nodes. The checkbox sentence stays inside its card. |
| TC-02 | Fixed | Branding Readability at 320@200: every label shows in full on 2 lines ("White text on / pressed buttons"). The pill sits below at x 36–188. Nothing is clamped (`S/r2/r2-brand-checks-320-200.png`). |
| TC-03 | Fixed | Location detail 320@200: "/clocker/2" is on one line, and Copy drops below it (`S/r2/r2-location-320-200-link.png`). WebKit 320@200 is the same. |
| TC-04 | Fixed | "Reset to NEVORA teal" wraps to 2 lines inside the button at 320@200 (text 110–274, button edge 304). "Clear search and filters" and "Archive break type" don't overflow at 390@200 or 320@200. |
| TC-05 | Fixed | The preview tabs stack one per row at 320@200: Phone 128–216, Desktop 116–228, Clocker 120–224, pill edge 284 (`S/r2/r2-brand-tabs-320-200.png`). |
| TC-06 | Fixed | The timezone is text in `p.wc-readonly`. At 320@200 it wraps and shows "America/Puerto_Rico" in full. The help reads "Schedules and time records already use this timezone, so it’s protected." The raw IANA id is still shown; that's a judgment call, not refiled. |
| TC-07 | Fixed | Off switch (Features "Company updates", Location "Active"): the ring is #858B8F, 3.45:1 against white. On is #077572, 5.53:1. The white knob on the #F1F3F4 track is 1.11:1, but the state shows through the fill change (no fill against teal), so I accept it. |
| TC-08 | Fixed | No mid-word break in location card titles at 320@200, or with the simulated 90-character name at 320 and 390. The pill drops under the title. |
| TC-09 | Fixed | Disabled "Save changes", "Save brand" and "Reset to NEVORA teal" read #5F666A on #EEF1F0 at 5.14:1. The guarded "Issue recovery code" stays white on teal at 5.53:1. |
| TC-10 | **Not fixed** | At 320@200 (Chromium) the row titles still break mid-word with no hyphen: "Schedulin / g rules" on the Hub, "Operation / s" on Positions (`S/r2/r2-hub-320-200-sched.png`, `S/r2/r2-positions-320-200.png`). `hyphens:auto` (`premium-wave-c.css:522`) doesn't take for these words, so `overflow-wrap:break-word` breaks them. The 30/34px `h1` of a simulated long location name also breaks "Distribution" at 320@200. **Fix:** let the trail ("Edit", chevron) drop below at large text with `@container (max-width:18rem){ .wc-page .nv-row{flex-wrap:wrap} }`. Or use `overflow-wrap:normal` with `min-width:min-content` on `.nv-row__text`, so a whole word pushes the trail instead of being split. P2 |
| TC-11 | Partly fixed | Company profile "Monday at 12:00 AM" stays whole at 390@200 (`keepWhole`). Policy history uses `keepWhole`. Still unguarded: Clocker devices `date()` for "Expires …" and "Last checked …" (`clocker-device-manager.tsx:56-64`, not wrapped). Not seen with this data. **Fix:** `return keepWhole(…)`. P2 |
| TC-12 | Fixed | "No clock‑in recorded" and "No clock‑out recorded" stay whole at 320@200 and 390@200 (U+2011). |
| TC-13 | Fixed | No straight apostrophes or quotes in any scanned string. The source has none left in `settings/page.tsx`, `modules.ts` or `derive.ts`. |
| TC-14 | Fixed | "Showing 2 of 2 locations", "Showing 1 of 1 device", "Showing 1 of 1 break type", "Showing 2 of 2 positions": one pattern, singular for 1, no period. |
| TC-15 | Partly fixed | Company words now apply to the count line, filters, "Edit {place}", empty no-match, footnote, Location detail (Back, eyebrow, summary, labels, notices), New location, and "eligible {people}". Still hard-coded:<br>• First-run empty state: "Your first workplace starts here" and "Add a location, then … your eligible team." (`locations/page.tsx:145-147`).<br>• Issue link "Employee eligibility" (`:27`).<br>• Error page "Locations" and "Locations didn’t load" (`locations/error.tsx:12-15`).<br>• The new unknown-location page: "Location not found", "We couldn’t find this location", "your list of locations", Back "Locations" (`[locationId]/not-found.tsx:8-12`).<br>**Fix:** read `wordPreset` in those three files the way `[locationId]/page.tsx` now does. P2 |
| TC-16 | Partly fixed | Fixed: "Company profile" link, "Check {Locations}", Off/Off by default/Use company default, "Reference time" throughout, "across NEVORA" on both forms. Still open:<br>• **Idle save line has three versions:** "No changes yet." / "All changes saved." (Location, `edit-location-form.tsx:133`), "No changes to save." (Branding, `brand-editor.tsx:223`), "Saved" / "Unsaved changes" (Features, `features-editor.tsx:116`).<br>• **Revoke:** the link says "Revoke access", the button says "Revoke device" (`clocker-device-manager.tsx:131`).<br>• **Add break type dialog:** still subtitled "Changes apply to future breaks only." (`clocker-break-types.tsx:179`).<br>**Fix:** use Features' "Saved" / "Unsaved changes" on all three, "Revoke access", and for Add "It’s offered for new breaks right away." P2 |
| TC-17 | Partly fixed | Location success now shows only the server's second sentence (`successBody`, `edit-location-form.tsx:17`). The generic failure still reads "Not saved" / "Changes could not be saved. Your entries are kept; try again." (`wave-c-form.tsx:187`). **Fix:** "Your entries are kept. Try again." P2 |
| TC-18 | Fixed | The ratio is floored before display (`brand-editor.tsx`). "At least 5:1" is decided as accurate. |
| TC-19 | Fixed | ACTIVE with no check-in reads "Registered, not checked in yet". |
| TC-20 | Fixed | The assisted fallback reads "The code wasn’t issued. Try again." "Valid until" reads "1:57 PM AST" (company time, zone shown, kept whole). |
| TC-21 | Fixed (non-policy) | "Enter a timezone name, such as America/New_York." "Schedules and time records already use…" "No recorded action was found yet." "correct the time in Timecards." "Greater than or equal to". The policy terms are decided for Jose. |
| TC-22 | Fixed | Branding swatches and hex, and the Policies form, are disabled until hydration. At 1440, choosing Custom threshold now shows its fields (49 text items against 33 before). |
| TC-23 | Fixed (shared `a62cc79`) | The field border is #858B8F, 3.45:1, height 48. |
| TC-24 | Partly fixed | At 390@100 the calendar icon sits inside the field ("mm/dd/yyyy, --:-- --" in full). At 390@200 the format is cut: "mm/dd/yyyy, --:" runs into the icon (`S/r2/r2-policies-390-200-effective.png`). This is native control text. **Fix:** under 600px, `.wc-page input[type=datetime-local].wc-control{font-size:max(1rem,15px)}`, or accept it as a native limit. Your call; P2 |
| TC-25 | Partly fixed | Branding and Hub strings are now "color". Left:<br>• "This colour is too close to grey…" (`lib/workspace-presentation/derive.ts:64`; also "grey", US "gray").<br>• The Readability row "Focus ring on grey panels" (`derive.ts`, `contrastReport`).<br>• "acknowledgement" (`modules.ts:24`).<br>**Fix:** "color", "gray", "acknowledgment". P2 |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-26 | Hub (and every `.nv-row__meta` on Wave C) · Owner · 390@100, 320@100, 844×390@200, 1440@200 | Row descriptions | Automatic hyphenation now splits ordinary words at the default text size:<br>• 390@100: "option- / al reference durations", "man- / age their access".<br>• 320@100: "and re- / vision history".<br>Before round 2, those lines wrapped at word boundaries. WebKit 390@200 shows the same pattern. | `S/r2/tc-r2-hub-390-hyphen.png`, `S/r2/tc-r2-hub-390-hyphen2.png`, `S/r2/r2-hub-320-100-policies.png` | `premium-wave-c.css:522` (`hyphens:auto` on `.nv-row__meta`, `.wc-choice__name` and `.wc-switch-row__label`, as well as titles) | • Drop `.nv-row__meta` from that rule; meta wraps whole words fine.<br>• On titles, limit hyphenation to long words: `hyphenate-limit-chars: 10 4 4` (Chromium 109+, WebKit `-webkit-hyphenate-limit-before/after`). | P2 |
| TC-27 | Account recovery from an employee · Owner · 390 | Band Back link | Back now reads the raw ID, "AUDIT-E", in place of "Employee". The ID can be up to 200 characters (`assisted-recovery.tsx:32`, `page.tsx` slice 200). It would wrap the band, and an ID isn't a name. Judgment call. | `S/shots/acctrec-employee__390__100.png` | `assisted-recovery.tsx:32` | Use the employee's name when the page has it. Otherwise keep "Employee", or cap the label at about 24 characters with `keepWhole`. | P2 |

### Checked and correct (round 2)

- **Type roles** are unchanged at 100% on all 13 routes: phone 17/15, desktop 16/14. No text is under the floor at any width, including the 844×390 landscape (15px phone tokens).
- **Contrast:** every enabled text is 4.5:1 or more. Disabled buttons are 5.14:1. Notices, pills and links match the round-1 values.
- **Large text:** no clamp, overflow or clip on any page at 320@200, 390@200 or 1440@200. Branding, Locations, Location, Policies and Features at 844×390 are clean.
- **Errors:** one error per field, each with its icon and words. Notice titles read "Sign in again" with a "Go to sign in" link on the Branding 401.
- **Words:**
  - Unknown location: "Location not found". The copy is clean; the company words are noted under TC-15.
  - Features idle state: "Saved" / "Unsaved changes".
  - Policies help: "A rule that’s off flags nothing."
  - Break rows: "Reference time 15 min", with a non-breaking space before "min".

Zero open P0–P2 in my area: **no** (9 P2 open: TC-10, 11, 15, 16, 17, 24, 25, 26 and 27; no P0 or P1).

## Round 3

I didn't run round 3. The round-3 scan was stopped before it ran, and the exit round below covers the same ground.

## Round 4 (exit)

October 19, 2026 · Preview `http://127.0.0.1:50431` (fresh, code at `5f7c166`) · The word rules come from the shared `INSPECTION-BRIEF.md`.

**Verdict: not at zero. 1 P1 and 2 P2 are open.**

**What's new.** The fresh preview has Branding history, which no earlier preview had. Its "Recent changes" rows collapse to 1–3 letters per line at 200% text.

**Earlier IDs.** Of the nine still open, seven are fixed and two are decided (TC-24, TC-25). The only remainder is a stranded comma under TC-10.

**Everything else measured clean:**
- Type roles
- Contrast
- One error per field
- Count lines
- Save-state wording
- Company words
- Recovery strings

**How it was checked.**
- **Chromium, ready states:** all 13 routes at 320, 390, 844×390 and 1440, at 100% and 200%, plus 768 and 1024 at 100% (130 snapshots).
- **Chromium, states:** 51 jobs (109 snapshots), mostly at 390, with 320 and 1440 where they matter. Every submission was aborted or answered by a mock, except the Clocker recovery unknown-reference read:
  - every field error
  - blocked saves
  - mocked 401, 409 busy and success
  - all four device dialogs and three break dialogs
  - Positions editor
  - every no-match
  - unknown location
  - Account recovery: from an employee, from Settings, as Manager, issued and expired
  - Clocker recovery: malformed, unknown (real read), found (mocked), blocked and 401, also as Manager
- **WebKit:** Hub 320, Branding 390, Location 320 and Policies 390.
- **Not covered:** Firefox, the shell.
- **Files:** crops in `S/r4/`, data in `S/data/`.

### Status of open IDs

| ID | Status | Measurement |
|---|---|---|
| TC-10 | Fixed, with a small remainder (P2, below) | At 320@200, "Scheduling rules" and "Operations" keep whole words: the hub tile and the Positions "Edit" step aside. The 90-character location `h1` still breaks "Distribution" at 320@200 at 60px; at that size the word can't fit 288px, so I accept it. Remainder: the Hub meta "Announcements" / ", audiences, and" at 320@200 (Chromium and WebKit) puts a comma at the start of a line (`S/r4/r4-hub-320-200-updates.png`). |
| TC-11 | Fixed | Device dates use `keepWhole` (`clocker-device-manager.tsx:64`). Company profile and policy history were already kept whole. |
| TC-15 | Fixed | The issue link reads "{Person} eligibility", the empty state "Add a {place}…", the error page "Your workplaces didn’t load", and the not-found page "{Location} not found" / "your list of {locations}". |
| TC-16 | Fixed | Branding, Features and Location detail all say "Saved" / "Unsaved changes". It's "Revoke access" on the link and the button. The Add break type dialog reads "It’s offered for new breaks as soon as you create it." |
| TC-17 | Fixed | "Not saved" / "Your entries are kept. Try again." (Company profile, Positions). |
| TC-24 | Decided (round 3) | — |
| TC-25 | Decided (round 3; shared library) | — |
| TC-26 | Fixed | `hyphens: manual` (`premium-wave-c.css:526`). No hyphen splits at 320@100, 390@100, 844×390@200 or 1440@200. |
| TC-27 | Fixed | Back reads "AUDIT-E" (7 characters). Longer than 16 falls back to "Employee" (`assisted-recovery.tsx:34`). |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TC-28 | Branding · Owner · 320@200, 390@200 (Chromium and WebKit); clamped at 390@200 in the Yellow and blocked states too | "Recent changes" rows `.wc-brand__history .nv-row__title` | The no-wrap date "Oct 19, 3:58 PM" takes the row, and the label column shrinks:<br>• 320@200: 27px wide. "Saved" reads "S / a / v." and "Color and logo changed" reads "C / ol / o.", both clamped at 3 lines (scrollHeight 748 against 132).<br>• 390@200: "Color and logo changed" is clamped at 97px; in WebKit it's 70px and "Saved" breaks too.<br>At 100% it's fine (`S/r4/r4-brand-history-390-100.png`). | `S/r4/r4-brand-history-320-200.png`, `S/r4/r4-brand-history-390-200.png` | `brand-editor.tsx:229-231`: the date sits in `.nv-row__trail` beside a clamped title, and the round-2 wrap rules don't cover this card | Put the date under the label as meta: `<span className="nv-row__meta"><time…/></span>` in `.nv-row__text`, and drop the trail. Or `.wc-brand__history .nv-row{flex-wrap:wrap}` `.wc-brand__history .nv-row__text{flex:1 1 9rem}` `.nv-row__title{-webkit-line-clamp:unset;display:block}`. | P1 |
| TC-29 | Brand blocked, Features blocked, Break and Device dialogs blocked, vs Location, New location and Policies · Owner | Notices for a save that may not have gone through | Two titles describe the same uncertain outcome:<br>• "Not saved", with a body that says "Your change may not have saved." / "It may not have saved." The title contradicts the body.<br>• "Not saved yet": Location, New location, Policies.<br>Location's body is also worded differently from New location's: "Your entries are kept. Check Locations to see whether the change was saved before trying again." against "It may not have saved. Your entries are kept. Check Locations before you try again…". | `S/shots/brand-fail__390__100.png`, `S/shots/location-fail__390__100.png` | `brand-editor.tsx` and `features-editor.tsx` (title "Not saved" on every error); `clocker-break-types.tsx` and `clocker-device-manager.tsx` (dialog "Not saved"); `edit-location-form.tsx:75,79` | Use "Not saved yet" for every uncertain outcome, and keep "Not saved" for definite refusals (400, 409, busy). Location body: "It may not have saved. Your entries are kept. Check {Locations} before you try again." | P2 |
| TC-30 | Hub · Owner · 320@200 (Chromium and WebKit) | Row meta "Announcements, audiences, and review requirements." | `overflow-wrap:break-word` puts the comma at the start of a line, ", audiences, and", because "Announcements," is wider than the 210px column at 30px (TC-10 remainder). | `S/r4/r4-hub-320-200-updates.png` | `premium-wave-c.css:526` (`overflow-wrap:break-word` on `.nv-row__meta`) | Shorten the Hub copy to "Announcements and who must read them." Or let the chevron step aside at that width, the way the tile does. | P2 |

**Suggestions for Jose (not counted).** The policy option "Observation cutoff" uses the banned word "cutoff", but its policy wording is decided for Jose. "Availability deadline" is the house word for a different thing, so a fitting alternative is "Checked after".

### Checked and correct (exit)

- **Type:** every text uses a kit role. At 100% the sweep found only token values (phone 30, 17 and 15; desktop 32, 16 and 14; stats 30 and 28). None is under the floor on any route, at any of the six widths, at 100% or 200%. 844×390 keeps the phone tokens.
- **Contrast:** all enabled text is at least 4.5:1, with muted text on the inset fill lowest at 5.14:1. Disabled buttons are 5.14:1. Field edges #858B8F are 3.45:1, and the off switch ring is 3.45:1.
- **Errors:** exactly one per field on every form, each with an icon and words. Clocker recovery's malformed reference names the format.
- **Words against the shared rules:**
  - Sentence case and curly apostrophes everywhere scanned.
  - No "missing", "denied", "rejected" or "could not be confirmed" in Wave C strings.
  - Failures read "Couldn’t load break types.", "Couldn’t load Clocker devices.", "Couldn’t load positions." and "Couldn’t check the receipt."
  - An ended session reads "Your session ended" with a "Sign in" link on Branding, Features, Policies and both recovery pages.
- **Count lines:** "Showing n of m noun", singular for 1, on all four list pages.
- **Times:** device dates, policy history, the Branding stamp and Account recovery's "Valid until 1:57 PM AST" are kept whole.
- **Back labels:** Settings, {Locations}, Home, the employee ID, and "Settings" for the Owner only.

Zero open P0–P2 in my area: **no** (1 P1: TC-28; 2 P2: TC-29, TC-30).
