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
