# 14 UI Designer — Owner Settings hub and sub-pages (Locations, Payroll settings, Scheduling rules, Profile)

**Verdict**
The Settings family has the v3 colours and hairlines, but it does not yet follow v3's structure. Three page frames are in use (`SettingsFrame` from Wave C, the Wave B `PageBand` on Scheduling rules, and the Payroll section-tab shell), and they put the title, back link, counts and icon tiles in different places from the rebuilt pages. On phones, the hub and the two long forms (Payroll settings at 4,522px, Scheduling rules at 4,117px) still look like desktop forms stacked into one column, not iOS grouped lists. None of this is broken. It is the most visible place where the Owner app stops looking like one product.

**Recommendations**

1. **Apply the desktop "one title rule" to Settings pages.** Add `.wc-page` to the `:is(.premium-review, .wa-member, .wb-rules, .wb-templates, .wb-update)` group in `premium-clean-manager.css:968-974`. That moves "‹ Settings" and "Add location" into the title row on the right and puts the count line under the title.
   - *Why:* the file's own ruling at `premium-clean-manager.css:951-952` says the title sits at y84 at 1440 and a back link is never above the title. Measured title centres: Team, Timecards, Profile, Rules and Payroll settings are all at y≈100. The Settings hub is at y143 (eyebrow above). Locations is at y196 (back link plus eyebrow above; `QAOWNER-locations-1440.png`). Older evidence (`qa-out/r4-settings/c100/_app_settings_workspace…1440`, `…positions…1440`) shows Company profile at y147 and Positions at y192.
   - *Impact:* High. *Effort:* S. *Owner:* UI.

2. **Rebuild the phone Settings hub as the More sheet's grouped list.** Use an uppercase footnote header outside each inset group, single-line rows, no group descriptions, and no per-row descriptions on phones. Keep descriptions on desktop if wanted.
   - *Why:* `QAOWNER-settings-390.png` puts a bold 20px group title and description inside each card, and most rows wrap to three lines, so the page is 1,989px for 15 rows. The More sheet (`qa-out/mgr/more-QAOWNER-chromium-390*.png`), Timecards (`QAOWNER-timecards-390.png`) and the approved `mockups/png/more-390.png` all use outside headers and one-line rows.
   - *Impact:* High. *Effort:* M. *Owner:* UI.

3. **Give each destination one icon and one tile colour everywhere.** The hub paints every tile teal (`settings/page.tsx:96`, `data-tone="accent"`), while the More sheet colours tiles by group (teal for time and pay, orange for planning, blue for team tools, grey for account). So "Scheduling rules" is orange in More and teal in Settings. Recovery icons also differ:
   - Clocker recovery: `refresh` in `src/lib/navigation.ts:90` against `ClockCounterClockwise` in the hub.
   - Account recovery: `employee` in `navigation.ts:91` against `Key` in the hub.
   - Pick one icon and colour per destination and import it from the navigation source. Do not redeclare it in the hub.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

4. **Make Payroll settings a Settings page, not a fourth Payroll tab.** It renders under the Payroll section tabs (Timecards · Payroll runs · Time exports · Payroll settings), while the sidebar highlights **Settings** (`QAOWNER-payroll-1440.png`). On phones it has no back link, and the tab strip opens on a clipped "ords" (`QAOWNER-payroll-390.png`). Either use `SettingsFrame` with "‹ Settings", or highlight Payroll in the sidebar. Don't show both.
   - *Impact:* Medium. *Effort:* S–M. *Owner:* UI, with Product to pick the home.

5. **Restructure the Payroll settings layout without touching its words.** The approved wording stays verbatim (spec §Owner only), but the layout can change:
   - On desktop, use a two-column settings layout: section title and helper text on the left (1/3), controls on the right (2/3).
   - Size fields to their content. "Preparation reminder window" is a one-digit number in an input about 1,080px wide.
   - Replace the two mid-page filled "Save…" buttons with the sticky save bar that Scheduling rules already uses.
   - On phones, use iOS switches for the three on/off automation rows, as v3 "iOS conventions exactly" requires. Do the same for "Designated lead required" on Rules.
   - *Why:* the page is 3,355px on desktop and 4,522px (about 5.5 screens) on phones, with 14 helper paragraphs at the same visual weight as the controls.
   - *Impact:* High. *Effort:* M. *Owner:* UI.

6. **Weekly hours on Scheduling rules: a table on desktop, rows plus a sheet on phones.**
   - *Why:* each of the 13 people repeats its own "Target / Maximum" labels and two 44px inputs (`QAOWNER-rules-1440.png`, `-390.png`). The spec says desktop uses "tables for tabular data", and Timecards and Team do. On phones the list alone takes about 2,600px, and it grows linearly with headcount (about 13 screens at 50 people).
   - *Fix, desktop:* one header row, then Name · Target · Maximum columns.
   - *Fix, phone:* rows reading "Casey Rivera … 40 h max ›", which open a half-height sheet with the two fields.
   - Also replace the outlined teal "On this page" button stack (`premium-wave-b.css:378-381`) with plain text links or the underline-tab style, and close the empty band of about 100px between Weekly hours and Recurring coverage at 1440.
   - *Impact:* High. *Effort:* M–L. *Owner:* UI.

7. **Locations: one number, one status signal, and calm colour.**
   - The count appears three times: the eyebrow "2 locations · 2 active", the "All 2" pill, and "Showing 2 of 2 locations". Keep one, under the title, as Team does.
   - Each card says "Ready" (green) and also "Scheduling setup is complete." (green check line, `locations/page.tsx:113-127`). Keep one.
   - Show "Ready" in grey. v3 colour is teal, red and amber only.
   - Hide the "Find locations" card under about 8 locations.
   - On phones the four-segment control scrolls and clips "Inactive" (`QAOWNER-locations-390.png`). iOS segmented controls never scroll, so drop the counts or use a filter menu.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

8. **Profile error state: use the desktop's soft tiles and one retry.** On desktop the "couldn't load" tile is a filled `#FF3B30` square (`premium-clean-manager.css:29`). The soft desktop tones at `:387-391` only cover `.nv-row .nv-tile`, not `.wc-empty`/empty states. The page also shows two "Try again" controls and a notifications card with about 250px of empty height (`QAOWNER-profile-1440.png`, `-390.png`). On phones the rows switch between label-beside-value and stacked when the value is "Couldn't load" (Email and Phone stacked, Locations inline). Fix:
   - Extend the soft tones to empty states.
   - Keep the header "Try again" only.
   - Hold one label/value layout for every row.
   - Also check why QAOWNER email, phone and locations fail to load in the preview (Backend).
   - *Impact:* Medium. *Effort:* S. *Owner:* UI, plus Backend for the data.

9. **Use one back rule for pages opened from More on phones.** Timecards shows "‹ More". Settings hub, Profile and Payroll settings show nothing. Scheduling rules, which is listed under Planning in More, shows "‹ Schedule". Locations shows "‹ Settings", which is correct. Pick one rule (recommended: "‹ More" for More-sheet destinations, "‹ Settings" for hub children) and apply it in `PageBand`.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

10. **Drop the leftover footnotes and duplicate entry points in the hub.**
    - "Only Owners see Settings. Each page saves its own changes." only ever appears to Owners, and the Locations and Payroll footnotes repeat card text. v3 removed "a footnote under most cards" (spec §Why, Updates).
    - Five of the hub's 15 rows (Employees & access, Company updates, Scheduling rules, both recoveries; `settings/page.tsx:42-68`) already have a sidebar and More entry. Contract rule 5 is "one primary place, at most one shortcut", and Scheduling rules is now reachable from five places.
    - Keep the hub to workspace configuration.
    - *Impact:* Low–Medium. *Effort:* S. *Owner:* UI, with Product confirming the IA.

**What's good**
- The hub and the sub-pages already use the shared kit (`nv-card`, `nv-rows`, `nv-tile`, `Status`), hairlines and 44px rows. Unifying them is a matter of applying CSS rules, not rewriting pages.
- Scheduling rules' sticky "Save staffing and hours" bar is the right pattern for long forms. Payroll settings should adopt it.
- Locations has real empty and no-match states (`EmptyState`, `locations/page.tsx:132-148`) with a single clear action.

**Not checked / limits**
- No browser use (per brief). Everything is from the current full-page shots at 390 and 1440, plus older Oct 20 `qa-out/r4-settings` shots. Sub-pages without current shots (Company profile, Branding, Features & words, Company policies, Break types, Positions, Clocker devices) may have changed since then.
- Not checked: 768–1299 widths, hover, focus and pressed states, loading skeletons, dark mode, reduced motion, Spanish text length, and company-brand (B1) colour on these pages.
- Pixel positions are read from screenshots (scaled by up to 1.68x), so they are accurate to about ±4px.
- I couldn't confirm whether the Profile "Couldn't load" state is a preview-data artefact or a live bug.
- The CSS specificity stacking (`.wb-page` ×7, `.wc-page.wc-page` plus nine CSS layer files) is noted as structural debt but was not audited.
