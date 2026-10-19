# Codex handoff: premium UI rebuild

Written October 19, 2026 by the Claude coordinator for Codex, from Jose's working files on his Mac. The UI chats keep working, so the chats' backend needs below are a snapshot from the time of writing. Each chat's current `CODEX.md` is on its own branch, and those branches are pushed as each one becomes ready.

Contents:
1. Jose's revised plan (October 19): the bar, the exit rule, the page inventory, the matrix, and the list set aside for Codex
2. Backend changes flagged by the earlier reviews
3. The shared brief the six UI chats follow (ownership, previews, test data, checks)
4. Each chat's backend needs (their `CODEX.md` files)

Local paths in this file, such as `/Users/josek0514/...` and `/private/tmp/...`, are on Jose's Mac and don't exist in the cloud. They're included so the context is complete.

---

## 1. Revised plan, October 19: every page, every role, every state, every device

Jose's bar for demanding clients. This section governs the build order, inspection and exit rule from Phase 3 onward. Where it differs from the earlier build-order table in PLAN.md (not copied here), this section wins.

### Exit rule for every phase

A phase is done only when all of these hold:

1. **Zero open defects.** No open P0, P1 or P2 in the five inspection areas or in the new checks below.
2. **Every check passes on the final build:** browser checks, unit tests (`npm test`), types (`npm run typecheck`) and lint (`npm run lint`).
3. **Jose sees the results.** Then Jose gets a short checklist for a real-device pass: iPhone with VoiceOver and Android with TalkBack, about an hour.

The next phase starts only after that. **Phase 3.5 doesn't start until Phase 3 meets this rule and Jose has seen the results.**

### Every page, and the phase that covers it

**Codex owns the backend.** Anything that needs server code, a server route, a database read, a mutation's real outcome or an outside delivery is set aside for joint testing with Codex (the list at the end of this section). Claude builds and inspects the UI side against the current server behaviour, or against a written contract and fixture where a server change is needed.

Nothing stays uninspected. "Done" means inspected to zero under the old matrix, and it gets the new checks in its re-run. "3" means in progress now.

| Page | Owner | Manager | Lead | Employee | Covered by |
|---|---|---|---|---|---|
| Home, and Home's Attendance, Team overview and Activity views | Done | Done | 3 | 3 | Phase 2 re-run; Phase 3 |
| Inbox | Done | Done | – | – | Phase 2 re-run |
| Time-off review (one request) | Done | Done | – | – | Phase 2 re-run |
| Time-off list | 3.5 A | 3.5 A | 3 | 3 | 3.5 Wave A; Phase 3 |
| Requests overview, My time | – | – | 3 | 3 | Phase 3 |
| Shift requests, Availability | 3.5 A | 3.5 A | 3 | 3 | 3.5 Wave A; Phase 3 |
| Swap and "Unable to work" forms | – | – | 3.5 A | 3.5 A | 3.5 Wave A |
| Schedule / My schedule | Done | Done | 3 | 3 | Phase 2 re-run; Phase 3 |
| Add shift, Edit shift, Coverage, Copy-week receipt | 3.5 A | 3.5 A | – | – | 3.5 Wave A |
| Team list | Done | Done | – | – | Phase 2 re-run |
| Team member detail | 3.5 A | 3.5 A | – | – | 3.5 Wave A |
| New employee, Clocker PIN | 3.5 A | – | – | – | 3.5 Wave A |
| Timecards | Done | Done | 3 | 3 | Phase 2 re-run; Phase 3 |
| Payroll runs | Done | 3.5 B (with payroll access) | – | – | Phase 2 re-run; 3.5 Wave B |
| Time exports | Done | Done | – | – | Phase 2 re-run |
| Payroll settings | 3.5 B | – | – | – | 3.5 Wave B |
| Insights, Templates, Scheduling rules | 3.5 B | 3.5 B | – | – | 3.5 Wave B |
| My pay | 3.5 P | 3.5 P | 3 | 3 | 3.5 Profile; Phase 3 |
| Updates list, Notifications | 3 | 3 | 3 | 3 | Phase 3 (shared) |
| Update detail, Compose | 3.5 B | 3.5 B | 3.5 B | 3.5 B | 3.5 Wave B |
| Profile | 3.5 P (new page) | 3.5 P (new page) | 3 | 3 | 3.5 Profile; Phase 3 |
| Settings hub and every Settings page (Company profile, Locations list, detail and new, Branding, Features & words, Company policies, Break types, Positions, Clocker devices) | 3.5 C | – | – | – | 3.5 Wave C |
| Account recovery, Clocker recovery | 3.5 C | 3.5 C | – | – | 3.5 Wave C |
| More sheet | Done | Done | 3 | 3 | Phase 2 re-run; Phase 3 |
| Error screens (root, in-app, failed page reads) | All roles | | | | Phase 3, made reachable (see below) |
| Emails, push notifications, CSV and PDF exports | All roles | | | | Every phase that changes them |
| Desktop layout of every page above | All roles | | | | Phase 4 |
| Spanish on every page | All roles | | | | Phase 6 |

**Phase 2 pages get a re-run.** They reached zero under the old matrix. The new UI checks (three browsers, 200% zoom, the UI side of submit testing, the on-screen keyboard, simulated session loss) are run on them as part of Phase 3's exit, so Phase 3 closes with every page built so far at zero under the new matrix.

### Inspection matrix, for every page

The five areas stay: alignment and geometry; bars and stability; type, colour and copy; interaction and states; widths and roles. Each one now also covers:

| Check | How |
|---|---|
| Every role that can open the page | Owner, Manager, Lead and Employee, using the test accounts below |
| Widths | 320, 360, 390, 430, 844×390 landscape, 768, 1024, 1440 |
| Text size | 100%, 125%, 150% and 200% zoom at every width |
| Browsers | Chromium, Firefox and WebKit (Playwright has all three installed here) |
| States | Loading, ready, empty, partial, offline, paused, failed read, no access, decided, large data, and every error screen (forced, below) |
| Submit testing, UI side | Save, Approve, Decline, Publish, Submit, Delete, Copy week and every other action, on local fictional data only. Claude checks what the screen does: before, during (pending and disabled), failure (the request blocked in the browser), double tap (one request leaves the browser) and slow network (throttled). The real outcome of each submission (what the server saves, sends and returns) is joint testing with Codex. |
| Motion | Normal motion and reduced motion, in the stability area |
| On-screen keyboard | Fields not covered by the keyboard, in the iOS Simulator (Safari, iPhone 17 Pro) and the Android emulator (Chrome, `Nevora_Pixel_7_API_36`) |
| Session, UI side | What the screen shows when a read or action comes back signed out (401) or forbidden (403) mid-use, forced in the browser. Real session expiry and access changes on the server are joint testing with Codex. |
| Files, UI side | PDFs made with Print / Save PDF from a page, checked like screens. Emails, push notifications and the contents of CSV exports come from the server, so they're joint testing with Codex. |
| Dark mode | **The app has no dark mode** (no dark styles anywhere in `src`; `mobile-workforce.css` pins `color-scheme: light`). Each report says "not applicable". Dark mode stays after Spanish (D-6) and gets its own phase, inspected with this matrix. |

### Groundwork before Phase 3 round 3

| Item | What |
|---|---|
| Test accounts | Time-off requests that are approved, declined and withdrawn; one employee clocked in and one on break; a lead with published shifts; a lead with pay statements. Added to the local throwaway database by scratchpad scripts only, never by changing the repo's seed or server code. |
| Large data | 200 employees, 50 shifts a day, very long person and location names, a year of timecards, in the same local database. Claude checks layout and wrapping; how fast the server answers with this much data is joint testing with Codex. |
| Data reset | A snapshot of the local throwaway database restored after every submit run, so each run starts from the same data |
| Forced error states, UI side | Every failure that reaches the browser as a failed request is forced by blocking that request in the browser. No app code is needed. |
| Automated checks | The repeat measurements become a script run after every fix: text edges, gaps, 15px floor, 44px targets, band heights against their placeholders, layout shift per state, sideways overflow |
| Device harness | Scripts for Firefox, WebKit, 200% zoom, throttled network, the iOS Simulator and the Android emulator |

**Dev-only error switch (joint with Codex).** Errors raised while the server renders a page (the root error screen, the in-app error page, Home's failed page read) can't be forced from the browser. They need a switch in server code, so Codex builds it and Claude inspects the screens with it. The proposal: each error state can be forced live from a cookie the inspectors set, such as root error, in-app error, failed page read and failed API read. The switch works only when all three hold: a development build (`NODE_ENV !== 'production'`), an explicit local environment flag, and a request from `localhost` or `127.0.0.1`. The code sits behind a constant the production build removes. A test builds production and fails if any trace of the switch remains. It never ships.

### Parallel sessions (started Oct 19)

To finish today without lowering the bar, the work runs in six chats at once. Each has its own worktree, preview, database and five inspectors. All six follow `docs/product/reviews/phase-7-inspection-2026-10-18/PARALLEL.md` (file ownership, the matrix, the form pattern, the exit rule).

| Session | Scope | Branch |
|---|---|---|
| Coordinator (original chat) | Phase 3 to zero, groundwork, shared kit and stylesheets, merging | `claude/premium-phase-1` |
| p35-profile | Owner and Manager Profile | `p35-profile` |
| p35-wave-a | Wave A, daily pages | `p35-wave-a` |
| p35-wave-b | Wave B, weekly pages | `p35-wave-b` |
| p35-wave-c | Wave C, Settings and recovery | `p35-wave-c` |
| p4-desktop | Phase 4 desktop for the Phase 2 pages; Employee and Lead desktop once Phase 3 closes | `p4-desktop` |

Each wave builds phone and desktop together, so each page is built and inspected once. Jose signs off built screens instead of designs first. Once Jose approves, the branches merge into `claude/premium-phase-1`, and the whole merged build gets one cross-session inspection. Spanish (Phase 6) and the final full pass follow on the merged build.

### Ways of working

These keep the pace up without lowering the bar:

- **The preview is frozen while inspectors look.** All fixes for a round land first and pass the automated checks. Then all five inspectors get the same unchanging preview.
- **Builds are made against the inspection checklists**, so round 1 starts close to zero.
- **Old style layers are retired, not overridden,** as each page is rebuilt. Most Phase 3 defects came from older stylesheets applying underneath the kit.
- **Only Phase 5's route prefetching may run in a separate session.** Everything else edits the same stylesheet and stays sequential.

### Order and estimates

Estimates are working hours. They're based on the pace so far: Phase 2 took about 8.5 hours from build start to zero (7 screens, 2 roles, the old matrix). Phase 3 has taken about 2.5 hours so far and is through round 2. The new matrix roughly doubles inspection time. They don't include time waiting for Jose's sign-offs.

| Step | What | Estimate |
|---|---|---|
| Groundwork | Everything in the groundwork table (UI side only) | 7–10 h |
| **Phase 3, finish** | Rounds 3+ under the new matrix, plus the Phase 2 re-run, to zero | 9–14 h |
| Jose | Results review and real-device pass | about 1 h |
| **Phase 3.5, Profile** | A Profile page for Owners and Managers, the same layout as the employee Profile: name, contact, role, locations, notification settings, My pay, Sign out. Design, Jose's sign-off, build, inspect. The UI is built against a written contract and fixture; the read of their locations and notification settings is Codex's. | 6–9 h |
| **Phase 3.5, Wave A (daily)** | Add and Edit shift, Coverage, Copy week, the full Time-off list, Shift requests and Availability for managers, Team member detail, New employee, Clocker PIN, the employee Swap and "Unable to work" forms | 24–36 h |
| **Phase 3.5, Wave B (weekly)** | Insights, Templates, Scheduling rules, Update detail and Compose, Payroll settings, Payroll runs for managers | 16–24 h |
| **Phase 3.5, Wave C (set up once)** | The Settings hub and every Settings page, Account recovery, Clocker recovery | 20–30 h |
| **Phase 4, Desktop** | Every page at 768–1440: Home and list+detail Inbox, band at most 200px, sidebar "Team", Requests folded into Inbox | 30–45 h |
| **Phase 5, Speed and motion** | As in the table above, across every page | 8–12 h |
| **Phase 6, Spanish and polish** | F9 and full Spanish on every page, checked at 320; the polish items above | 25–35 h |
| Final pass | One full inspection of the whole app before release | 10–15 h |
| Joint testing with Codex | Everything in the set-aside list, once Codex's side is ready | Estimate with Codex |
| **Total, Claude's side** | | **about 155–235 h**, plus Jose's sign-offs, an hour of real-device testing per phase and the joint testing |

Each of Profile, Wave A, B and C runs: design, Jose's sign-off, build, inspection to zero, the exit rule. These pages have no approved designs yet, so the design step can't be skipped.

### Needs Jose

1. **Spanish timing.** D-8 said full Spanish starts right after Phase 3. This order puts Phase 6 after Phase 3.5 and Phase 4. Recommendation: keep it after Phase 4. Every page then gets its final layout once, and is checked in Spanish once.
2. **Profile data.** Owner and Manager Profile needs a read of their own locations and notification settings. That's Codex's work. Claude can build the page against a contract and fixture first, so Profile can still lead Phase 3.5, but it isn't finished until Codex's read lands and the joint test passes.
3. **Payroll and legal wording** keeps needing Jose's approval page by page (Payroll settings, Payroll runs, Time exports).

### Set aside for joint testing with Codex

Claude doesn't change these. Each one is written up as a contract or test note for Codex, and tested together once Codex's side is ready.

| Item | Why it's backend | Claude's part now |
|---|---|---|
| Real outcomes of every submission (Save, Approve, Decline, Publish, Submit, Delete, Copy week, and the rest) | Server actions write data and trigger messages | The UI states: before, pending, blocked failure, double tap, slow network |
| Double-submit safety on the server | Idempotency is server behaviour | The browser sends one request per tap |
| Data reset between submission runs | Snapshot and restore of the database | None until joint testing |
| Session expiry and lost access on the server | Auth and sessions are backend | Screens for 401 and 403, forced in the browser |
| Server-rendered error screens and the dev-only switch | Needs server code | Inspect the screens once the switch exists |
| Recovery emails and push notifications, captured locally | Nodemailer and web-push are server code; capture needs a dev transport | Check each message like a screen once captured |
| CSV export contents (Time exports, Insights) | Generated by server routes | The export controls and their states |
| Speed with large data | Query cost is server behaviour | Layout and wrapping with large data |
| Owner and Manager Profile read (locations, notification settings) | A new read model | The page against a written contract and fixture |
| Return to Inbox after a decision (D-5), the Inbox count on every page, and the other reads listed under "Backend or data changes" below | Server changes | UI against contracts where needed |
| Spanish for server-written text (notifications, emails, server summaries) | Those strings live in server code | Spanish for every string the UI owns |
| **Already built by Claude and pushed (commit d462f54):** the reviewer name and decision date on time-off requests (`lib/data/requests.ts`), and the payday read (`lib/payroll/calendar.ts`, `pay-calendar.server.ts`). Jose approved them on Oct 19. | Both change server reads | Codex should review both changes, and they belong in the joint test |

### Real-device checklist (sent at each phase exit)

A one-page list per phase: the pages and states to try on an iPhone with VoiceOver and an Android phone with TalkBack, the gestures (swipe between items, double tap, the rotor or reading controls), and three things to confirm by ear on each page: the page name is read first, each control says what it does, and the state words are read.

---

## 2. Backend or data changes flagged by the reviews

Inbox count available on every page · return-to-Inbox after a decision (D-5) · open a timecard straight to one person · employee-side "shift with no punches" read · Attendance as its own page · a Profile page for managers · notification record context · overlapping-shift read for time-off review. Each is flagged before it is touched; nothing in phases 0–2 depends on them except D-5 and the per-page Inbox count.

---

## 3. The shared brief for the UI chats (PARALLEL.md)

### Parallel sessions: shared brief

October 19, 2026. Jose's bar for demanding clients is every page, every role, every state, every device, with no lowering of it. To finish faster, the work is split into chats that run at the same time. Each chat has its own worktree, preview, database and five inspectors. Read this whole file before you start, then `PLAN.md` ("Revised plan, October 19"), `BRIEF.md` and `PHASE-3-BRIEF.md` in this folder.

#### Sessions and what each one owns

Every session starts from branch `claude/premium-phase-1` at the commit that added this file's stylesheets. It works on its own branch in its own worktree. **Edit only the files your session owns.** If you need a change in a file you don't own, ask the coordinating session by message. Don't edit it yourself.

| Session | Pages | Files it owns |
|---|---|---|
| **Coordinator** (the original chat) | Phase 3: every Employee and Lead page; groundwork | `src/components/kit/*`, `src/app/app/portal-premium.css`, `layout.tsx`, `root-loading.tsx`, every employee and lead component, `src/lib/keep-whole.ts`, `src/lib/duration-text.ts` |
| **Profile** | A new Profile page for Owners and Managers (name, contact, role, locations, notification settings, My pay, Sign out), the same layout as the employee Profile | New components you create for it; in `src/app/app/profile/page.tsx`, only the role check at the top; `premium-profile.css` |
| **Wave A** | Add shift, Edit shift, Coverage, Copy-week receipt; the full Time-off list for managers (keep the single-request review at zero); Shift requests and Availability for managers; Team member detail; New employee; Clocker PIN; the employee Swap and "Unable to work" forms | `src/app/app/schedule/{new,edit,coverage,copy-receipt}/*` and their components; `manager-time-off.tsx`; the manager branch of `exchange/page.tsx` and `availability/page.tsx`; `availability-team-list.tsx`; `exchange/swap/*`, `exchange/callout/*`; `employees/[employeeId]/*`, `employees/new/*`; `premium-wave-a.css` |
| **Wave B** | Insights, Templates, Scheduling rules, Update detail, Compose, Payroll settings, Payroll runs for managers | `reports/*`, `schedule/templates/*`, `schedule/settings/*`, `updates/[id]/*`, `updates/compose/*`, `settings/payroll/*`, the manager parts of `payroll/*` and their components; `premium-wave-b.css` |
| **Wave C** | The Settings hub and every Settings page (Company profile, Locations list, detail and new, Branding, Features & words, Company policies, Break types, Positions, Clocker devices), Account recovery, Clocker recovery | `settings/*` except `settings/payroll`; `account-recovery/*`; `clocker-recovery/*`; and their components; `premium-wave-c.css` |
| **Desktop (Phase 4)** | The desktop layout (768–1440) of the pages built in Phase 2: Home and its views, Inbox as list and detail, Schedule, Team, Timecards, Payroll, Time exports; the sidebar ("Team"); Requests folded into Inbox with `/app/requests` still working | `app-shell.tsx` (desktop sidebar only), `navigation.ts`, `portal-desktop.css`, `premium-desktop.css`, `premium-home.tsx`, `manager-inbox.tsx`, `manager-dashboard.tsx`, and other manager-only components. A component that employees also use (for example `timecards.tsx`) is the coordinator's; ask. |

Each wave builds **phone and desktop together** (320 to 1440), so each page is built and inspected once. Spanish comes later, in one pass over every page.

If a shared file genuinely needs editing by two sessions, the session that doesn't own it describes the change in a message. The coordinator applies it and tells everyone.

#### Codex owns the backend

Don't change server code: no route handlers, server actions, SQL, `src/lib/data/*`, auth, payroll calculations, notification or email delivery. Build the UI against today's server behaviour. Where a page needs data the server doesn't give, build against a written contract and a fixture. Write the contract in `docs/product/specs/<your-session>/CODEX.md`. That item is set aside for joint testing with Codex (see the list in `PLAN.md`).

#### The bar (exit rule)

Your session is done only when all of these hold:

1. **Zero open P0, P1 and P2** in all five areas (alignment and geometry; bars and stability; type, colour and copy; interaction and states; widths and roles) and in the new checks below.
2. **Every check passes on your final build:** `npx vitest run` (full suite), `npx tsc --noEmit -p .` and `npx eslint src`. One lint error already exists at `src/app/app/exchange/swap/page.tsx:51`. Wave A owns that file and fixes it.
3. **The report is written** at `docs/product/specs/<your-session>/README.md`: what changed, every check run with its result, what was set aside for Codex, and screenshots at 390 and 1440.
4. **The coordinator is told** by message. Jose decides on merging.

##### What every inspection covers, for every page you own

- **Roles:** every role that can open the page.
- **Widths:** 320, 360, 390, 430, landscape 844×390, 768, 1024, 1440.
- **Text size:** 100%, 125%, 150% and 200% zoom, at every width.
- **Browsers:** Chromium, Firefox and WebKit. Playwright has all three at `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`.
- **States:** loading, ready, empty, partial, offline, paused, failed read (block the request in the browser), no access, signed out mid-use (force a 401 in the browser), decided, and large data.
- **Submitting, on screen only:** for every action, check before, pending, failure (block the request), double tap (exactly one request leaves the browser) and slow network (throttle it). The real server outcome of a submission is joint testing with Codex. Run submissions only on the local fictional data, and restart your preview to reset it.
- **Motion:** normal and reduced motion.
- **On-screen keyboard:** every form, in the iOS Simulator (iPhone 17 Pro) and the Android emulator (`Nevora_Pixel_7_API_36`, adb at `~/Library/Android/sdk/platform-tools/adb`). The simulators are shared, so tell the coordinator before you use one and when you finish.
- **Print and PDF:** any page with Print / Save PDF.
- **Dark mode:** not applicable. The app has none.

##### How the design must look

Use the existing kit and the Phase 2 and Phase 3 pages as the precedent. Read `DESIGN.MD` and `.21st/DESIGN.md`. Gusto is the benchmark.

- **Page structure:** the kit `PageBand`, then kit cards (radius 20, shadow e1, no border), with 16px between band and first card and between cards. Text sits 20px inside each card. On phones the page edge is 16px.
- **Type:** kit roles only, with nothing under 15px except tab labels (13px) and number badges (12px).
- **Pills** state a condition; **teal links** state an action. Buttons are `.nv-btn` (52px, radius 12, primary teal `#077572`). Touch targets are at least 44px.
- **Forms (one pattern for every session):**
  - Labels above fields, in the kit label role.
  - Fields are 48px tall (single-line inputs and selects), radius 12, a 1px `--nv-border` border, white, text in the kit body role. The shared rule in `portal-premium.css` (WR-55) already sets the 48px and the text size, so don't set them yourself. Buttons stay 52px.
  - Help text in the callout role, muted, 8px under the field.
  - Errors in urgent ink with an icon and a word, never colour alone.
  - 16px between fields; groups of fields are cards, with the group title in the card head.
  - The main action is a primary `.nv-btn`. On phones it's full width at the bottom of the form, or in the kit action bar when the form is long. Secondary actions are secondary buttons or teal links.
  - Pending: the button says what it's doing ("Saving…"), is disabled, and the page doesn't move.
- **Icons:** Phosphor only.
- **Words:** plain sentence case, curly apostrophes, no blame words ("missing", "missed"). Payroll and legal wording needs Jose's approval, so leave it as it is and list it in your report.
- **Times and dates** never split across lines: use `keepWhole()` from `src/lib/keep-whole.ts`. Durations use `durationText()` from `src/lib/duration-text.ts`.

Don't override old styles with ever-heavier selectors when you can retire them for your pages instead. Most Phase 3 defects came from old phone stylesheets (`mobile-workforce.css`, `portal-gusto.css`, `employee-mobile-corporate.css`) still applying under the kit.

#### How each session works

1. **Inventory:** list your pages, the roles that can open each one, every state and every action.
2. **Build** phone and desktop together, against the inspection checklist above, so round 1 starts close to zero.
3. **Jose's sign-off on built screens:** post screenshots at 390 and 1440 for each page in your chat, for Jose. Carry on into inspection while you wait. If he asks for changes, make them, and the inspectors re-check.
4. **Inspect with five inspectors, one per area.** They're background agents and read only: they never edit code or data, never submit, never print the password. Give each one this file, `BRIEF.md` and the matrix above. Each writes its report to `docs/product/specs/<your-session>/inspection/<area>.md`.
5. **Keep the preview frozen while inspectors look.** Apply all fixes for a round, run your checks, then start the next round. Repeat until all five report zero.
6. **Exit:** run the full exit rule, write the report, tell the coordinator.

**Commits:** commit on your own branch at the end of each round, locally. Never push, never merge, never touch another branch.

#### Your preview

Each session runs its own preview, database and port. The shared files are in `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/` and are read only.

Start it in the background (it takes a few minutes and prints `PREVIEW_READY <url>`):

```
PREVIEW_OUT=<your scratchpad>/preview node --import tsx /Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/preview/preview-runtime.mjs
```

Run it from the main checkout `/Users/josek0514/Desktop/NEVORA-UI-READINESS` so `tsx` resolves.

- **Sync your worktree's code into it** after each change (the dev server hot-reloads):
  ```
  sh /Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/scripts/sync.sh <your worktree> <your scratchpad>/preview
  ```
- **Sign in and save browser states** for the inspectors:
  ```
  PREVIEW_OUT=<your scratchpad>/preview node /Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/parallel/scripts/login.mjs QAOWNER AUDIT-M AUDIT-LEAD AUDIT-E AUDIT-LONG
  ```
- **Accounts:** Owner `QAOWNER`, Manager `AUDIT-M`, Lead `AUDIT-LEAD`, Employee `AUDIT-E`, long name `AUDIT-LONG`, payroll accounts in `access.json`. The password is in `<PREVIEW_OUT>/evidence-*/access.json`. Read it from the file and never print it, write it into a report or put it in a URL.
- **Fictional data only.** Nothing is sent outside this machine.

##### Extra test data and automated checks (ready Oct 19)

**Extra test data.** Run this once your preview prints `PREVIEW_READY`, from the main checkout:

```
PREVIEW_OUT=<your scratchpad>/preview node --import tsx .claude/parallel/scripts/seed-extra.mts
```

It adds:
- time-off requests for `AUDIT-E` that are approved, partial-day approved, declined and withdrawn, and an approved one for `AUDIT-LEAD`
- `AUDIT-ON`, clocked in, and `AUDIT-BREAK`, on break, both on today's published schedule
- the lead `AUDIT-LEAD`, with published shifts this week and next
- `payroll-qa-b`, now a lead with pay statements

It writes only to your own preview's database, after checking it belongs to that preview, and running it twice is safe. Run `login.mjs` again for the new accounts.

**Large data.** Start a second preview with its own `PREVIEW_OUT`, then run the same command with `--large`. It adds 200 people (some with very long names), a location with a very long name, 50 shifts a day this week and a year of timecards. Keep it separate so your main preview's numbers stay the same.

**Automated checks.** Run these after every fix and before every inspection round:

```
PREVIEW_OUT=<your scratchpad>/preview node .claude/parallel/scripts/checks.mjs --routes <your routes, comma-separated> --accounts <accounts> --browsers chromium,firefox,webkit --axe
```

The defaults are every width (320 to 1440, plus 844x390) and text at 100, 125, 150 and 200%. For each page it reports:
- sideways overflow
- text under the kit floor (15px on phones, 14px on desktop; tab labels 13, number badges 12)
- targets under 44px on phones or 24px with a mouse
- layout shift while loading above 0.01
- console and page errors
- axe violations

A round goes to the inspectors only when this passes, or when every remaining failure is written down with a reason.

#### Coordinator notes (read these before filing shared-file items)

Updated Oct 19. This list replaces repeated messages. The app limits how many messages one chat can send to the others, so check here first.

- **Landscape phones (844×390), already fixed in `9f7b649`** on `claude/premium-phase-1`. Landscape phones keep phone type tokens in kit.css, and `mobile-workforce.css`, `employee-mobile-corporate.css` and `typeface-theme.css` treat them as phones. The header "Search" label and the compact brand link (44px target) are fixed in the same commit. Bring it in with `git cherry-pick 9f7b649` if you want it on your preview now. Don't work around it in your own CSS. Remove any workaround you added, so the merge has one rule.
- **`checks.mjs`** now changes text size after the page loads and counts layout shift only at 100%. If your runs show 0.2–0.9 at 125/150/200%, you're on an old copy or an old process; re-run.
- **Dev server 500s under load** (statement timeouts, "Workspace configuration is unavailable") come from the Mac running many browsers at once. Retry once, and don't file them as page defects.
- **Desktop session's items:** sidebar group labels at 12px; "Powered by VELANI LLC" at 10px; the header actions moving 4px on hydration at desktop widths; the Owner and Manager Profile links in `navigation.ts` and the desktop account menu in `app-shell.tsx` (asked for by the Profile chat).
- **`root-loading.tsx`:** each wave may add one entry per route it owns to the shapes list, with the route's measured phone band height, and nothing else in that file. Wave C: `/app/settings`, `/app/account-recovery`, `/app/clocker-recovery`.
- **Dead CSS:** `mobile-workforce.css` has `.settings-hub*` rules that Wave C's rebuild no longer uses. The coordinator removes them after the merge.
- **Swap flow test data:** `AUDIT-SWAP` (next weekend only) is in seed-extra. Wave A is finding out why no swap target is offered, then the coordinator adds whatever data is needed.
- **Simulators:** tell the coordinator before you use the iOS Simulator or the Android emulator and when you're done. The coordinator's round 3 interaction inspector uses them too.

---

## 4. Each chat's backend needs


### p35-profile (branch `claude/p35-profile-6cdee8`, file `docs/product/specs/p35-profile/CODEX.md`)

#### Owner and Manager Profile: what the server needs to provide (for Codex)

October 19, 2026. Phase 3.5, Profile session. The UI is built and inspected on branch `claude/p35-profile-6cdee8` against the contract below and the fixtures in `fixtures/`. No server code was written. This item is set aside for joint testing with Codex.

##### What the page already reads today (no change needed)

| Field | Source |
|---|---|
| Name, role | `requireSessionMutationProof()` (the session's employee row) |
| Company, time zone | `getWorkspace()` (`name`, `timeZone`, shown with `timeZoneLabel()`) |
| My pay row | Shown only when `navigationForRole(role, readPayrollCapabilities(proof), { modules })` includes `/app/my-pay` (the same rule the shell uses) |
| "Alerts on this device" row | `readNotificationConfig(process.env).featureEnabled`; it opens the existing `#portal-device-settings` sheet |

The page is `src/components/manager-profile/manager-profile.tsx`, reached from `src/app/app/profile/page.tsx` when the role is `OWNER` or `MANAGER`. Employees and leads still get the Phase 3 employee Profile.

##### 1. Read: `GET /api/management/profile`

The signed-in Owner or Manager's own contact details, locations and alert choices.

- Request: same-origin `GET`, `credentials: same-origin`, `cache: no-store`, `redirect: error`, `Accept: application/json`. No body, no query.
- Authority: the session's own employee, role `OWNER` or `MANAGER`, active. Never another person's data. An employee or lead gets `403`.
- Responses:
  - `200` with the ready body below.
  - `200` with `{ "state": "unavailable", "reason": "<short code>" }` when the read can't be served right now. The UI shows "Couldn’t load" in the email, phone and locations rows, "Your alert choices couldn’t load." in the alerts list, and Try again in the card's head line; a screen reader hears "We couldn’t load your contact details, locations and alert choices."
  - `401` (no session) or `403` (not Owner or Manager): the UI shows "Sign in to see this" in those rows and a Sign in link in the card's head line; a screen reader hears "Your session ended. Sign in again to see your contact details, locations and alert choices."
  - Any other status (including today's `404`, since the route doesn't exist yet), a network failure, a 10-second timeout, or a body outside the contract: read as a failed read. The UI never shows partial data.
- `Cache-Control: no-store`.

###### Ready body

```json
{
  "state": "ready",
  "kind": "management-profile",
  "observedAt": "2026-10-19T14:00:00.000Z",
  "validForMs": 600000,
  "contact": { "email": "owner@northside-qa.example", "phone": "787-555-0100" },
  "locations": { "scope": "all", "names": ["Main Office", "West Office", "Old San Juan Kiosk"] },
  "alerts": [
    { "id": "time-off", "label": "Time-off requests", "detail": "When someone asks for time off", "on": true }
  ]
}
```

| Field | Rule |
|---|---|
| `observedAt` | ISO timestamp from the database clock. A response older than the one on screen is ignored. |
| `validForMs` | How long the snapshot may stay on screen, above 0. The shared snapshot controller (`src/lib/private-snapshot-client.ts`) clears it when it runs out and polls every 30 seconds. Under 45 seconds reads as a session ending, the same as the employee views. |
| `contact.email`, `contact.phone` | Strings of at most 200 characters, or `null` / `""` when not on file (shown as "Not added"). Phone is shown as stored; it wraps only at its spaces. |
| `locations.scope` | `"all"` for an Owner (every active location) or a Manager whose scope is the whole company; `"assigned"` for a Manager limited to some locations (the manager location scope in `manager-location-scope.server.ts`). |
| `locations.names` | Active location names in the order the Locations settings list shows them, at most 500. An empty list is allowed: "No locations yet" (Owner) or "None assigned yet" (Manager). The UI shows five and a "Show all N" button. |
| `alerts` | The role's fixed topic set, unique `id`s, at most 20 items. `label` and `detail` are display text (at most 200 characters each), sentence case, curly apostrophes. `on` is a boolean. |

###### Topic set

The UI reserves one row per topic while loading, so the count per role must stay fixed: **Owner 5, Manager 4** (`ALERT_TOPIC_COUNT` in `manager-profile-live.tsx`). The fixture wording is a proposal. Jose approves the final wording, and the payroll topic needs his approval in any case.

| id | Label | Detail | Owner | Manager |
|---|---|---|---|---|
| `time-off` | Time-off requests | When someone asks for time off | ✓ | ✓ |
| `shift-changes` | Shift swaps and cover | When someone asks to swap or give up a shift | ✓ | ✓ |
| `unable-to-work` | Unable to work | When someone can’t make a shift | ✓ | ✓ |
| `clock-review` | Clock-ins to review | When a punch needs your review | ✓ | ✓ |
| `payroll-ready` | Payroll ready to review | When a pay period is ready for you | ✓ (payroll on) | – |

If payroll is off for an Owner, either drop `payroll-ready` and tell the UI session to make the count depend on payroll, or keep it and return `on: false`. The UI already accepts any count; only the loading rows assume 5 and 4.

##### 2. Save: `POST /api/management/profile/alerts`

Turns one alert topic on or off for the signed-in Owner or Manager.

- Request: same-origin `POST`, `credentials: same-origin`, `cache: no-store`, `redirect: error`, headers `Content-Type: application/json`, `Accept: application/json`, `X-Nevora-Profile-Alerts: 1` (a custom header, so a cross-site form can't send it). Body: `{ "topicId": "time-off", "on": false }`.
- The UI sends one request per tap. While it's in flight, that switch is disabled, shows "Saving…" in place of its detail line and ignores further taps (proven: three taps, one request). Other switches stay usable. It gives up after 10 seconds.
- Responses the UI handles:
  - `2xx`: saved. The switch keeps the new value, and the UI re-reads `GET /api/management/profile`. From then on the read is the truth. The body isn't read; `{ "ok": true }` is enough.
  - `401` / `403`: "Not saved. Sign in again, then try." The UI re-reads the profile, so the card's head then offers Sign in.
  - Anything else, a network failure or the timeout: "Not saved. Try again." (or "Not saved. Check your connection and try again." when offline). The message takes the place of the topic's detail line, so the row doesn't change height. The switch goes back to the stored value.
- Must be idempotent: sending the same value twice is fine.
- Validation: unknown `topicId`, a topic not in the role's set, or a non-boolean `on` → `400`.
- Server side (Codex): store the choice per employee and topic, and make notification and push delivery honour it. Delivery is joint testing.

##### Fixtures

`docs/product/specs/p35-profile/fixtures/` (each is checked against the parser by `src/components/manager-profile/manager-profile.test.tsx`):

| File | Covers |
|---|---|
| `owner.json` | Owner, all 3 locations, email and phone, 5 topics (one off) |
| `manager.json` | Manager assigned to 2 locations, 4 topics |
| `manager-empty.json` | No email, no phone, no locations, every topic off |
| `owner-large.json` | 60 locations with very long names, a very long email, a phone number with an extension |
| `unavailable.json` | `{ state: "unavailable" }` |

##### Joint test checklist

1. Owner, Manager (all locations), Manager (some locations): the read returns the right person, scope and names.
2. Employee and Lead get `403` from both endpoints; signed out gets `401`.
3. Turning a topic off stops that notification and push for that person only; on again restores it.
4. Two quick saves for different topics both stick.
5. `validForMs`, `observedAt` and polling behave as in the employee Profile.
### p35-wave-a (branch `claude/p35-wave-a-1283c8`, file `docs/product/specs/p35-wave-a/CODEX.md`)

#### Wave A: set aside for Codex (joint testing)

Phase 3.5 Wave A rebuilt these pages on the kit without touching server code. Each item below needs server or data work before it is fully done, so it waits for joint testing with Codex. Today's server behaviour is unchanged.

##### Contracts (reads the UI would use)

| # | Page | What the UI needs | Today | Contract |
|---|---|---|---|---|
| C1 | Time-off list, Approved and Declined | Who decided each request and when | `listTeamTimeOffRequests()` returns no reviewer or decision time (the employee read already does, since d462f54) | Add `reviewerName?: string` and `reviewedAt?: string` (ISO) to each row, the same shape as `listEmployeeTimeOffRequests`. The UI will add "Approved by Name · Oct 2" under each row. |
| C2 | Coverage, "What it needs" | Need counts as numbers, not sentences | `coverage-repair.server.ts:36-37` builds labels such as "2 employees missing" and "Cashier: 1 missing" | Add `count: number` (and keep `positionName` on POSITION targets). The UI words it ("2 more people needed"). Until then `needLabel()` in `coverage/page.tsx` rewrites the two known shapes and shows any other label as is. |
| C3 | Copy-week receipt | Which shift each row was | `CopyOutcome` has `sourceId`, status and a reason code only | Add `employeeName`, `date`, `startTime`, `endTime`, `locationName` per row. The receipt would list "Not copied: Ana, Tue Oct 20, 8:00 AM – 4:00 PM, the person can't work then" instead of ids. |
| C4 | Coverage candidates | Hours as minutes | `scheduledHours`, `targetHours`, `hoursNeeded` are decimal hours | Fine as is; the UI converts with `durationText`. Listed so a change of unit is coordinated. |

##### Joint tests (the real outcome of each submission)

The UI side (before, pending, failure with the request blocked, double tap, slow network) is tested here on fictional local data. What the server saves, sends and returns is joint testing:

- Add shift, Save replacement (coverage repair), Edit shift (Save changes), Delete shift
- Copy week retry from the receipt (`ScheduleCopyForm`, shared with Schedule and Templates)
- Time off: Approve and Decline from the list
- Shift requests: Approve and Decline (swap, coverage, Unable to work), Close coverage request
- Team member: Save details, Save scheduling profile, Save operational review (Owner)
- New employee: Add employee
- Clocker PIN: Save PIN and Reset PIN (needs the PIN key, which the local preview does not have: the page shows "PIN setup is unavailable")
- Swap: Send swap request, Offer for coverage
- Unable to work: Send report

##### Data the local preview can't produce

- **Swap, "Choose a shift" state.** No fictional employee has a shift another person may swap into (the swap rules refuse every target, or the deadline for changes has passed), so every swap page shows "No shifts to swap". The choose, compare and send states are covered by unit renders only until a fixture with a swappable pair exists.
- **Clocker PIN form.** The preview has no PIN key, so only the "PIN setup is unavailable" state renders in the browser.
- **A real Copy-week receipt.** Needs a copy to run; the "outcome not confirmed" and "not found" states render locally.

##### Words that need Jose (left as they were)

- Operational rules on Team member detail: "Scheduled projections are not worked time, proof of breaks taken, final overtime pay or legal certification…" (legal wording).
- Team member status hint: "Deactivation signs this employee out immediately. Reactivation requires a fresh sign-in. History is preserved." (unchanged).
### p35-wave-b (branch `claude/p35-wave-b-808dfd`, file `docs/product/specs/p35-wave-b/CODEX.md`)

#### Wave B: set aside for joint testing with Codex

October 19, 2026. Wave B changed only UI files. Nothing below was changed on the server. Each item needs Codex's side, or a real server outcome, before it can be signed off together.

##### Real outcomes of submissions

Claude checked what each screen does before, during (pending, disabled), on failure (request blocked in the browser), on double tap and on a slow network. What the server saves, sends and returns is joint testing:

| Page | Actions |
|---|---|
| Insights | View period, Refresh, Download CSV, Print / Save PDF |
| Templates | Save template, Apply to this week (and the "Check / retry original copy" recovery), Archive |
| Scheduling rules | Save staffing & hours, Add coverage period, Remove, Save position quantities, Save trade policy, Save coverage policy (Owner) |
| Update detail | Acknowledge update, Mark read, Withdraw update, Check status |
| Compose | Preview audience, Publish update / Publish new version, Check status, Retry original publication |
| Payroll settings | Save company preferences, Save employee exception, Save payroll access |
| Payroll runs (manager) | Prepare draft, Validate and import amounts, Approve revision, Publish employee statements, Create correction, Prepare payment instructions, Retry job |

##### Server-produced content

1. **Insights CSV export** (`/api/reports/export`): the file's columns, headings, number formats and time zone. The UI only names the file `nevora-reports-<start>-<end>.csv`.
2. **Report definitions and coverage and stability definitions** come from `src/lib/reports/project.ts` (`definitions`, `coverageReliability.definition`, `scheduleStability.definition`). Some read as internal notes to a client: "Actual time uses D2 canonical effective entries and breaks…", "append-only history", "immutable snapshots". Suggested plain versions are in the Wave B report; the strings belong to the report contract, so they weren't changed here.
3. **Notifications from a published update** (push, email): who receives them and their wording.
4. **Payroll documents and notices**: statement PDFs, payment instruction JSON, private payroll notices.

##### Error screens that can't be forced from the browser

Templates and Scheduling rules are server-rendered. A failed read while the server renders them goes to the in-app error page, which needs the dev-only error switch described in `PLAN.md` ("Dev-only error switch"). Insights, Update detail, Compose and the payroll pages read in the browser, so their failed, offline and signed-out states were forced with request blocking.

##### Data the preview doesn't have

- **A manager who can review payroll but not approve it.** `payroll-qa-reviewer` can also approve, so the "An authorized payroll approver must approve this revision" branch is unchecked on screen. A fixture grant (review on, approve off) would let it be inspected.
- **Large data on these pages** (200 people on Scheduling rules' weekly hours, a year of Insights rows, many templates and coverage periods) runs on the second `--large` preview.
### p35-wave-c (branch `claude/p35-wave-c-93e13c`, file `docs/product/specs/p35-wave-c/CODEX.md`)

#### Wave C: set aside for joint testing with Codex

October 19, 2026. Wave C rebuilt the UI of the Settings hub, every Settings page, Account recovery and Clocker recovery. No server code changed: no route handler, server action, SQL, `src/lib/data/*`, auth or delivery code. Every form posts exactly the fields it posted before, to the same action or route, with the same headers. These items need Codex's side and are tested together.

##### 1. Real outcomes of every action

The UI side (before, pending, blocked failure, double tap, slow network) is tested on the local preview. What the server saves, sends and returns is joint testing.

| Page | Action | Goes to | Check together |
|---|---|---|---|
| Company profile | Save changes | `saveWorkspaceProfileAction` | Name saved; a locked timezone stays locked; the answer's wording (see 3) |
| Locations, new | Add location | `createLocationAction` | Key generation when blank; duplicate key answer; the "not confirmed" path (the UI asks to check Locations before retrying) |
| Location detail | Save changes | `updateLocationAction` | `expectedUpdatedAt` conflict answer; deactivation keeps eligibility and history; Clocker link unchanged after a rename |
| Positions | Add position, Save position | `createPositionAction`, `updatePositionAction` | Revalidation refreshes the list; conflict answer on a stale `expectedUpdatedAt` |
| Break types | Create, Save, Archive, Reactivate | `saveBreakTypeAction` | The action accepts exactly `id, expectedVersion, name, category, targetMinutes, active`; `refresh: true` answers (STALE, FORBIDDEN, UNAVAILABLE) |
| Clocker devices | Add device, Rename, Replace tablet / New setup code / Reconnect, Revoke | `manageClockerDeviceAction` | Setup code issued and its expiry; a tablet connecting with the code; revoke cutting access at once; existing punches kept |
| Branding | Save brand, Upload logo | `POST /api/workspace-presentation`, `/logo` | Retry with the same `operationId` never applies twice; 409 conflict; logo validation messages |
| Features & words | Save changes | `POST /api/workspace-presentation` (words, then modules) | Module with waiting requests answers 409 `busy`; words saved when modules fail |
| Company policies | Save policies, Retry the same save | `POST /api/company-policies` | Retained command reused on retry; 400 and 409 answers; effective dates in company time |
| Account recovery | Issue recovery code | `POST /api/manager/account-recovery` | Code issued, single use, 15 minutes; attestation recorded; an earlier unused code retired; the employee's reset at `/reset-access` with that code |
| Clocker recovery | Check receipt | `POST /api/manager/clocker-recovery` | Ledger read for a real saved reference; `validForMs`; access ending mid-use |

##### 2. Session loss and access, server side

Forced in the browser on the UI side (401 and 403 on the fetch-based pages). For the server-action pages (Company profile, Locations, Positions, Break types, Clocker devices) a signed-out session makes the action throw or redirect; the UI then shows its "not confirmed" message and keeps the entries. Joint test: what each action does on an expired session, so the message can be specific ("Sign in again") instead of generic.

##### 3. Server-written wording shown on these pages

Wording that comes from server code. Not changed; listed so Codex and Jose can decide.

| Where it shows | Current text | Note |
|---|---|---|
| Company profile success | "Workspace updated." | The page now shows its own title "Company profile saved" and hides this sentence, because the page is called Company profile |
| Location saved | "Location updated. Its Clocker link is unchanged." | Fine as is |
| Position added / updated | "Position added." / "Position updated. Existing memberships and history are retained." | Shown as a toast |
| Features, module locked | `blockerText()`, e.g. "1 request for time off is waiting for a decision. Decide it first." | Fine as is |
| Locations, setup items | `evaluateLocationReadiness()` issue messages | Fine as is |
| Company profile, locked timezone | `WorkspaceTimezoneLockedError` message | Fine as is |
| Break types and Clocker devices errors | `BreakTypeError`, Clocker owner result messages | Not seen locally beyond validation |

##### 4. Reads

- The Settings hub now also calls `getWorkspace()` (an existing read) to show the company name above the title.
- Features & words still reads `getWorkspace()` but no longer shows the name (the band summary is now a fixed sentence, so its loading placeholder matches). The read can be dropped later; left in place so server behaviour is unchanged.

##### 5. Not testable here

Real email or push delivery (none of these pages sends one directly), a real tablet connecting with a setup code, VoiceOver and TalkBack on real devices.
### p4-desktop (branch `claude/p4-desktop-240fe0`, file `docs/product/specs/p4-desktop/CODEX.md`)

#### Phase 4 desktop: items for Codex

October 19, 2026. These need server work. The desktop UI is built against today's server behaviour and doesn't depend on them to work; each one is set aside for joint testing.

##### 1. Inbox count on every page (F1, PLAN "Backend or data changes")

**Why.** F1 says the Inbox badge in the desktop sidebar (and the phone tab) shows the same "needs you" number as Home and the Inbox summary. Today only Home and Inbox read the action center, so the sidebar has no count.

**Contract.** The shell gets one number per request, computed the same way as `needsYou(items, day, missed).count` in `src/lib/action-center/needs-you.ts` (Act now plus Requests; Plan ahead and past items excluded):

```ts
// Server: passed to <AppShell inboxCount={...}> from src/app/app/layout.tsx, or read by the client from
// GET /api/manager/inbox-count -> { state: "ready", count: number, observedAt: string } | { state: "unavailable" }
type InboxCount = { state: "ready"; count: number; observedAt: string } | { state: "unavailable" };
```

- Managers and Owners only; employees and leads get nothing.
- Same authority checks as `/api/manager/action-center`.
- When unavailable, the UI shows no badge (never "0", never "–").

**UI side (ready once the read lands).** A 12px number badge on the sidebar's Inbox entry and the phone Inbox tab, with the accessible name "Inbox, 4 need you".

##### 2. Return to the Inbox after a decision (D-5): already in place

`src/app/app/requests/actions.ts:75-90` already returns a decision made from the Inbox to `/app/inbox?filter=…&decided=…`. Nothing new is needed for desktop. One note for joint testing: the desktop Inbox keeps its selected row in `?item=`; after a decision the redirect drops it, so the pane shows the first remaining item. That's the intended behaviour ("next request"), but the "Next request (2 of N)" wording from F6 still needs a count from the server.

##### 3. Request facts in the Inbox detail pane

**Why.** The desktop Inbox is now a list with a detail pane. For a time-off, swap or "can't work" request, the action-center item carries only the person, the kind and the sent date, so the pane shows those and a "Review time off" button to the full review. The Oct 18 comp shows the dates, length, location and note in the pane, with Approve and Decline beside them.

**Contract.** Each request item in the action-center response gains an optional, authority-checked `request` object:

```ts
request?: { startDate: string; endDate: string; partialDay?: { start: string; end: string };
  lengthText: string; locationName: string; note?: string; reviewHref: string }
```

**UI side.** The pane shows Dates, Length, Works at and Note. Approve and Decline move into the pane only after Jose approves that change to O1 ("decisions only on the full review").

##### 4. Dev-only error switch (PLAN)

Home's failed server read and the in-app error page can't be forced from the browser. Phase 4 inspected their desktop layout only where the browser can force them (client reads). The switch described in PLAN.md is still needed for the server-rendered ones.
