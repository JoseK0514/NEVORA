# Wave C inspection, round 1: widths, roles and consistency

October 19, 2026 · Inspector: widths, roles and consistency (prefix WR-) · Preview `http://127.0.0.1:49855`, fictional data · Owner `QAOWNER`, Manager `AUDIT-M`, Lead `AUDIT-LEAD` · Read only: nothing edited, saved, submitted or signed out.

`S` = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-c-93e13c/75458b9c-fbac-4a0a-b5f7-fa683890e520/scratchpad/inspect/widths/`. Full-page shots: `S/shots/chromium/QAOWNER-<route>-<width>-t<100|200>-full.png`. Role shots: `S/shots/roles/`. Crops: `S/shots/crops/`. Raw measurements: `S/data/sweep-chromium-QAOWNER-320_…_1440-*.json`, `S/data/roles-*.json`, logs `S/log-*.txt`. Scripts: `sweep.mjs`, `measure.js`, `roles.mjs` (plus `interact.mjs`, `kit.mjs` and `kitprobe.js`, which were written but not run; see Gaps).

## Verdict

**Not ready.** At 100% text from 320 to 1440 the pages hold together: nothing scrolls sideways, fields are 48px, buttons are 52px, and Back names where it goes. The defects show up in three places:

- **Large text on narrow phones.** At 200% on 320 and 360, Account recovery's main button and Branding's Reset button run past the screen edge. Branding's readability rows also break words in half and cut them off.
- **1024 desktop.** The two-column layout switches on at 1024 by viewport width, but the sidebar takes 212px. The form column ends up 380px wide (Branding's form is 300px, narrower than its 400px preview), and the 600px rules then put two 164px choice tiles side by side.
- **No-access and not-found states.** Neither is drawn on the kit. A role that can't open a page sees that page's band flash, then lands on Home with no explanation. An unknown location shows the generic "Page unavailable" box.

The list pages also follow four slightly different patterns, which weakens the consistency.

**Count: 0 P0, 6 P1, 10 P2 (16 findings).**

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR-01 | Account recovery (all three variants) · Owner, Manager · 320 and 360 at 200% | `Issue recovery code` (`.wc-actions > .nv-btn`) | The label doesn't wrap. At 320 the label box spans x = −21…341 and the button shows "sue recovery code", with both ends cut off. At 360 it spans −1…361. Full-page capture is 341px wide at 320 and 361px at 360, so content sits beyond the viewport. Fine at 390+ and at ≤150%. | `S/shots/chromium/QAOWNER-account_recovery-320-t200-full.png` | `premium-wave-c.css:32` (`.nv-btn { white-space: nowrap }`) with `:121` (`width: 100%` under 600px) | Under 600px let action buttons wrap: `.wc-actions > .nv-btn { white-space: normal; text-wrap: balance; text-align: center; padding-block: 12px; height: auto; }`. Keep `nowrap` only from 600px. | P1 |
| WR-02 | Branding · Owner · 320 and 360 at 200% | Readability rows (`.wc-brand__checks .nv-row__title`) | Titles break inside words and are cut to 3 lines: "Whit / e text / on…", "Selec / ted / text…", "Seco / ndar / y te…". The "Passes" pill keeps about 150px, leaving the title about 80px. The reader can't tell which check passed. At 100% the titles read in full. | `S/shots/crops/WR-branding-checks-320-t200.png` | `kit.css` `.nv-row__title` (`-webkit-line-clamp: 3; overflow-wrap: break-word`) inside `brand-editor.tsx:198-203` (title and pill in one flex row) | For these rows, put the status under the title (use `.nv-row__status`, as the kit does for rows with a condition) instead of `.nv-row__trail`. Or add `.wc-brand__checks .nv-row__title { -webkit-line-clamp: unset; display: block; overflow-wrap: normal; }`. | P1 |
| WR-03 | Branding · Owner · 320 and 360 at 200% | `Reset to NEVORA teal` button; Preview tabs Phone / Desktop / Clocker | The secondary button is cut at the right edge ("Reset to NEVORA tea"), and the page content is 341px wide at 320. The segmented tabs truncate to "Phon", "Deskto", "Clocker" because each tab is `flex: 1 1 0` with `nowrap`. | `S/shots/crops/WR-branding-save-320-t200.png`, `S/shots/crops/WR-branding-tabs-320-t200.png` | `premium-wave-c.css:32` (button `nowrap`); `:359-360` (`.wc-segmented { flex-wrap: nowrap } .nv-filter { flex: 1 1 0 }`) | Same button rule as WR-01. For tabs: `.wc-segmented { flex-wrap: wrap } .wc-segmented .nv-filter { flex: 1 1 auto; min-width: max-content }`. Or drop the tab icons below 360 when text is ≥150%. | P1 |
| WR-04 | Every Wave C page with guidance, Branding, Features · Owner (and Manager on recovery) · 1024 | `.wc-layout`, `.wc-brand`, `.wc-choices`, `.wc-pair`, `.wc-actions` | At 1024 the content column is 748px (x = 244), because the sidebar takes 212px. The two-column grid starts there anyway:<br>• `.wc-layout` is **380px form / 320px guidance**.<br>• Branding is **300px form / 400px preview**, so the form is narrower than the miniature.<br>• The 600px viewport rules then fire inside a 340px card body. Features' word choices become **2 × 164px** ("Team members · Restaurants" takes 3 lines, "Field services" wraps), and Policies' threshold pair splits a 340px body in two.<br>At 1440 the columns are 752 / 320 and look right. | `S/shots/crops/WR-features-1024.png`, `S/shots/crops/WR-branding-1024.png` | `premium-wave-c.css:13-14` (`@media (min-width: 1024px)` grid); `:326-327` (brand grid `minmax(340px, 400px)`); `:408` (choices), `:72` (pair) and `:123-124` (actions), all at viewport 600px | Start the two columns at the content width, not the viewport: `.wc-content { container-type: inline-size }` and `@container (min-width: 880px)` for `.wc-layout` and `.wc-brand`. Switch `.wc-choices` and `.wc-pair` to `@container (min-width: 520px)` (container: the card body). Without container queries, use `min-width: 1180px` for the grids. | P1 |
| WR-05 | Location detail, unknown id (`/app/settings/locations/no-such-location`) · Owner · all widths | Not-found state | The page is the portal's generic `Page unavailable` box (`.portal-route-state`). It has no band, the old `button secondary` with "Back to home" instead of Back to Locations, and no kit card. At 390 the grey canvas ends at y ≈ 408 and the rest of the screen is white. The route's own `loading.tsx` first draws the kit band (Back "Locations", "Edit location" eyebrow), then the whole page is swapped for this box. | `S/shots/chromium/QAOWNER-settings_locations_no_such_location-390-t100-full.png` | `settings/locations/[locationId]/page.tsx:18` (`notFound()`) with no route `not-found.tsx`, so `src/app/app/not-found.tsx:3` renders | Add `settings/locations/[locationId]/not-found.tsx`: `SettingsFrame` with back `{ href: "/app/settings/locations", label: words.locations }` and title "Location not found", then a card with `EmptyState` (MapPin tile, "This location may have been removed.", secondary `.nv-btn` "See all locations"). | P1 |
| WR-06 | Settings hub, every Settings page, both recovery pages · Manager (Settings), Lead and Employee (all) · 390, 1440 | No-access state | A refused role gets HTTP 200 with the page's own loading band, then a silent redirect to Home.<br>• Manager → `/app/settings`: the h1 reads **"Settings"** at 150ms, then "Good afternoon, Morgan" on `/app`.<br>• Lead → `/app/account-recovery`: **"Account recovery"** is painted, then "Hi, Taylor." on `/app`.<br>• Lead → `/app/settings`: "Settings" is still on screen at 500–1200ms before Home.<br>No message says why. The kit has no refusal page for these routes. | `S/shots/roles/AUDIT-LEAD-settings-390.png`, `S/data/roles-*.json`, `S/log-roles.txt` | `src/lib/auth/permissions.ts:31` (`redirect("/app")`, server: Codex). The route `loading.tsx` files (`settings/loading.tsx`, `account-recovery/loading.tsx`, `clocker-recovery/loading.tsx`) paint the Owner band before the role check. | Codex: return a refusal the UI can draw instead of a bare redirect (for example `forbidden()` or a `?refused=` notice on Home). Wave C: a kit `forbidden.tsx` / refusal card ("Only Owners can open Settings", Back Home). The UI half can't be done without the server change, so this goes to `CODEX.md`. | P1 |
| WR-07 | Location card · Owner · 320 and 360 at 200% (any width once the title is wider than the space left by the pill) | `.wc-location .nv-card__title` | "Northside" breaks inside the word: "North / side / Main / Office". The head is `nowrap` with the status pill `flex: none`, and `overflow-wrap: anywhere` lets the title shrink below its longest word. | `S/shots/chromium/QAOWNER-settings_locations-320-t200-full.png` | `premium-wave-c.css:246-248` | `.wc-location .nv-card__head { flex-wrap: wrap }`, title `overflow-wrap: break-word` (not `anywhere`, which changes min-content), and `flex: 1 1 12ch`. The pill then drops under the title when space runs out. | P2 |
| WR-08 | Branding · Owner · 320 and 768 at 200% | Logo placeholder `.wc-logo-current` ("No logo yet") | The box is fixed at 140 × 64px. At 200% the text wraps to two lines and "yet" sits below the dashed border. | `S/shots/chromium/QAOWNER-settings_branding-768-t200-full.png` (Logo card), same at 320 | `premium-wave-c.css:352` (`width: 140px; height: 64px`) | `min-width: 140px; min-height: 64px; height: auto; width: auto; padding: 8px 16px; text-align: center` | P2 |
| WR-09 | Company policies · Owner · 320 from 125%, 360 and 390 at 200% | Rule and scope selects | The selected value is cut. "Disabled by default" needs 251px and has 246 at 320 / 125%, and needs 346 vs 316 at 390 / 200%. It shows as "Disabled b…", and seven selects on the page read the same. Text inputs also scroll their value at ≥125% on 320 (`Northside QA Workforce` sw 269 > 246), which is acceptable for inputs. A select hides its choice. | `S/shots/chromium/QAOWNER-settings_company_policies-320-t200-full.png` | `company-policy-editor.tsx:183` (long option label) inside a 20px-padded card body; `premium-wave-c.css:60` (48px right padding for the caret) | Shorten the option to "Off by default" (it matches the pill beside it). Or drop the card body padding to 16px under 360px, and the select's caret padding to 40px. | P2 |
| WR-10 | Account recovery · Manager · any width | Back in the band with `?from=settings` | A Manager who opens `/app/account-recovery?from=settings` (or `/app/clocker-recovery?from=settings`) gets **Back "Settings" → `/app/settings`**. Following it bounces them to Home (WR-06). Measured: `back: Settings=/app/settings` for `AUDIT-M` at 390 and 1440. | `S/shots/roles/AUDIT-M-account_recovery_from_settings-390.png` | `assisted-recovery.tsx:32`; `clocker-recovery-review.tsx:42`; `wave-c-recovery-loading.tsx` | Honour `from=settings` only when `actor.role === "OWNER"`. The page has the actor; pass the role. Otherwise Back = Home. | P2 |
| WR-11 | Locations, Break types, Clocker devices, Positions · Owner · all widths | Find / list pattern | Four lists, four patterns:<br>• **Locations:** separate "Find" card, field + square **Search button**, count line "Showing 2 of 2 locations.", first pill "All".<br>• **Break types:** "Find" card, icon-in-field search with **no button**, count as card meta "**1 of 1**".<br>• **Devices:** first pill "**All devices**", count line "Showing 1 of 1 devices" (no full stop, plural with 1).<br>• **Positions:** search **inside** the catalog card, and adding is a **form card** rather than the band's "+ Add" control used by Locations, Break types and Devices.<br>Row styles differ too: Break types use a tile and teal links under the meta, Positions a bare row with "Edit ⌄" at the right, Devices a status pill under the meta. | `S/shots/chromium/QAOWNER-settings_breaks-390-t100-full.png`, `…clocker-360-t100-full.png`, `…positions-360-t100-full.png`, `…locations-320-t100-full.png` | `locations/page.tsx:73-83`; `clocker-break-types.tsx:131-147`; `clocker-device-manager.tsx:174-183`; `position-catalog.tsx:127-145` | Pick one: a "Find" card with the icon-in-field search (Team's), first pill "All", and the count line "Showing N of M <plural>." in the Find card. Use the band "+ Add …" control for every list, Positions included (open the add form below the band). | P2 |
| WR-12 | Locations, Clocker devices · Owner · 320, 360 | Filter pills; band "+ Add" control | The pills wrap to two rows ("All / Needs setup" then "Ready / Inactive" at 320, "Revoked" alone on row 2 at 360). Team keeps one row that scrolls with an edge fade (portal-premium WR-42/AL-34). At 200% the band control wraps to "+ Add / location" on two lines. Team's band control is `nowrap`. | `S/shots/chromium/QAOWNER-settings_locations-320-t100-full.png`, `…-320-t200-full.png` | `premium-wave-c.css:84` (`.wc-pills { flex-wrap: wrap }`); no `nowrap` on `.wc-page .nv-band-control` | Use Team's rule (`portal-premium.css:597`) for `.wc-pills:not(.wc-segmented)`: one scrolling row with the mask. Add `.wc-page .nv-band-control { white-space: nowrap; flex: none }`, and let the eyebrow ellipsize as on Team. | P2 |
| WR-13 | Locations list, detail, new, loading · Owner · all widths | Company words | The title follows the chosen words (`words.locations`), but nothing else on these pages does. These are hard-coded: "Showing … locations" (`locations/page.tsx:83`), "Edit location" (`:131`), "No matching locations" and "Add a location" (`:140-147`), detail Back "Locations" and eyebrow "Edit location" (`[locationId]/page.tsx`, `loading.tsx`), "eligible employees" (`:99`). With Retail words the page would read "Stores" over "Showing 2 of 2 locations" and "Edit location". Found by reading the code; this data uses Standard words. | n/a (code) | as listed | Use `place` / `places` / `words.person(s)` everywhere these words appear, and pass the word to the detail and new pages and their loading placeholders. | P2 |
| WR-14 | Home vs Settings hub vs Clocker recovery · Owner, Manager | Entry point copy for Clocker recovery | Each entry point describes the page differently. Home's row says **"Reconnect a shared clock‑in device"** (`premium-home.tsx:328`), the hub says "Review an employee's saved Clocker action reference." (`settings/page.tsx:69`), and the page says "Check a saved Clocker action and help the employee finish recovery." Home's line describes Clocker devices, not this page. Account recovery has the same drift: "Help someone get back into their account" vs "Verify identity and help restore portal access." | `S/shots/roles/AUDIT-M-…` (Home), hub 390 shot | `src/components/premium-home.tsx:328-329` (Desktop session's file) | Use the hub's descriptions on Home's rows ("Check a saved Clocker action", "Help a verified employee get back in"). Message the Desktop session. | P2 |
| WR-15 | Account recovery from an employee · Owner, Manager | Back label | Back reads **"Employee"** (`?employee=AUDIT-E` → `/app/employees/AUDIT-E`). Elsewhere the kit's Back names the place ("Settings", "Locations", "Inbox", "Team"). "Employee" is a generic noun, and it ignores the company's word for people. Judgment call: it does go to the employee, so the destination is right. | `S/shots/chromium/QAOWNER-account_recovery_employee_AUDIT_E-320-t100-full.png` | `assisted-recovery.tsx:32`; `wave-c-recovery-loading.tsx` | Use the person's first name if the page can read it, or `words.person`; failing both, "Team member". | P2 |
| WR-16 | Branding preview · Owner · 320 | Phone miniature, next-shift time | "8:00 AM – 4:00 / PM" splits across lines in the 280px miniature. The preview is decorative and exempt from the type floor, but times must not split (PARALLEL.md). | `S/shots/chromium/QAOWNER-settings_branding-320-t100-full.png` | `brand-editor.tsx` `.wc-bp-pass strong` (no `keepWhole()`); `premium-wave-c.css:379` (19px fixed) | Wrap the time with `keepWhole()`, or `white-space: nowrap` with `font-size: 17px` on `.wc-bp-pass strong`. | P2 |

## Roles: what each role sees (Chromium 390 and 1440)

| Route | Owner | Manager | Lead | Employee |
|---|---|---|---|---|
| `/app/settings` and all Settings pages | Kit page | 200, Settings band flashes, then Home, no message (WR-06) | Same, Settings band visible for about 1s | Same rule (`requireRoles(["OWNER"])`); run stopped early, see Gaps |
| `/app/account-recovery` | Kit page, Back Home | Kit page, Back Home | 200, "Account recovery" band flashes, then Home (WR-06) | Same as Lead (same check) |
| `?employee=AUDIT-E` | Back "Employee" (WR-15) | Back "Employee" | Home | Home |
| `?from=settings` | Back "Settings" | Back "Settings" leads to a refused page (WR-10) | Home | Home |
| `/app/clocker-recovery` | Kit page, Back Home | Kit page, Back Home | Home (by code) | Home (by code) |
| Entry points (not the shell itself) | Hub rows to both recovery pages (`?from=settings`); Home rows | Home rows to both recovery pages; no Settings entry anywhere, as intended | None | None |

## Checked and correct

- **No sideways scroll.** `scrollWidth − innerWidth` is 0 on all 19 routes and variants at 320, 360, 390, 430, 844×390, 768, 1024 and 1440, at 100/125/150/200% (Chromium). The only overflow is the clipped content in WR-01 and WR-03.
- **768 and 844×390** have no overflow, clipping or truncation at any text size. Landscape keeps the phone layout: band 168–212px, `.wc-choices` two columns at 844 (380px each), actions in a row.
- **Fields** are 48px everywhere (text, select, search). The search fields are white at 48px, as decided. Textarea 126px. Buttons 52px; the Locations search button is 48px, matching the field.
- **Phones:** content and cards start at x = 16 on every page; band title x = 16, y = 120 (164 with an eyebrow row) on every page at 320–430.
- **Desktop:** content x = 244 (w 748) at 1024 and x = 282 (w 1120) at 1440 on every page; title y = 145 (189 with an eyebrow).
- **Hub:** 1 column under 1024, 2 × 350 at 1024, 2 × 536 at 1440. The Locations grid is the same.
- **1440 two-column** is 752 / 320 on every page with guidance; Branding is 672 / 400.
- **Back labels:** Settings pages say "Settings"; location detail and new say "Locations"; recovery says Home, Settings or Employee as specified. The hub has no Back. Labels are the same at every width.
- **Manager** opens both recovery pages on the kit, at both widths.

## Gaps (scope cut by the coordinator, October 19)

- **Not run:** Firefox (cut), WebKit spot checks (out of time), and the interactions script `S/interact.mjs`. That script covers the dialogs and bottom sheets, the Policies custom-threshold pair, the open Positions editor, malformed and unknown Clocker references, and long injected names.
- **Long content** was judged from 200% text instead. Existing data names are short, and the large-data preview wasn't started.
- **The computed-style comparison** against Team, Profile and Home (`S/kit.mjs`) wasn't run. Consistency findings come from screenshots and code.
- **Roles:** the Employee run was stopped. It uses the same `requireRoles` path as Lead.
- **Dev-server 500s** remained after 3 tries, so these combinations have no ready-state measurement:
  - 360 hub
  - 390 account recovery `?employee` and `?from`
  - 430 Branding and Features
  - 1440 Company profile
  
  Each of these pages passed at the neighbouring widths.
- **Capture artifact:** Chromium full-page shots at 844×390 render the desktop shell, because the capture grows the height past 430px. Landscape measurements were taken at 390 height and are valid; check landscape visuals with viewport shots only.

Zero open P0–P2 in my area: **no**.

## Round 2

October 19, 2026 · same preview, frozen · Chromium at 320, 390, 844×390, 1024, 1180 and 1440, at 100% and 200% text · WebKit spot checks at 320 and 1440 · Owner, plus Manager for Back · Read only.

New evidence: `S/r2/` (full-page shots `<browser>-QAOWNER-<route>-<width>-t<100|200>.png`, element shots), crops `S/shots/crops/R2-*.png`, data `S/data/r2-*.json`, scripts `S/r2.mjs`, `S/r2probe.js`, `S/r2extra.mjs`.

**Verdict:** most of round 1 is fixed. Nothing scrolls sideways or is clipped at 320 or 390 at 200% (`off`, `clip` and `cardOver` are all empty), and the 1024 layout is now a single 716px column. One fix caused a regression: the Branding colour well is now an empty white box in Chromium and WebKit. A few smaller items remain.

**Count: 0 P0, 1 P1, 6 P2 open in my area.** The P1 is WR-21. The P2s are WR-09, WR-11 and WR-13 (partly fixed) and WR-22, WR-23 and WR-24 (new). WR-15 is superseded by WR-24.

### Status of round-1 findings

| ID | Status | Measurement now |
|---|---|---|
| WR-01 | **Fixed** | At 320 / 200% the button spans x 16–304, label 36–284 (round 1: −21…341). At 390 / 200% it is 16–374. No content beyond the viewport. Same in WebKit at 320. Its height is WR-22. |
| WR-02 | **Fixed** | At 320 / 200%, 0 of 10 readability titles are clamped. Titles read in full ("White text on buttons") and the pill sits under the title (kit row status). At 1440 the rows also stack (about 104px each); that is the kit pattern, accepted. |
| WR-03 | **Fixed** | At 320 / 200%, Reset spans 16–304 with its label wrapped inside (112px tall). Phone, Desktop and Clocker each take a full row (36–284) with no clipping. At 100% the first two share a row (36–149, 157–284). |
| WR-04 | **Fixed** | **1024:** one column, 716px; Features choices 2 × 332 at 100% and 1 × 676 at 200%. **1180:** layout 504 / 320; Branding 424 / 400. **1440:** 752 / 320; Branding 672 / 400. The guide and the preview are `sticky; top: 89px` from 1180. |
| WR-05 | **Fixed** | "Location not found" in the Settings frame, Back "Locations", kit card, "Go to Locations" button (36–284 at 320 / 200%). Same in WebKit. |
| WR-06 | Decided (Codex) | Not refiled. ROUND-2.md lists the redirect and the flash for Codex in `CODEX.md`. |
| WR-07 | **Fixed** | Location titles are 1 line at 100% and 2 at 200% with no word broken. The head is `flex-wrap: wrap` and the pill drops under the title. |
| WR-08 | **Fixed** | At 200% the box grows to 169 × 64 and the text sits inside it (12–52px). |
| WR-09 | **Partly fixed** | The options are shorter ("Off by default" needs 172px at 100%), and at 320 they fit up to 125%. From 150% they are still cut:<br>• 320 / 200%: "Off by default" needs 264px and has 246; "Company default" needs 318 and has 246.<br>• 390 / 200%: "Company default" needs 318 and has 316.<br>The select grows to 96px tall, but its text can't wrap.<br>Cause: `company-policy-editor.tsx` (select labels), `premium-wave-c.css:60` (48px caret padding).<br>Fix: under 360px use 16px card body padding and 40px caret padding, or "Company" / "Off" as the visible labels. **P2 open.** |
| WR-10 | **Fixed** | `AUDIT-M` with `?from=settings` gets Back "Home → /app" on both recovery pages (`account-recovery/page.tsx:19`, `clocker-recovery/page.tsx:9`). |
| WR-11 | **Partly fixed** (rest decided) | Every count line now reads "Showing n of m noun" (Locations, Break types, Devices, Positions), and search is the same field on all four. One difference remains: Devices' first pill is "**All devices**", where the other three say "**All**" (`clocker-device-manager.tsx:180`). Fix: label it "All". **P2 open.** The Add entry point is decided. |
| WR-12 | Pills decided; band control **Fixed** | At 200% the Add control drops under Back on one line (Locations 16–232, Break types 16–270, Devices 16–214 at 320). |
| WR-13 | **Partly fixed** | The list, detail and new pages now use the company's words: "Edit {place}", eyebrow "Edit {place}", Back `words.locations`, "eligible {people}", "No matching {places}". Three places are still hard-coded:<br>• `[locationId]/not-found.tsx:8`: Back "Locations" and title "Location not found".<br>• `[locationId]/loading.tsx:4`: Back "Locations". Under Retail words, Back would read "Locations" while loading and "Stores" once ready.<br>• `locations/page.tsx:147`: "Add a location, then …"<br>Fix: read the words in those two files and use `place` on line 147. **P2 open.** |
| WR-14 | Decided (sent on) | Not refiled. |
| WR-15 | **Changed; see WR-24** | Back now shows the employee's ID ("AUDIT-E → /app/employees/AUDIT-E"). |
| WR-16 | **Fixed** | The miniature's time reads "8:00 AM –" then "4:00 PM", breaking only at the dash (`S/shots/crops/R2-branding-preview-320.png`). |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR-21 | Branding · Owner · every width, Chromium and WebKit (**regression**) | The Colour well (`input.wc-colour`) | The well is an empty white 64 × 48 box with no swatch. Computed: `height: 48px`, `padding: 8px 4px`, `background: #FFFFFF`, value `#077572`. In round 1 it showed the teal swatch (`S/shots/chromium/QAOWNER-settings_branding-320-t100-full.png`). The Hex code beside it still reads #077572. | `S/r2/colour-well-390.png`, `S/shots/crops/R2-branding-colour-320-t100.png`, `S/shots/crops/R2-webkit-colour-320.png` | `premium-wave-c.css:346` changed `height: 52px` to `height: auto` (with the shared `padding-block: 8px` from `a62cc79`). The swatch wrapper collapses in an auto-height colour input. | `input.wc-colour { height: 3rem; padding: 4px; }`. 3rem keeps it growing with text. Or add `::-webkit-color-swatch-wrapper { height: 100% }` and keep the fixed height. Check both engines. | P1 |
| WR-22 | Clocker recovery, Account recovery · Owner, Manager · 320 and 390 at 200% | `Check receipt`, `Issue recovery code` (`.wc-swap`) | The button is sized for its hidden busy label. At 390 / 200%, "Check receipt" needs one line (label 243px wide in a 278px button) but the button is **140px tall**, because "Checking receipt…" (278px) wraps to three lines in the same grid cell. "Issue recovery code" is 140px at 320 and 112px at 390. Other buttons are 68px at 200%. | `S/r2/check-receipt-390-t200.png` | `wave-c-form.tsx:103-105` (`ButtonLabel` stacks both labels in one grid cell); `premium-wave-c.css` `.wc-swap { display: inline-grid }` | Keep the width reservation and drop the height one. Lay the busy label over the idle one (`.nv-btn { position: relative } .wc-swap > span + span { position: absolute; inset: 0; justify-content: center }`). Or make each busy label no longer than its idle label ("Checking…", "Issuing…"). | P2 |
| WR-23 | Settings hub · Owner · 320 at 200% | Row titles and meta (`.wc-hub .nv-row__title`, `.nv-row__meta`) | The text column is about 166px (288 card − 40 tile − 12 gap − 40 padding − 18 chevron − 12 gap). Long words break with **no hyphen**: "Schedulin / g rules", "Announcem / ents". Others are hyphenated: "Location de- / tails", "Turn fea- / tures", and the card title "Team & commu- / nications". The same word list reads three different ways. | `S/r2/chromium-QAOWNER-settings-320-t200.png` | `premium-wave-c.css:522` (`hyphens: auto; overflow-wrap: break-word`) plus the 40px decorative tile | At large text, give the words room: `.wc-hub .nv-rows { container-type: inline-size } @container (max-width: 20rem) { .wc-hub .nv-tile { display: none } }`. That adds 52px, so "Scheduling" (about 175px at 200%) fits. Keep `hyphens: auto` for meta only. | P2 |
| WR-24 | Account recovery from an employee · Owner, Manager · all widths | Back in the band | Back now shows the raw employee ID (`AUDIT-E`) instead of a name or a place. A realistic ID such as `EMP-2026-NORTHSIDE-RIVERFRONT-DISTRIBUTION-0004812` fills the whole bar (x 8–374 at 390). At 200% Back becomes **220px tall** (5 lines) above the title. The ID is up to 200 characters (`account-recovery/page.tsx:19` slices at 200). | `S/r2/long-id-390-t100.png`, `S/r2/long-id-390-t200.png` | `assisted-recovery.tsx:34`; `wave-c-recovery-loading.tsx:10` | Name the person (`firstName` from the employee record, which the page can read on the server), or use `words.person`. Cap the label: `.nv-masthead__back { max-width: 100%; } .nv-masthead__back span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }`. | P2 |

### Checked and correct (round 2)

- **No overflow at 320 or 390:** all 14 checked routes at 100% and 200% have `scrollWidth − innerWidth` = 0, with nothing off screen, clipped or overflowing a card (Chromium). WebKit at 320 (Account recovery, Branding, Locations, unknown location) and 1440 (Company profile, Branding) shows the same.
- **844×390:** no overflow at 100% or 200% on Features, Policies, Locations and Account recovery. The save bars stay in the page (Features bar 76px, 92px at 200%) and the layout stays one column.
- **Buttons wrap inside their boxes:** every `.nv-btn` label sits within its button at 200% (`btns` probe: label x inside button x).
- **Hub** is two balanced CSS columns at 1024, 1180 and 1440. The Locations grid is 2 × 350 / 412 / 536.
- **Back for Owner:** Settings pages → "Settings"; location detail, new and not-found → "Locations"; recovery → Home, Settings with `?from=settings`, or the employee.
- **Count lines** all read "Showing n of m noun", singular for one ("Showing 1 of 1 device").

### Gaps

Firefox wasn't run, by decision. Neither was Employee or Lead this round; the role path is unchanged, and WR-06 is decided. Dialogs, the Policies pair and long injected names weren't re-run. The shell was ignored.

Zero open P0–P2 in my area: **no** (WR-21 P1; WR-09, WR-11, WR-13, WR-22, WR-23 and WR-24 P2).

## Round 4 (exit)

October 19, 2026 · preview `http://127.0.0.1:50431` (code `5f7c166`) · Read only.

- **Chromium sweep:** all 19 routes and variants at 320, 390, 844×390, 768, 1024 and 1440, at 100% and 200% text, as Owner.
- **Save bars, color well, hub rows, Positions, recovery buttons and long-ID Back:** 320, 390 and 844×390.
- **Roles:** Manager, Lead and Employee at 390.
- **WebKit:** spot checks at 320.

Evidence: `S/r4/`, data `S/data/r2-chromium-QAOWNER-320_390_844x390_768_1024_1440-*.json` (the round-4 run), logs `S/log-r4-*.txt`, scripts `S/r2.mjs`, `S/r3extra.mjs`, `S/roles.mjs`, `S/r4wk.mjs`.

**Verdict:** ready apart from one P2. The full sweep found nothing off screen, clipped or overflowing a card at any width or text size. Every earlier ID is fixed or decided. The one new item is a hairline inset on the hub that came with round 3's hidden tiles.

**Count: 0 P0, 0 P1, 1 P2.**

### Status of open IDs (ROUND.md)

| ID | Status | Measurement now |
|---|---|---|
| WR-11 | **Fixed** | The first pill is "All" on all four lists ("All 2", "All 1", "All 1", "All 2"). Every count line reads "Showing n of m noun" ("Showing 1 of 1 device"). |
| WR-13 | **Fixed** (loading placeholder decided in ROUND-3) | The not-found page uses `words.locations` for Back and its button, and `words.location` for its title (`[locationId]/not-found.tsx:8-14`). The empty state reads "Add a {place}, then …" (`locations/page.tsx:147`). |
| WR-21 | **Fixed** | 64 × 48 with the teal swatch, in Chromium (320, 390, 844×390) and WebKit (320). Codex also confirmed it. |
| WR-22 | **Fixed** | At 390 / 200%, "Check receipt" is **68px** (it was 140). At 320 / 200% it is 112px, a real 2-line wrap (208px of label room). "Issue recovery code" is 112px at 320 and 390 / 200% (2 lines of its own words) and 68px in landscape. |
| WR-23 | **Fixed** | The hub's tiles step aside in narrow cards at 200% (0 of 14 visible), so the title column is 218px at 320 and 288px at 390. "Scheduling rules" and "Announcements" stay whole, with no hyphens. At 100% the 14 tiles show. New side effect: WR-25. |
| WR-24 | **Fixed** | An ID of 16 characters or fewer shows as Back ("AUDIT-E"). A longer one (`EMP-2026-NORTHSIDE-RIVERFRONT-0004812`) shows "Employee". Back is 44px tall at 320, 390 and landscape, at 100% and 200%. |
| WR-06, WR-09, WR-12, WR-14 | Decided | Not refiled. |

### New finding

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR-25 | Settings hub · Owner · 320 and 390 at 200% (any card narrow enough to hide the tiles), Chromium and WebKit | Row separators (`.wc-hub .nv-rows > li + li > .nv-row::before`) | With the tiles hidden, the row text starts **20px** from the card edge, but the hairline above each row still starts at **72px**: the old inset for a 40px tile and 12px gap. Every separator on the hub begins 52px to the right of the text it divides. Measured: `::before` left 72px, text x 20px, tile `display: none`, on 3 of 3 rows sampled in each engine. | `S/r4/chromium-hub-card-320-t200.png`, `S/r4/webkit-hub-card-320-t200.png`, `S/shots/crops/R4-hub-team-320-t200.png` | `premium-wave-c.css:546` hides `.nv-row > .nv-tile`; the kit's leading-row hairline (`kit.css:201`, `left: calc(20px + 40px + 12px)`) isn't reset | In the same container query as `:546`, add `.wc-hub .nv-rows > li + li > .nv-row[data-leading="true"]::before { left: var(--nv-s-5); }` | P2 |

### Checked and correct (exit)

- **No overflow in the Chromium sweep:** across 19 routes × 6 sizes × 2 text sizes, `scrollWidth − innerWidth` = 0, and nothing is off screen, clipped or outside a card. What remains are single-line inputs scrolling their own value at 200%, and the decided WR-09 select.
- **Layout by width:**
  - **320–768:** one column.
  - **1024:** one 716px column; Features choices 2 × 332; hub two balanced columns; Locations grid 2 × 350.
  - **1440:** layout 752 / 320; Branding 672 / 400; Locations grid 2 × 536.
  - **844×390:** Features choices 3 × 249.
- **Phone save bars (Features, Policies):**
  - `position: fixed` with the bar's bottom exactly on the tab bar's top (776 at 100%, 761 at 200%).
  - Scrolled to the end, the last card ends above the bar (597 vs 613 at 320 / 200%).
  - At 100% the bar is one row (Save changes 16–224 and "Saved" 236–304 at 320).
  - WebKit matches at 320 / 200% (fixed, 613–761 on the tab bar at 761).
  - In landscape the bar stays in the page (`static`).
- **Back:** Settings pages say "Settings"; location detail, new and not-found say "Locations"; recovery says Home, Settings (Owner with `?from=settings` only) or the employee. Every Back is 44px tall.
- **Roles (390):**
  - Owner opens every page on the kit.
  - Manager is sent to Home from Settings (decided). Manager opens both recovery pages on the kit, with Back Home even with `?from=settings`, and Back "AUDIT-E" from the employee.
  - Lead and Employee are sent to Home from every Wave C route (decided, WR-06).
  - Manager's entry points are Home's two recovery rows.

### Gaps

- Firefox is out of scope.
- The shell was ignored.
- Dialogs and long injected names weren't re-run this round; their code didn't change in round 4.
- WebKit was spot-checked at 320 only.

Zero open P0–P2 in my area: **no** (WR-25, P2).
