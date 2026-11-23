# Fill-in sweep B: Rondo AI, Find cover, device alerts and passkeys, location Manager grants, the four failing pages, tablet widths (Nov 22, 2026)

Second-pass captures for `docs/product/page-inventory.md`, filling the gaps the two earlier sweeps listed
([sweep-owner-manager.md](sweep-owner-manager.md), [sweep-lead-employee-public-clocker.md](sweep-lead-employee-public-clocker.md)).
188 captures in Chromium on fictional data in an owned local Postgres, built from `83ba756b` on
`claude-codex-collab-nevora`. Per-capture data (final URL, state, family, words, button styles, text sizes, kit markers,
API failures, console errors, the notable problem and an inspection note) is in `sweep-fill-b.json`; thumbnails are in
`thumbs/fill/<row>-<profile>-<width>[-tag].webp` (360 px wide, WebP quality 60; `Ml` = Mℓ). Full-size PNGs stayed in
`/tmp/nevora-sweep/fill-b/<run>/full/` on the sweep machine.

**Root causes in one line each**, as seen on `83ba756b` (details and the upstream status under [Root causes](#root-causes):
I5 fixed upstream in `be73a728`, C13 in `c84c2375`, C11 verified by a test in `aa9f9f2b`, B3 still open):

- **B3 Notifications (Owner):** a timing race in the browser, not a failed read. The list loads, then the panel's own expiry timer fires before its renewal returns and replaces the list with "Notifications didn't load".
- **C11 Availability agreement (Lead):** a harness setting, not the Lead role. The earlier Lead run had device alerts on, which configures an `http:` portal origin; production refuses it on the agreement's POST read (`503 origin_unavailable`). The Employee fails the same way with alerts on.
- **I5 Passkeys:** the passkey section renders nothing when the API says `not_supported` (no passkey origin in production), leaving only the band; the Owner's Profile treats the same answer as a load error.
- **C13 Posted open shifts:** a band rule at `src/app/app/owner-b-desktop.css:414` colours the first paragraph after a Quiet header with `--b-on-band-2` (white at 86%), and the empty-state line is that paragraph.

## How it was captured

- **Harness:** the owned app from `src/test/integration/owned-next-app.ts` through `zz-scan/pg-runner.mjs`, with a new test
  (`fill-b.integration.ts`) written into an unpacked, never-committed copy of `tools/ui-scan/zz-scan.tar.gz` in the
  scratchpad. Each run copied it into the worktree, ran as `postgres` under `flock /tmp/nevora-heavy.lock`, and removed
  it. Nothing under `src/` was changed.
- **Seed:** the owner-rich recipe of the earlier sweeps (`seedOwnerBefore`, schedules, `seedEmployeeRich` for James,
  `seedOwnerAfter`), so the Owner, Elena, Daniel and James see the same fictional café as before.
- **Profiles:** O = `QAOWNER`; M = Elena Ruiz (`OWN-ELENA`, company-wide, no grants); Mℓ = Daniel Cruz (`OWN-DANI`) made a
  Manager with `setOwnedEmployeeRole` and limited to Condado through the app's `assignOperationalScope` (LOCATIONS
  `[loc-2]`); L and E = James Ortiz (`QA-SCAN-B`) with role LEAD, then EMPLOYEE. One browser context per profile, viewport
  resized per width (390×844, 768×1024, 1024×768, 1440×900), reduced motion.
- **Runs:**

| Run | Build | Settings | What it captured |
|---|---|---|---|
| p1 | production | Rondo AI on (Owner and Manager switches, weekly, knowledge, business imports; no AI provider), passkeys switch on, device alerts off | O, M, Mℓ: H1–H4, B3, Owner I5, Mℓ C4→C5 click-through, Mℓ grants before/after, tablet tabs. Stopped by mistake during the Lead section; its 90 captures were kept |
| p2 | production | same as p1 | L, E: H1–H4, C11, C13 (+ CSS probe), I5, I4, tablet tabs |
| d1 | development | device alerts and passkeys on; browser on `http://localhost:<port>` (the origin the harness configures) | I4 and I5 for O, M, Mℓ, L, E; B3 Owner; C11 Lead on the right and on a different origin; C13 CSS probe |
| a1 | production | device alerts on, Rondo off | C11 Lead and Employee (reproduction), I4 L and O, B3 Owner timeline |
| b3 | production | Rondo on, as p1 | B3 Owner opened three ways with a 35 s state timeline and every response body run through the browser's parser; Mℓ Things to do at tablet widths |

- **Device alerts on a production build are not possible with this harness.** `ownedDeviceEnvironment` always sets
  `FUEL_PORTAL_ORIGIN=http://localhost:<port>`, and `allowedOrigin` (`src/lib/time-corrections/http.server.ts:40-41`)
  returns null for an `http:` origin when `NODE_ENV=production`, so every write-guarded request answers
  `503 origin_unavailable` and pages show "This connection isn't secure" or "didn't load". The harness has no local https
  or trusted-origin option (`isolatedWorkspaces` has its own https origin but is refused with `production`), and its env
  can't be extended without editing `src/test`. So I4 and I5 "switch on" were captured on the **development build**,
  where an http localhost origin is allowed and `src/lib/auth/passkeys/config.ts:19-22` derives a localhost passkey origin.
- **Measured per capture** as in the earlier sweeps: family (B when the top strip is teal: ≥ 25% of the top 150 px on a
  phone, ≥ 12% of the strip under the top bar on wider screens; Mixed when visible older-kit elements (`wa- wb- wc- q- sg-
  nv- kit-`, quiet, signature) are ≥ 15 and ≥ 15% of visible elements; Older without the band), visible words in
  `main`, distinct button styles (background · border · radius · weight), distinct font sizes, controls under 32 px.
  Every capture was checked on contact sheets; Mℓ Home and Shift details were reclassified from "notice" to "rendered".

## Page by page

### H1–H4 Rondo AI, module on, every profile

- **Before:** the Mℓ, Lead and Employee runs had Rondo off ("Page not found"); the company-wide Manager got "Page not found" on H2–H4.
- **Done:** p1/p2 with every Rondo switch on and no AI provider, all five profiles at 390 and 1440 (40 captures). No generation happened; typed questions stay off.
- **Result:**

| | O | M | Mℓ | L | E |
|---|---|---|---|---|---|
| H1 Rondo AI | B 426–435w 5b | B 113–120w 2b (Manager Rondo) | B 116–123w 2b (Condado only) | Page not found | Page not found |
| H2 Weekly plan | B 38–43w 2b | Page not found | Page not found | Page not found | Page not found |
| H3 Business records | B 20–26w 1–2b (empty) | Page not found | Page not found | Page not found | Page not found |
| H4 Company knowledge | B 22–28w 0–1b (empty) | Page not found | Page not found | Page not found | Page not found |

- **Is "Page not found" intended?** Yes, by the code. `src/app/app/ai-manager/page.tsx` opens the Manager view only when both the adviser and Manager switches are on, and its comment says "Everyone else gets not found, as before". `weekly/page.tsx`, `business/page.tsx` and `knowledge/page.tsx` call `notFound()` unless the session is an Owner with company-wide authority ("the same door as the AI manager"). So a Manager, Lead or Employee gets "Page not found", never Restricted. The inventory's "–" (Restricted) marks for H2–H4 (M, Mℓ) and H1 (L, E) should read "not found". Whether hiding the pages as 404 is the right product choice is a separate question; it is consistent with how the routes were written.
- **Inspection:** H1 Owner is still the heaviest B page (four actions per item, about 4,200 px on the phone). H2 nests bordered radio groups inside a card. H3 and H4 each offer two "add" buttons for the same action (band and card), and H4 shows "No documents yet" beside "0 of 20". The Manager's Rondo ends with "Typed questions are off", which explains a feature that isn't there. At 1440 the location Manager's top bar has no search field.

### C5 Find cover, location Manager, from a real Condado shift

- **Before:** a typed link (no `week`) bounced to `/app/schedule?error=INVALID_SHIFT`.
- **Done:** as Daniel, opened Schedule (scoped view), clicked the first Condado shift (Sofía Méndez, Mon Nov 16, 7:00–3:00), landed on Shift details; counted Find cover links on both pages; then opened Find cover for that shift's own slot (with `week`, the format the app's links use), and the Owner's own Find cover link for a Condado gap (read from the Owner's Schedule), in Daniel's session.
- **Result:** the scoped Schedule and Shift details have **no Find cover link** (0 on each). Shift details is the older scoped view: "Changing this shift requires company-wide access". Both Find cover URLs answer **"Company-wide access needed"** (B notice). Cause: `src/app/app/schedule/coverage/page.tsx` loads through `withOperationalCompany` (`src/lib/company-access/operational-scope.server.ts:243`, which refuses any scope other than COMPANY). So Find cover is unreachable for a location Manager by design, and the inventory's Mℓ "✓" for C5 should be "n".
- **Inspection:** the notice is a clean B card with one action. The problem is the flow: a location Manager who sees a gap at Condado has no way to act on it from any screen.

### I4 Device alerts and I5 Passkeys, switches on, O, M, Mℓ, L, E

- **Before:** device alerts on a production build failed with "This connection isn't secure"; I5 was band-only for the Lead and redirected for the others.
- **Done:** d1 (development build, both switches on, browser on the configured localhost origin) for all five profiles at 390 and 1440; p1/p2 kept the production state with passkeys on (the failing case); a1 kept I4 on production with alerts on.
- **Result:**
  - **O, M, Mℓ:** I4 and I5 redirect to `/app/profile#profile-device-alerts` / `#profile-passkeys` by design (`device-alerts/page.tsx` and `passkeys/page.tsx` redirect every role but Employee and Lead). With the switches on, the Profile shows the "Alerts on this device" row (a link row) and the Passkeys row, which opens "Sign in with your face…" and "Add a passkey". On production the Owner's Passkeys row opens **"Couldn't load your passkeys. Try again"** next to an enabled "Add a passkey" (root cause below).
  - **L, E, I4:** "Setup needs a check" with Check again and a red-outlined "Turn off alerts", then a second warning line saying setup could not finish. Headless Chromium has no push service, so this is the expected state here, not a bug; a real browser would reach "on".
  - **L, E, I5:** works on development: "Saved passkeys · No saved passkeys", one filled "Add a passkey", a footnote (52 words, 1 button style). On production: **band only, no body** for both the Lead and the Employee.
- **Inspection:** Manager and location Manager Profiles are long (about 190 words) and Mixed (64–66 visible older-kit elements); they list the three grants as "Not granted" and repeat "Jose Natal can change this". On I4, two messages say the same thing and the destructive "Turn off alerts" is heavier than the primary action.

### Location Manager with Approve time off and Review time exceptions

- **Before:** only Publish schedules had been tried.
- **Done:** captured E1, D2, D1, D3 (for Sofía Méndez, Condado) and B4 as Daniel without grants, then the Owner granted `APPROVE_LEAVE` and `REVIEW_TIME_EXCEPTION` at Condado through `grantOwnedManagerWorkforcePermission` (the app's `applyWorkforceCommand`), and the same pages were captured again in the same session.
- **Result:**

| # | Without grants | With both grants |
|---|---|---|
| E1 Time off | notice "Time off is decided by an Owner" | **opens**: Time off requests (Waiting / Approved / Declined), "You're all caught up" |
| D2 Time corrections | "Company-wide access needed" | **unchanged**: "Company-wide access needed" |
| D1 Timecards | "Company-wide access needed" | unchanged |
| D3 Fix someone's time | "Company-wide access needed" | unchanged |
| B4 Things to do | "You don't have access" card and toast | unchanged |

- **Findings:** (1) Review time exceptions does not open D2 for a location Manager; D2/D1/D3 stay company-scope only. (2) E1 opens but says "You're all caught up" although the seed has a waiting request from Carlos Vega, whose home location is Condado; worth a data check (it could be a scoping rule by location of the request rather than the person). (3) E1's back link goes to Things to do, which this Manager can't open, and nothing in the sidebar or phone tabs leads to E1. The pages' own links to a request or correction were followed where present; none were offered.

### Tablet widths, 768 and 1024, every profile

- **Done:** Home, Schedule, Timecards or My time, Team, Payroll or My pay, Things to do or Requests for O, M, Mℓ (6 each) and L, E (5 each: they have no Team), 56 captures. The Mℓ Things to do pair was retaken in b3 after a1's copy was contaminated by the alerts-on origin.
- **Result:** every page lays out at both widths without horizontal scroll. 768 uses a labelled icon rail, 1024 an icon-only rail. Notes: the Owner/Manager Schedule grid still fits at 768 but truncates cells ("Front co…"), and Sunday cells wrap. The Lead/Employee Home truncates its quick-action tiles at 768 ("Can't w…", "Swap s…", "Fix my t…") and shows the shift time twice (hero and card). The location Manager's Home, Schedule and Team are the older scoped views at both widths. The Lead/Employee Schedule says "2 open shifts to pick up" while Posted open shifts says there are none (two different lists).

## The four failing pages

### B3 Notifications (Owner)

- **Before:** "Notifications didn't load" in two runs; the Manager's loads; no `/api` failure recorded.
- **Done:** p1 (failed again), d1 development build (loaded), a1 production with Rondo off (loaded), b3 production with Rondo on: opened three times with the panel's text sampled every 500 ms for 35 s, every `/api/notifications` body run through the browser's own parser (`parseEmployeeView`) in the test process, plus an in-process replay of the server read through its own read manifest.
- **Result:** every response was `200` with a ready list (5 items, 1.8 KB) that parses cleanly on the client; the server read has no SQL or manifest errors (52 of 64 distinct reads). Yet in b3's first opening the panel showed the list at 3.4 s and switched to "Notifications didn't load" at 12.9 s; the second opening was showing the error when it was captured; the third stayed loaded. It is intermittent and timing-dependent. See [Root causes](#b3-notifications-owner-1).
- **Inspection (when it loads):** Mixed (15–19 visible `q-` elements), segmented All/Unread on the band, three summary rows. The row title "Things to do are waiting for you" repeats the page it links to.

### C11 Availability agreement (Lead)

- **Before:** "The agreement didn't load" at both widths for the Lead; the Employee's loads.
- **Done:** p2 (production, device alerts off) for Lead and Employee; a1 (production, device alerts on, the earlier Lead run's setting) for both; d1 for the Lead on the configured origin and on a different one.
- **Result:** with alerts off the Lead's agreement **loads** (32 words, "Nothing agreed yet", "Ask for agreed times"). With alerts on, **both the Lead and the Employee** fail: the read POST to `/api/employee/scheduling-restrictions` returns `503` with `x-nevora-failure: origin_unavailable`. On development with a mismatched origin the page says "This page is out of date" (`403 origin_mismatch`). The earlier difference was the run's settings (the Lead run had alerts on, the Employee run had them off), not the role.

### I5 Passkeys (Lead, switch on) and the Owner's Profile

- **Before:** band only for the Lead; the Owner's Profile showed an error.
- **Done:** p1/p2 production (passkeys on, no passkey origin): Owner, Lead, Employee; d1 development (working passkeys) for all five.
- **Result:** production: `GET /api/auth/passkeys` → `404 {"error":"not_supported"}`. Lead and Employee get the band with nothing under it (2 words). The Owner's Profile row opens "Couldn't load your passkeys. Try again" next to an enabled "Add a passkey". Development: everything renders (see I4/I5 above).

### C13 Posted open shifts (Lead, Employee)

- **Before:** the empty message was white on the light canvas at 1440.
- **Done:** p2 for both, with a Chrome DevTools Protocol probe of the matched CSS rules on the empty `p.q-help` at 1440; repeated on d1.
- **Result:** reproduced for both. Computed colour `rgb(255 255 255 / 0.86)`. Winning rule: `html body .app-shell[data-nv-b] .q-page > .q-hd + :is(.wc-intro, p:not(.q-sr))` → `color: var(--b-on-band-2) !important` inside `@media (min-width: 768px)`. At 390 the same line is grey and readable, but has no card.

## Root causes

Everything below was seen on the old code (`83ba756b`). Codex has since pushed fixes to `claude-codex-collab-nevora`
(tip `9a54e141`). Checked with `git log 9a54e141 -- <file>`:

| # | Seen on `83ba756b` | Upstream |
|---|---|---|
| B3 | List loads, then turns into "Notifications didn't load" (intermittent timing race in the snapshot controller) | **Not fixed.** `d3f3b8d3` records evidence only: the failure was not reproduced there, and the client deadline was left as a hypothesis. `src/lib/private-snapshot-client.ts` and `src/components/employee-account-panel.tsx` are unchanged since `e89784d3` (Nov 19). This sweep reproduced it on production (b3, see below), so it is still open |
| C11 | "The agreement didn't load" only with device alerts on (harness origin) | **Verified upstream in `aa9f9f2b`** (a PostgreSQL regression for a Lead's agreement; no app change). Consistent with this sweep: the Lead's agreement loads without the alerts-on origin |
| I5 | Band only for Lead and Employee; Owner Profile error, both on `not_supported` | **Fixed upstream in `be73a728`** (`employee-mobile/passkeys.tsx`, `passkeys/passkey-section.tsx`, `lib/passkeys/copy.ts`) |
| C13 | White empty line on the canvas at ≥ 768 px | **Fixed upstream in `c84c2375`** (`open-shift-board.tsx`: the empty line is now a card) |

The captures in this file are of the old code; they were not retaken on `9a54e141`.

### B3 Notifications (Owner)

- **Where:** `src/lib/private-snapshot-client.ts:42`, `:47` and `:48`, with `src/components/employee-account-panel.tsx:64`.
- **Cause:** after a ready read, the controller arms an expiry timer for the snapshot's remaining validity (`remaining = validForMs − round trip`, line 42/47) and schedules the renewal at 70% of it (line 48). The server caps validity at 15 s and subtracts its own read time (`src/lib/data/portal-notification-list.server.ts:65`, `:130`), so the Owner gets about 12 s, about 9 s remain after the round trip, and the renewal starts about 6.5 s in, leaving about 2.8 s for it to finish. The Owner's read takes 1.5–3.3 s in production (a second poller on the page, most likely the top bar's bell, requests the same endpoint at the same moment; the Manager's takes 1.0–1.3 s). When the renewal is slower than that margin, the expiry fires first, aborts the renewal (the `net::ERR_ABORTED` request in b3) and, because the panel passes `()=>'read_failed'` as the expiry reason (`employee-account-panel.tsx:64`), replaces the list with "Notifications didn't load". The next try comes 30 s later. The server, the data and the parser are all fine, which is why no `/api` failure was ever recorded. The Manager's lighter read and the development run happened to finish inside the margin.
- **Likely fix:** renew earlier with a fixed safety margin (for example at `remaining − max(4 s, 40%)`) or keep showing the current list while a renewal is in flight instead of expiring it to an error.

### C11 Availability agreement (Lead)

- **Where:** `src/test/integration/owned-next-app.ts:160` (device alerts set `FUEL_PORTAL_ORIGIN=http://localhost:<port>`) meets `src/lib/time-corrections/http.server.ts:40-41` (production refuses a non-https configured origin) and `:80` (`503 origin_unavailable`); the agreement read is a POST through that guard (`src/lib/scheduling/restrictions-route.server.ts`, `correctionBoundaryResponse(request,true,…)`), and the client turns any non-200 into "didn't load" (`src/lib/scheduling/restrictions-client.ts:97`).
- **Cause:** a harness configuration, not the Lead role or a page bug: the earlier Lead run had device alerts on; the Employee run didn't. With alerts on, the Employee fails identically (a1).
- **Likely fix:** in the harness, set the device-alert origin only for development runs (or give production an https origin); in the app, consider showing the shared "This connection isn't secure" message for `origin_unavailable` instead of a generic "didn't load".

### I5 Passkeys

- **Where (band only, Lead and Employee):** `src/components/employee-mobile/passkeys.tsx:19` returns `null` when the phase is `disabled`; `src/lib/passkeys/management.ts:48` maps the API's `404 not_supported` to `disabled`; `src/app/app/profile/passkeys/page.tsx:18` still renders the hero, so only the band shows. The API says not supported because production has no `NEVORA_PASSKEY_ORIGIN`/`NEVORA_PASSKEY_RP_ID` (`src/lib/auth/passkeys/config.ts:24-26`), which the harness never sets.
- **Where (Owner's Profile error):** `src/components/passkeys/passkey-section.tsx:36` and `:41` map every non-ok result, including `not_supported`, to `failed`, and `src/components/passkeys/passkey-desktop-view.tsx:21` renders "Couldn't load your passkeys. Try again".
- **Likely fix:** when the server answers `not_supported`, hide the Profile row and redirect (or show a one-line "Passkeys aren't available here") on the Passkeys page instead of an empty band; for the harness, pass a passkey origin when it can (it can't on plain http in production).

### C13 Posted open shifts

- **Where:** `src/app/app/owner-b-desktop.css:414` (inside the ≥ 768 px block), with `--b-on-band-2: rgb(255 255 255 / 0.86)` from `src/app/b-tokens.css:26`. The page: `src/app/app/exchange/open-shifts/open-shift-board.tsx:127` renders the empty line as a bare `<p className="q-help">` right after `QuietHeader`.
- **Cause:** the rule treats the first non-screen-reader paragraph after a Quiet header as the band's intro line and paints it in band text colour. Line 413 extends the band behind such a paragraph with `border-image-outset`, but on this page the band ends above it, so white text lands on the light canvas. When the board has shifts, a list follows the header and nothing matches.
- **Likely fix:** render the empty state as a card (`BState`/`CorpCard`, like the managers' branch) or exclude `.q-help` from the band-intro selector (`p:not(.q-sr):not(.q-help)`).

## Still unreachable, and why

- **Find cover (C5) for a location Manager:** no link to it from any scoped page, and the page refuses non-company scope (`withOperationalCompany`). Unblocked only by a product change (scoped coverage) or company-wide access.
- **D1, D2, D3 for a location Manager, even with Review time exceptions:** all company-scope only. Same answer.
- **H2–H4 for anyone but the Owner, H1 for Lead/Employee:** `notFound()` by design.
- **I4/I5 with switches on in a production build:** the harness can only give an `http:` origin, which production refuses for writes, and passkeys need an https origin. Would need a local https front (a TLS proxy with a trusted test certificate) plus harness options to set the portal and passkey origins; both require changing `src/test/integration/owned-next-app.ts`, which was out of scope. Captured on development instead.
- **Device alerts actually "on":** headless Chromium has no push service, so the page stops at "Setup needs a check". A headed browser with a push service (or a stubbed `PushManager`) would reach the on state.
- **Real Rondo answers:** no AI provider by rule; pages show their ready and empty states only.

## Gaps

- Keyboard and focus order, hover and normal motion were not re-checked in these runs (reduced motion only).
- The location Manager's request and correction detail pages: the granted list was empty, so there was nothing to open.
- My seed ran without `NEVORA_PAYROLL_ENABLED=true` in the test process (`desk.sh` sets it), so the pay-settings seed step failed: the Owner's Payroll tablet captures show "No pay schedule yet" instead of the earlier sweep's schedule. One Owner "today" clock-state step also failed on a duplicate open time entry; Home and Timecards still show clocked-in people.
- p1 was stopped by mistake mid-run; its scan log (the first B3 replay and the C5 link counts) was lost. B3 was rerun in b3 and C5's counts come from the saved screenshots and records.

## Top design problems from these captures

1. **Notifications can blank themselves** (B3): a loaded list turns into an error a few seconds later for the Owner, on production timing.
2. **Posted open shifts is unreadable on desktop and bare on the phone** (C13): white text on the canvas at ≥ 768 px; no card at any width.
3. **Passkeys fail loudly or silently** (I5): an empty band for employees, a red error with an enabled Add button for the Owner, when the feature simply isn't available.
4. **The location Manager's grants half-work** (E1, D2): Approve time off opens a list that may be missing Condado requests and whose back link is a dead end; Review time exceptions opens nothing. Find cover has no door at all.
5. **The location Manager still gets the older look** at every width (Home, Schedule, Team, Shift details), now confirmed at 768 and 1024 too.
6. **Rondo Owner page density** (H1): four actions under every item, about 430 words; H3/H4 duplicate their Add action.
7. **Tablet truncation** on the Lead/Employee Home quick actions and the Schedule grid cells at 768.
8. **Double messages:** Things to do for Mℓ (card + toast with the same sentence), device alerts setup (card + warning line).

## Every capture

Profile Mℓ thumbnails use `Ml`. Run and settings per row are in the JSON (`run`, `build`, `tag`).

| # | Profile | Run | Width | Final URL | State | Family | Words | Btn styles | Text sizes | Notable problem |
|---|---|---|---|---|---|---|---|---|---|---|
| H1 | O | p1 | 390 | `/app/ai-manager` | rendered | B | 426 | 5 | 8 | Same page as the earlier sweep: ~430 words, 5 button styles; four plain-text actions per item ('Review source', 'Track this issue', 'Later · 1 hour', 'Not relevant today') repeat on every item |
| H1 | O | p1 | 1440 | `/app/ai-manager` | rendered | B | 435 | 5 | 9 | Same page as the earlier sweep: ~430 words, 5 button styles; four plain-text actions per item ('Review source', 'Track this issue', 'Later · 1 hour', 'Not relevant today') repeat on every item |
| H2 | O | p1 | 390 | `/app/ai-manager/weekly` | rendered | B | 38 | 2 | 5 | Two radio groups and one button; fine. Week stepper and radio rows read as form controls, not B rows |
| H2 | O | p1 | 1440 | `/app/ai-manager/weekly` | rendered | B | 43 | 2 | 6 | Two radio groups and one button; fine. Week stepper and radio rows read as form controls, not B rows |
| H3 | O | p1 | 390 | `/app/ai-manager/business` | rendered | B | 20 | 1 | 5 | Empty state: 'Add' in the band and 'Add a record' in the card do the same thing |
| H3 | O | p1 | 1440 | `/app/ai-manager/business` | rendered | B | 26 | 2 | 5 | Empty state: 'Add' in the band and 'Add a record' in the card do the same thing |
| H4 | O | p1 | 390 | `/app/ai-manager/knowledge` | rendered | B | 22 | 0 | 6 | Empty state: 'Add' in the band, 'Add document' in the list and the profile row; 'No documents yet' next to '0 of 20' |
| H4 | O | p1 | 1440 | `/app/ai-manager/knowledge` | rendered | B | 28 | 1 | 7 | Empty state: 'Add' in the band, 'Add document' in the list and the profile row; 'No documents yet' next to '0 of 20' |
| B3 | O | p1 | 390 | `/app/notifications` | error | B | 9 | 3 | 5 | FAILING: 'Notifications didn't load' although /api/notifications answered 200 with a ready list; the panel's renewal loses a race with its own expiry timer (see Root causes) |
| B3 | O | p1 | 1440 | `/app/notifications` | error | B | 8 | 3 | 4 | FAILING: 'Notifications didn't load' although /api/notifications answered 200 with a ready list; the panel's renewal loses a race with its own expiry timer (see Root causes) |
| I5 | O | p1 | 390 | `/app/profile#profile-passkeys` | redirected | Mixed | 93 | 3 | 8 | FAILING: Profile → Passkeys opens 'Couldn't load your passkeys. Try again' plus 'Add a passkey', because the API answers 404 not_supported (no passkey origin in production) |
| I5 | O | p1 | 1440 | `/app/profile#profile-passkeys` | redirected | Mixed | 92 | 3 | 7 | FAILING: Profile → Passkeys opens 'Couldn't load your passkeys. Try again' plus 'Add a passkey', because the API answers 404 not_supported (no passkey origin in production) |
| B1 (tab) | O | p1 | 768 | `/app` | rendered | B | 213 | 1 | 11 | 768: rail with labels, 4 hero facts, quick actions shorten ('Add emp…', 'Send up…'); 1024: icon-only rail, two columns; 11 text sizes |
| B1 (tab) | O | p1 | 1024 | `/app` | rendered | B | 234 | 1 | 11 | 768: rail with labels, 4 hero facts, quick actions shorten ('Add emp…', 'Send up…'); 1024: icon-only rail, two columns; 11 text sizes |
| C1 (tab) | O | p1 | 768 | `/app/schedule` | rendered | B | 527 | 6 | 12 | 768: the people × days grid still fits but cells truncate ('Front co…'); 'No pay rates' card sits above the grid; 527–538 words |
| C1 (tab) | O | p1 | 1024 | `/app/schedule` | rendered | B | 538 | 6 | 11 | 768: the people × days grid still fits but cells truncate ('Front co…'); 'No pay rates' card sits above the grid; 527–538 words |
| D1 (tab) | O | p1 | 768 | `/app/timecards` | rendered | B | 168 | 4 | 9 | Table fits at 768 (columns Recorded, Breaks, Status); status pills repeat 'Correction waiting' |
| D1 (tab) | O | p1 | 1024 | `/app/timecards` | rendered | B | 168 | 4 | 9 | Table fits at 768 (columns Recorded, Breaks, Status); status pills repeat 'Correction waiting' |
| F1 (tab) | O | p1 | 768 | `/app/employees` | rendered | B | 125 | 3 | 9 | 768: one column; 1024: list plus a side card; fine |
| F1 (tab) | O | p1 | 1024 | `/app/employees` | rendered | B | 125 | 3 | 9 | 768: one column; 1024: list plus a side card; fine |
| G1 (tab) | O | p1 | 768 | `/app/payroll` | rendered | B | 70 | 1 | 10 | Fine: tabs, empty pay-schedule card, recent payrolls |
| G1 (tab) | O | p1 | 1024 | `/app/payroll` | rendered | B | 70 | 1 | 10 | Fine: tabs, empty pay-schedule card, recent payrolls |
| B4 (tab) | O | p1 | 768 | `/app/inbox` | rendered | B | 374 | 4 | 8 | 374 words; Find cover buttons stack at 768; 1024 adds a side list |
| B4 (tab) | O | p1 | 1024 | `/app/inbox` | rendered | B | 374 | 4 | 8 | 374 words; Find cover buttons stack at 768; 1024 adds a side list |
| H1 | M | p1 | 390 | `/app/ai-manager` | rendered | B | 113 | 2 | 5 | Manager Rondo: four fixed questions; the footnote 'Typed questions are off' explains a feature that isn't there |
| H1 | M | p1 | 1440 | `/app/ai-manager` | rendered | B | 120 | 2 | 5 | Manager Rondo: four fixed questions; the footnote 'Typed questions are off' explains a feature that isn't there |
| H2 | M | p1 | 390 | `/app/ai-manager/weekly` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only tool; the page calls notFound() for every other role, by design) |
| H2 | M | p1 | 1440 | `/app/ai-manager/weekly` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only tool; the page calls notFound() for every other role, by design) |
| H3 | M | p1 | 390 | `/app/ai-manager/business` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only tool; by design) |
| H3 | M | p1 | 1440 | `/app/ai-manager/business` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only tool; by design) |
| H4 | M | p1 | 390 | `/app/ai-manager/knowledge` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only tool; by design) |
| H4 | M | p1 | 1440 | `/app/ai-manager/knowledge` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only tool; by design) |
| B3 | M | p1 | 390 | `/app/notifications` | rendered | Mixed | 40 | 3 | 5 | Loads: 3 rows; older-kit (q-) list under the band; a summary row's title 'Things to do are waiting for you' repeats the page it links to |
| B3 | M | p1 | 1440 | `/app/notifications` | rendered | Mixed | 39 | 3 | 5 | Loads: 3 rows; older-kit (q-) list under the band; a summary row's title 'Things to do are waiting for you' repeats the page it links to |
| B1 (tab) | M | p1 | 768 | `/app` | rendered | B | 218 | 1 | 11 | Same as the Owner's; 11 text sizes |
| B1 (tab) | M | p1 | 1024 | `/app` | rendered | B | 239 | 1 | 11 | Same as the Owner's; 11 text sizes |
| C1 (tab) | M | p1 | 768 | `/app/schedule` | rendered | B | 451 | 5 | 11 | Same grid as the Owner's without the pay card; ~455 words |
| C1 (tab) | M | p1 | 1024 | `/app/schedule` | rendered | B | 462 | 5 | 10 | Same grid as the Owner's without the pay card; ~455 words |
| D1 (tab) | M | p1 | 768 | `/app/timecards` | rendered | B | 168 | 4 | 9 | Table fits at 768 (columns Recorded, Breaks, Status); status pills repeat 'Correction waiting' |
| D1 (tab) | M | p1 | 1024 | `/app/timecards` | rendered | B | 168 | 4 | 9 | Table fits at 768 (columns Recorded, Breaks, Status); status pills repeat 'Correction waiting' |
| F1 (tab) | M | p1 | 768 | `/app/employees` | rendered | B | 126 | 3 | 9 | Same as the Owner's |
| F1 (tab) | M | p1 | 1024 | `/app/employees` | rendered | B | 126 | 3 | 9 | Same as the Owner's |
| G1 (tab) | M | p1 | 768 | `/app/payroll` | notice | B | 22 | 1 | 3 | 'Payroll is for Owners' notice |
| G1 (tab) | M | p1 | 1024 | `/app/payroll` | notice | B | 22 | 1 | 3 | 'Payroll is for Owners' notice |
| B4 (tab) | M | p1 | 768 | `/app/inbox` | rendered | B | 329 | 4 | 8 | 329 words; same layout as the Owner's |
| B4 (tab) | M | p1 | 1024 | `/app/inbox` | rendered | B | 329 | 4 | 8 | 329 words; same layout as the Owner's |
| H1 | Mℓ | p1 | 390 | `/app/ai-manager` | rendered | B | 116 | 2 | 5 | Same as the company-wide Manager, location fixed to Condado (shown as plain text, not a control) |
| H1 | Mℓ | p1 | 1440 | `/app/ai-manager` | rendered | B | 123 | 2 | 5 | Same as the company-wide Manager, location fixed to Condado (shown as plain text, not a control) |
| H2 | Mℓ | p1 | 390 | `/app/ai-manager/weekly` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only tool; by design) |
| H2 | Mℓ | p1 | 1440 | `/app/ai-manager/weekly` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only tool; by design) |
| H3 | Mℓ | p1 | 390 | `/app/ai-manager/business` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only tool; by design) |
| H3 | Mℓ | p1 | 1440 | `/app/ai-manager/business` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only tool; by design) |
| H4 | Mℓ | p1 | 390 | `/app/ai-manager/knowledge` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only tool; by design) |
| H4 | Mℓ | p1 | 1440 | `/app/ai-manager/knowledge` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only tool; by design) |
| C4 (from-schedule) | Mℓ | p1 | 390 | `/app/schedule/edit?shiftId=own-this-OWN-SOFI-0` | rendered | Older | 28 | 1 | 4 | Older scoped view, opened by clicking a Condado shift on Schedule: no band, 'Changing this shift requires company-wide access', no Find cover link |
| C4 (from-schedule) | Mℓ | p1 | 1440 | `/app/schedule/edit?shiftId=own-this-OWN-SOFI-0` | rendered | Older | 28 | 1 | 3 | Older scoped view, opened by clicking a Condado shift on Schedule: no band, 'Changing this shift requires company-wide access', no Find cover link |
| C5 (shift-slot) | Mℓ | p1 | 390 | `/app/schedule/coverage?week=2026-11-16&date=2026-11-16&lo…` | notice | B | 21 | 1 | 3 | Find cover for that same Condado shift's slot: 'Company-wide access needed' (the coverage page requires company scope) |
| C5 (shift-slot) | Mℓ | p1 | 1440 | `/app/schedule/coverage?week=2026-11-16&date=2026-11-16&lo…` | notice | B | 21 | 1 | 3 | Find cover for that same Condado shift's slot: 'Company-wide access needed' (the coverage page requires company scope) |
| C5 (owner-link) | Mℓ | p1 | 390 | `/app/schedule/coverage?week=2026-11-16&date=2026-11-22&lo…` | notice | B | 21 | 1 | 3 | The Owner's own Find cover link for a Condado gap, opened as Daniel: 'Coverage review · Company-wide access needed' |
| C5 (owner-link) | Mℓ | p1 | 1440 | `/app/schedule/coverage?week=2026-11-16&date=2026-11-22&lo…` | notice | B | 21 | 1 | 3 | The Owner's own Find cover link for a Condado gap, opened as Daniel: 'Coverage review · Company-wide access needed' |
| E1 (nogrant) | Mℓ | p1 | 390 | `/app/requests` | notice | B | 31 | 1 | 3 | Dead end: 'Time off is decided by an Owner' with two exits |
| E1 (nogrant) | Mℓ | p1 | 1440 | `/app/requests` | notice | B | 31 | 1 | 3 | Dead end: 'Time off is decided by an Owner' with two exits |
| D2 (nogrant) | Mℓ | p1 | 390 | `/app/timecards/corrections` | notice | B | 21 | 1 | 3 | 'Company-wide access needed' |
| D2 (nogrant) | Mℓ | p1 | 1440 | `/app/timecards/corrections` | notice | B | 21 | 1 | 3 | 'Company-wide access needed' |
| D1 (nogrant) | Mℓ | p1 | 390 | `/app/timecards` | notice | B | 20 | 1 | 3 | 'Company-wide access needed' (with or without grants) |
| D1 (nogrant) | Mℓ | p1 | 1440 | `/app/timecards` | notice | B | 20 | 1 | 3 | 'Company-wide access needed' (with or without grants) |
| D3 (nogrant) | Mℓ | p1 | 390 | `/app/timecards/corrections/new/OWN-SOFI` | notice | B | 21 | 1 | 3 | 'Company-wide access needed' for a Condado employee (with or without grants) |
| D3 (nogrant) | Mℓ | p1 | 1440 | `/app/timecards/corrections/new/OWN-SOFI` | notice | B | 21 | 1 | 3 | 'Company-wide access needed' for a Condado employee (with or without grants) |
| B4 (nogrant) | Mℓ | p1 | 390 | `/app/inbox` | notice | B | 61 | 2 | 6 | 'You don't have access to Things to do' card plus the same message as a toast, over a list of links |
| B4 (nogrant) | Mℓ | p1 | 1440 | `/app/inbox` | notice | B | 60 | 2 | 6 | 'You don't have access to Things to do' card plus the same message as a toast, over a list of links |
| E1 (grants) | Mℓ | p1 | 390 | `/app/requests` | rendered | B | 20 | 0 | 5 | With Approve time off: the list opens but shows 'You're all caught up' although Carlos Vega (Condado) has a waiting request; back link goes to Things to do, which this Manager can't open; no sidebar entry |
| E1 (grants) | Mℓ | p1 | 1440 | `/app/requests` | rendered | B | 20 | 0 | 4 | With Approve time off: the list opens but shows 'You're all caught up' although Carlos Vega (Condado) has a waiting request; back link goes to Things to do, which this Manager can't open; no sidebar entry |
| D2 (grants) | Mℓ | p1 | 390 | `/app/timecards/corrections` | notice | B | 21 | 1 | 3 | Still 'Company-wide access needed' with Review time exceptions granted: the grant does not open this page for a location Manager |
| D2 (grants) | Mℓ | p1 | 1440 | `/app/timecards/corrections` | notice | B | 21 | 1 | 3 | Still 'Company-wide access needed' with Review time exceptions granted: the grant does not open this page for a location Manager |
| D1 (grants) | Mℓ | p1 | 390 | `/app/timecards` | notice | B | 20 | 1 | 3 | 'Company-wide access needed' (with or without grants) |
| D1 (grants) | Mℓ | p1 | 1440 | `/app/timecards` | notice | B | 20 | 1 | 3 | 'Company-wide access needed' (with or without grants) |
| D3 (grants) | Mℓ | p1 | 390 | `/app/timecards/corrections/new/OWN-SOFI` | notice | B | 21 | 1 | 3 | 'Company-wide access needed' for a Condado employee (with or without grants) |
| D3 (grants) | Mℓ | p1 | 1440 | `/app/timecards/corrections/new/OWN-SOFI` | notice | B | 21 | 1 | 3 | 'Company-wide access needed' for a Condado employee (with or without grants) |
| B4 (grants) | Mℓ | p1 | 390 | `/app/inbox` | notice | B | 61 | 2 | 6 | Unchanged with grants: the same double 'no access' message |
| B4 (grants) | Mℓ | p1 | 1440 | `/app/inbox` | notice | B | 60 | 2 | 6 | Unchanged with grants: the same double 'no access' message |
| B1 (tab) | Mℓ | p1 | 768 | `/app` | rendered | Older | 61 | 3 | 5 | Older scoped Home: no band, white header, 'Your managed locations' card and a Clocked in now card |
| B1 (tab) | Mℓ | p1 | 1024 | `/app` | rendered | Older | 61 | 3 | 5 | Older scoped Home: no band, white header, 'Your managed locations' card and a Clocked in now card |
| C1 (tab) | Mℓ | p1 | 768 | `/app/schedule` | rendered | Older | 392 | 2 | 7 | Older scoped schedule: no band, 392 words of day cards, a separate 'Show schedule' button |
| C1 (tab) | Mℓ | p1 | 1024 | `/app/schedule` | rendered | Older | 392 | 2 | 7 | Older scoped schedule: no band, 392 words of day cards, a separate 'Show schedule' button |
| D1 (tab) | Mℓ | p1 | 768 | `/app/timecards` | notice | B | 20 | 1 | 3 | 'Company-wide access needed' (Timecards is on the Manager's rail but opens a notice) |
| D1 (tab) | Mℓ | p1 | 1024 | `/app/timecards` | notice | B | 20 | 1 | 3 | 'Company-wide access needed' (Timecards is on the Manager's rail but opens a notice) |
| F1 (tab) | Mℓ | p1 | 768 | `/app/employees` | rendered | Older | 131 | 0 | 4 | Older scoped directory: no band, 131 words, contact rows |
| F1 (tab) | Mℓ | p1 | 1024 | `/app/employees` | rendered | Older | 131 | 0 | 4 | Older scoped directory: no band, 131 words, contact rows |
| G10 (tab) | Mℓ | p1 | 768 | `/app/my-pay` | rendered | B | 11 | 0 | 4 | 'No statements yet' (11 words) |
| G10 (tab) | Mℓ | p1 | 1024 | `/app/my-pay` | rendered | B | 11 | 0 | 4 | 'No statements yet' (11 words) |
| H1 | L | p2 | 390 | `/app/ai-manager` | not reachable | B | 24 | 1 | 4 | Page not found with Rondo on (Rondo is for Owners and Managers; the page calls notFound(), not Restricted) |
| H1 | L | p2 | 1440 | `/app/ai-manager` | not reachable | B | 23 | 1 | 3 | Page not found with Rondo on (Rondo is for Owners and Managers; the page calls notFound(), not Restricted) |
| H2 | L | p2 | 390 | `/app/ai-manager/weekly` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only; by design) |
| H2 | L | p2 | 1440 | `/app/ai-manager/weekly` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only; by design) |
| H3 | L | p2 | 390 | `/app/ai-manager/business` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only; by design) |
| H3 | L | p2 | 1440 | `/app/ai-manager/business` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only; by design) |
| H4 | L | p2 | 390 | `/app/ai-manager/knowledge` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only; by design) |
| H4 | L | p2 | 1440 | `/app/ai-manager/knowledge` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only; by design) |
| C11 | L | p2 | 390 | `/app/availability/agreement` | rendered | B | 32 | 1 | 5 | Loads for the Lead with device alerts off: 'Nothing agreed yet' and 'Ask for agreed times' |
| C11 | L | p2 | 1440 | `/app/availability/agreement` | rendered | B | 32 | 1 | 4 | Loads for the Lead with device alerts off: 'Nothing agreed yet' and 'Ask for agreed times' |
| C13 | L | p2 | 390 | `/app/exchange/open-shifts` | rendered | B | 15 | 0 | 3 | FAILING at 1440: the empty line is white text (rgb 255 255 255 / .86) on the light canvas; at 390 it is grey and readable but has no card |
| C13 | L | p2 | 1440 | `/app/exchange/open-shifts` | rendered | B | 15 | 0 | 3 | FAILING at 1440: the empty line is white text (rgb 255 255 255 / .86) on the light canvas; at 390 it is grey and readable but has no card |
| I5 | L | p2 | 390 | `/app/profile/passkeys` | rendered | B | 2 | 0 | 2 | FAILING: only the band ('Passkeys') renders, no body; the API answers 404 not_supported and the section returns null |
| I5 | L | p2 | 1440 | `/app/profile/passkeys` | rendered | B | 2 | 0 | 2 | FAILING: only the band ('Passkeys') renders, no body; the API answers 404 not_supported and the section returns null |
| I4 | L | p2 | 390 | `/app/profile/device-alerts` | notice | B | 35 | 0 | 6 | Device alerts off in this build: 'Your workplace hasn't turned on device alerts' card (notice) |
| I4 | L | p2 | 1440 | `/app/profile/device-alerts` | notice | B | 35 | 0 | 6 | Device alerts off in this build: 'Your workplace hasn't turned on device alerts' card (notice) |
| B1 (tab) | L | p2 | 768 | `/app` | rendered | B | 178 | 2 | 11 | 768: shift time shown twice (hero and card); quick-action tiles truncate ('Can't w…', 'Swap s…', 'Fix my t…'); 11 text sizes |
| B1 (tab) | L | p2 | 1024 | `/app` | rendered | B | 198 | 2 | 11 | 768: shift time shown twice (hero and card); quick-action tiles truncate ('Can't w…', 'Swap s…', 'Fix my t…'); 11 text sizes |
| C1 (tab) | L | p2 | 768 | `/app/schedule` | rendered | B | 174 | 2 | 12 | Week strip and Today card; says '2 open shifts to pick up' while Posted open shifts shows none (two different lists); 12 text sizes |
| C1 (tab) | L | p2 | 1024 | `/app/schedule` | rendered | B | 183 | 2 | 12 | Week strip and Today card; says '2 open shifts to pick up' while Posted open shifts shows none (two different lists); 12 text sizes |
| D4 (tab) | L | p2 | 768 | `/app/my-time` | rendered | B | 149 | 1 | 7 | Fine: week total, breaks, right-now card, day list |
| D4 (tab) | L | p2 | 1024 | `/app/my-time` | rendered | B | 149 | 1 | 7 | Fine: week total, breaks, right-now card, day list |
| G10 (tab) | L | p2 | 768 | `/app/my-pay` | rendered | B | 56 | 2 | 7 | Band is short and the statement card overlaps it; fine otherwise |
| G10 (tab) | L | p2 | 1024 | `/app/my-pay` | rendered | B | 56 | 2 | 7 | Band is short and the statement card overlaps it; fine otherwise |
| B5 (tab) | L | p2 | 768 | `/app/requests/hub` | rendered | B | 114 | 1 | 7 | 114 words; two summary counts then the waiting list; fine |
| B5 (tab) | L | p2 | 1024 | `/app/requests/hub` | rendered | B | 114 | 1 | 7 | 114 words; two summary counts then the waiting list; fine |
| H1 | E | p2 | 390 | `/app/ai-manager` | not reachable | B | 24 | 1 | 4 | Page not found with Rondo on (Rondo is for Owners and Managers; by design) |
| H1 | E | p2 | 1440 | `/app/ai-manager` | not reachable | B | 23 | 1 | 3 | Page not found with Rondo on (Rondo is for Owners and Managers; by design) |
| H2 | E | p2 | 390 | `/app/ai-manager/weekly` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only; by design) |
| H2 | E | p2 | 1440 | `/app/ai-manager/weekly` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only; by design) |
| H3 | E | p2 | 390 | `/app/ai-manager/business` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only; by design) |
| H3 | E | p2 | 1440 | `/app/ai-manager/business` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only; by design) |
| H4 | E | p2 | 390 | `/app/ai-manager/knowledge` | not reachable | B | 24 | 1 | 4 | Page not found (Owner-only; by design) |
| H4 | E | p2 | 1440 | `/app/ai-manager/knowledge` | not reachable | B | 23 | 1 | 3 | Page not found (Owner-only; by design) |
| C11 | E | p2 | 390 | `/app/availability/agreement` | rendered | B | 32 | 1 | 5 | Loads (same as the Lead) |
| C11 | E | p2 | 1440 | `/app/availability/agreement` | rendered | B | 32 | 1 | 4 | Loads (same as the Lead) |
| C13 | E | p2 | 390 | `/app/exchange/open-shifts` | rendered | B | 15 | 0 | 3 | FAILING at 1440: the empty line is white text (rgb 255 255 255 / .86) on the light canvas; at 390 it is grey and readable but has no card |
| C13 | E | p2 | 1440 | `/app/exchange/open-shifts` | rendered | B | 15 | 0 | 3 | FAILING at 1440: the empty line is white text (rgb 255 255 255 / .86) on the light canvas; at 390 it is grey and readable but has no card |
| I5 | E | p2 | 390 | `/app/profile/passkeys` | rendered | B | 2 | 0 | 2 | FAILING: band only, like the Lead (the earlier sweep never reached the Employee's with the switch on) |
| I5 | E | p2 | 1440 | `/app/profile/passkeys` | rendered | B | 2 | 0 | 2 | FAILING: band only, like the Lead (the earlier sweep never reached the Employee's with the switch on) |
| I4 | E | p2 | 390 | `/app/profile/device-alerts` | notice | B | 35 | 0 | 6 | Device alerts off in this build: notice card |
| I4 | E | p2 | 1440 | `/app/profile/device-alerts` | notice | B | 35 | 0 | 6 | Device alerts off in this build: notice card |
| B1 (tab) | E | p2 | 768 | `/app` | rendered | B | 158 | 2 | 11 | Same as the Lead's (truncated quick actions at 768) |
| B1 (tab) | E | p2 | 1024 | `/app` | rendered | B | 178 | 2 | 11 | Same as the Lead's (truncated quick actions at 768) |
| C1 (tab) | E | p2 | 768 | `/app/schedule` | rendered | B | 174 | 2 | 12 | Week strip and Today card; says '2 open shifts to pick up' while Posted open shifts shows none (two different lists); 12 text sizes |
| C1 (tab) | E | p2 | 1024 | `/app/schedule` | rendered | B | 183 | 2 | 12 | Week strip and Today card; says '2 open shifts to pick up' while Posted open shifts shows none (two different lists); 12 text sizes |
| D4 (tab) | E | p2 | 768 | `/app/my-time` | rendered | B | 149 | 1 | 7 | Fine: week total, breaks, right-now card, day list |
| D4 (tab) | E | p2 | 1024 | `/app/my-time` | rendered | B | 149 | 1 | 7 | Fine: week total, breaks, right-now card, day list |
| G10 (tab) | E | p2 | 768 | `/app/my-pay` | rendered | B | 56 | 2 | 7 | Band is short and the statement card overlaps it; fine otherwise |
| G10 (tab) | E | p2 | 1024 | `/app/my-pay` | rendered | B | 56 | 2 | 7 | Band is short and the statement card overlaps it; fine otherwise |
| B5 (tab) | E | p2 | 768 | `/app/requests/hub` | rendered | B | 114 | 1 | 7 | 114 words; two summary counts then the waiting list; fine |
| B5 (tab) | E | p2 | 1024 | `/app/requests/hub` | rendered | B | 114 | 1 | 7 | 114 words; two summary counts then the waiting list; fine |
| B3 | O | d1 | 390 | `/app/notifications` | rendered | Mixed | 40 | 3 | 5 | Loads on the development build: 3 rows (Things to do summaries) |
| B3 | O | d1 | 1440 | `/app/notifications` | rendered | Mixed | 39 | 3 | 5 | Loads on the development build: 3 rows (Things to do summaries) |
| I4 | O | d1 | 390 | `/app/profile#profile-device-alerts` | redirected | Mixed | 118 | 3 | 8 | Redirects to Profile → 'Alerts on this device' row (a link row, highlighted); by design for Owners |
| I4 | O | d1 | 1440 | `/app/profile#profile-device-alerts` | redirected | Mixed | 117 | 3 | 7 | Redirects to Profile → 'Alerts on this device' row (a link row, highlighted); by design for Owners |
| I5 | O | d1 | 390 | `/app/profile#profile-passkeys` | redirected | Mixed | 118 | 2 | 8 | Passkeys switch on and supported: the row opens 'Sign in with your face…' and 'Add a passkey'; value 'Not set up' |
| I5 | O | d1 | 1440 | `/app/profile#profile-passkeys` | redirected | Mixed | 117 | 2 | 7 | Passkeys switch on and supported: the row opens 'Sign in with your face…' and 'Add a passkey'; value 'Not set up' |
| I4 | M | d1 | 390 | `/app/profile#profile-device-alerts` | redirected | Mixed | 189 | 3 | 9 | Redirects to Profile → 'Alerts on this phone'; the Manager Profile still repeats 'Jose Natal can change this' and lists the three grants as 'Not granted' |
| I4 | M | d1 | 1440 | `/app/profile#profile-device-alerts` | redirected | Mixed | 188 | 3 | 7 | Redirects to Profile → 'Alerts on this phone'; the Manager Profile still repeats 'Jose Natal can change this' and lists the three grants as 'Not granted' |
| I5 | M | d1 | 390 | `/app/profile#profile-passkeys` | redirected | Mixed | 189 | 2 | 9 | Redirects to Profile → Passkeys (opens, 'Add a passkey'); same long Manager Profile |
| I5 | M | d1 | 1440 | `/app/profile#profile-passkeys` | redirected | Mixed | 188 | 2 | 7 | Redirects to Profile → Passkeys (opens, 'Add a passkey'); same long Manager Profile |
| I4 | Mℓ | d1 | 390 | `/app/profile#profile-device-alerts` | redirected | Mixed | 188 | 3 | 9 | Redirects to Profile → 'Alerts on this phone'; same layout as the company-wide Manager |
| I4 | Mℓ | d1 | 1440 | `/app/profile#profile-device-alerts` | redirected | Mixed | 187 | 3 | 7 | Redirects to Profile → 'Alerts on this phone'; same layout as the company-wide Manager |
| I5 | Mℓ | d1 | 390 | `/app/profile#profile-passkeys` | redirected | Mixed | 188 | 2 | 9 | Redirects to Profile → Passkeys (opens, 'Add a passkey') |
| I5 | Mℓ | d1 | 1440 | `/app/profile#profile-passkeys` | redirected | Mixed | 187 | 2 | 7 | Redirects to Profile → Passkeys (opens, 'Add a passkey') |
| I4 | L | d1 | 390 | `/app/profile/device-alerts` | rendered | B | 76 | 1 | 8 | Alerts on: 'Setup needs a check' card with Check again and a red-outlined 'Turn off alerts', then a second warning line saying setup could not finish (headless Chromium has no push service, so setup can't complete) |
| I4 | L | d1 | 1440 | `/app/profile/device-alerts` | rendered | B | 76 | 1 | 8 | Alerts on: 'Setup needs a check' card with Check again and a red-outlined 'Turn off alerts', then a second warning line saying setup could not finish (headless Chromium has no push service, so setup can't complete) |
| I5 | L | d1 | 390 | `/app/profile/passkeys` | rendered | B | 52 | 1 | 6 | Works on the development build: 'Saved passkeys · No saved passkeys' card, one filled 'Add a passkey', a footnote |
| I5 | L | d1 | 1440 | `/app/profile/passkeys` | rendered | B | 52 | 1 | 6 | Works on the development build: 'Saved passkeys · No saved passkeys' card, one filled 'Add a passkey', a footnote |
| C11 (localhost) | L | d1 | 390 | `/app/availability/agreement` | rendered | B | 32 | 1 | 5 | Loads on the development build with the browser on the configured localhost origin |
| C11 (localhost) | L | d1 | 1440 | `/app/availability/agreement` | rendered | B | 32 | 1 | 4 | Loads on the development build with the browser on the configured localhost origin |
| C13 (dev) | L | d1 | 1440 | `/app/exchange/open-shifts` | rendered | B | 15 | 0 | 3 | Same white empty line on the development build (CSS probe repeated) |
| C11 (other-origin) | L | d1 | 1440 | `/app/availability/agreement` | rendered | B | 22 | 1 | 4 | Same Lead on 127.0.0.1 (origin differs from the configured one): 'This page is out of date. Reload it' (403 origin_mismatch) |
| I4 | E | d1 | 390 | `/app/profile/device-alerts` | rendered | B | 76 | 1 | 8 | Alerts on: 'Setup needs a check' card with Check again and a red-outlined 'Turn off alerts', then a second warning line saying setup could not finish (headless Chromium has no push service, so setup can't complete) |
| I4 | E | d1 | 1440 | `/app/profile/device-alerts` | rendered | B | 76 | 1 | 8 | Alerts on: 'Setup needs a check' card with Check again and a red-outlined 'Turn off alerts', then a second warning line saying setup could not finish (headless Chromium has no push service, so setup can't complete) |
| I5 | E | d1 | 390 | `/app/profile/passkeys` | rendered | B | 52 | 1 | 6 | Works on the development build: 'Saved passkeys · No saved passkeys' card, one filled 'Add a passkey', a footnote |
| I5 | E | d1 | 1440 | `/app/profile/passkeys` | rendered | B | 52 | 1 | 6 | Works on the development build: 'Saved passkeys · No saved passkeys' card, one filled 'Add a passkey', a footnote |
| C11 (alerts-on) | L | a1 | 390 | `/app/availability/agreement` | error | B | 20 | 1 | 5 | REPRODUCED: 'The agreement didn't load'; the read POST got 503 origin_unavailable (production refuses the http portal origin) |
| C11 (alerts-on) | L | a1 | 1440 | `/app/availability/agreement` | error | B | 20 | 1 | 4 | REPRODUCED: 'The agreement didn't load'; the read POST got 503 origin_unavailable (production refuses the http portal origin) |
| I4 (alerts-on) | L | a1 | 390 | `/app/profile/device-alerts` | rendered | B | 76 | 1 | 8 | Alerts on (production): same 'Setup needs a check' state as the development build |
| I4 (alerts-on) | L | a1 | 1440 | `/app/profile/device-alerts` | rendered | B | 76 | 1 | 8 | Alerts on (production): same 'Setup needs a check' state as the development build |
| C11 (alerts-on) | E | a1 | 390 | `/app/availability/agreement` | error | B | 20 | 1 | 5 | Same failure for the Employee once device alerts are on: not a Lead problem |
| C11 (alerts-on) | E | a1 | 1440 | `/app/availability/agreement` | error | B | 20 | 1 | 4 | Same failure for the Employee once device alerts are on: not a Lead problem |
| I4 (alerts-on) | O | a1 | 390 | `/app/profile#profile-device-alerts` | redirected | Mixed | 97 | 4 | 8 | Redirects to Profile → 'Alerts on this device' (production with alerts on) |
| I4 (alerts-on) | O | a1 | 1440 | `/app/profile#profile-device-alerts` | redirected | Mixed | 96 | 4 | 7 | Redirects to Profile → 'Alerts on this device' (production with alerts on) |
| B3 (alerts-on) | O | a1 | 390 | `/app/notifications` | rendered | Mixed | 40 | 3 | 5 | Loads (production, Rondo off): 3 rows |
| B3 (alerts-on) | O | a1 | 1440 | `/app/notifications` | rendered | Mixed | 39 | 3 | 5 | Loads (production, Rondo off): 3 rows |
| B4 (tab) | Mℓ | a1 | 768 | `/app/inbox` | error (harness: discarded) | B | 72 | 2 | 6 | Discarded: harness contamination ('This connection isn't secure' from the alerts-on origin); recaptured in b3 |
| B4 (tab) | Mℓ | a1 | 1024 | `/app/inbox` | error (harness: discarded) | B | 72 | 2 | 6 | Discarded: harness contamination ('This connection isn't secure' from the alerts-on origin); recaptured in b3 |
| B3 (rondo-direct) | O | b3 | 390 | `/app/notifications` | rendered | Mixed | 40 | 3 | 5 | Loaded at 3.4 s, switched to 'Notifications didn't load' at 12.9 s, recovered on the 30 s retry (screenshot taken after the retry) |
| B3 (rondo-direct) | O | b3 | 1440 | `/app/notifications` | rendered | Mixed | 39 | 3 | 5 | Loaded at 3.4 s, switched to 'Notifications didn't load' at 12.9 s, recovered on the 30 s retry (screenshot taken after the retry) |
| B3 (rondo-after-rondo) | O | b3 | 390 | `/app/notifications` | error | B | 9 | 3 | 5 | FAILING at capture time (about 35 s in): 'Notifications didn't load' after a ready list was shown |
| B3 (rondo-after-rondo) | O | b3 | 1440 | `/app/notifications` | error | B | 8 | 3 | 4 | FAILING at capture time (about 35 s in): 'Notifications didn't load' after a ready list was shown |
| B3 (rondo-direct-again) | O | b3 | 390 | `/app/notifications` | rendered | Mixed | 40 | 3 | 5 | Loaded and stayed loaded for the 35 s window: the failure is intermittent (a timing race) |
| B3 (rondo-direct-again) | O | b3 | 1440 | `/app/notifications` | rendered | Mixed | 39 | 3 | 5 | Loaded and stayed loaded for the 35 s window: the failure is intermittent (a timing race) |
| B4 (tab) | Mℓ | b3 | 768 | `/app/inbox` | notice | B | 60 | 2 | 6 | Tablet: the double 'You don't have access' message (card and toast) at both widths |
| B4 (tab) | Mℓ | b3 | 1024 | `/app/inbox` | notice | B | 60 | 2 | 6 | Tablet: the double 'You don't have access' message (card and toast) at both widths |
