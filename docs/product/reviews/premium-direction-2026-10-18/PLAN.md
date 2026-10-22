# Premium direction: merged plan

October 18, 2026 · For Jose · Merges the five senior reviews in this folder with the build plan Jose approved in chat.

Sources: [product-designer.md](product-designer.md), [ux-designer.md](ux-designer.md), [ui-designer.md](ui-designer.md), [ux-researcher.md](ux-researcher.md), [market-strategist.md](market-strategist.md).

## Where all five agree

- **The direction is right. Keep it.** Teal band with a plain one-line summary, one "Next up" action, white cards, decisions only on full review screens, a grouped Inbox, honest loading/offline/empty/success states. The market review says it already wins a demo against Homebase, When I Work, Sling and Deputy.
- **The comps drifted from the system.** Two reviewers score them 11/16 as drawn, 15–16/16 with the fixes below. The concept is fine. The values (text sizes, greys, radii, button colour, icons) and a few self-contradictions need fixing before code.
- **Employees need the same treatment.** Most users are employees. Without them the product looks like two apps.

## Fixes that change the comps (apply before building)

| # | Fix | From |
|---|---|---|
| F1 | **One "needs you" count.** Inbox badge = Act now + Requests, and the same number in every summary, the sidebar and screen-reader labels. Today Home says "2 things", the badge says 4, Planning says 39 while its rows add to 37. Remove the Owner Home state that can't happen (2 "not in yet" at 6:14 PM). | all five |
| F2 | **Buttons use the action teal #077572, not the header teal.** White text is 5.5:1, and company brand colours keep working. White focus ring on the teal band. | product, UI |
| F3 | **Restore the 15px phone text floor.** 55% of comp text is under 15px. Nine type roles; 13px tab labels and 12px badges are the only exceptions. Card titles larger than the rows they head. | UI, product |
| F4 | **Pills state a condition, links state an action.** Pills: grey, amber, green, coral nouns ("Published", "Draft", "Fix", "Waiting"). Verbs ("Review", "Timecard", "Set") become teal links. "Next up" is one colour everywhere. Lists and Home never say "Approve". | UI, UX, research, product |
| F5 | **Words.** "Published" not "live". No "missing" or "missed" (they imply blame). "Note" not "Her note". The manager's own missed punch shows "Yours". | product |
| F6 | **Back names where you came from.** After a decision, Back never reopens the decided form. "Next request (2 of N)" after each decision. | UX |
| F7 | **Cut the token sprawl.** Radii 20 / 12 / 8 / pill, one muted grey #5F666A, a 4px spacing scale, three shadow levels, all touch targets 44px. Real Phosphor icons, a proper white wordmark asset, and a header watermark drawn from the real NEVORA mark. | UI |
| F8 | **Numbers say what they count.** "56h this week" not "56h". Never animate payroll or time figures. | research, UI |
| F9 | **Spanish at 320px.** Every summary line becomes a dictionary template and is checked in Spanish at 320px. Double surnames already cut off on Inbox and Schedule. | product, market, research |

## Revised build order

Each phase ends with the same checks: the 156-route sweep, the U10 style baseline, axe at 320, 390, 1440 and 200% zoom, keyboard and focus, reduced motion, and before/after screenshots. Work happens in a separate worktree; nothing is committed without Jose's say-so.

| Phase | What | Notes |
|---|---|---|
| **0. Four defects, on their own** | Remove approve and swipe from Inbox rows; availability uses eligible people (0 of 5); a distinct disabled look with its reason; "All day" for 00:00–24:00 | Two of these are live in code today (`manager-inbox.tsx:37-41`, `page.tsx:79`). Trust fixes shouldn't wait for styling. |
| **1. Tokens, components and corrected comps** | F2, F3, F7 in one token sheet; shared band, card, list row, pill, Next up, tab bar with sliding pill, bottom action bar; built in rem for large text; update the canvas comps to match | Re-run the U10 baseline and the brand-colour floors on the grey canvas. |
| **2. Manager and Owner phone** | All designed screens and states, plus F1, F4, F5, F6, F8; context-carrying links (person and period into Timecards, day into Add shift, back to the Inbox filter); retire the legacy `/app?view=*` dashboard with redirects; date-grouped Inbox (This week / Next week / Earlier); a check screen before each location publishes; a server-error state distinct from offline | Summary lines move here; they are core, not polish. |
| **3. Employee and Lead phone** *(new)* | Same band and cards; the green next-shift pass stays as their "Next up"; summary lines from existing data; request timeline (sent, decided by whom and when); hours so far and payday date; swap starts from your upcoming shifts; Profile and Availability fixes from the employee review | Tabs unchanged. Leads use the employee app. |
| **4. Desktop** | Home and list+detail Inbox; band at most 200px tall; sidebar says "Team"; Requests folded into Inbox with `/app/requests` still working | |
| **5. Speed and motion** | Reuse what ships (skeletons, toasts, sheet physics, reduced motion); prefetch navigation routes; sliding tab pill; money and hours with smaller cents and units | **Cut count-up numbers.** Private live data keeps pausing offline and in background tabs. |
| **6. Spanish readiness and phone polish** | F9; Inter's optical-size axis for titles (no second font); header that shrinks for large text and on scroll; no white bounce behind the band; new app icon once D-7 is decided | Dark mode moves after Spanish. |
| **7. Zero-defect inspection** *(added Oct 18, 2026 at Jose's request; runs after every build phase, before Jose inspects)* | Senior inspectors each own one area and check it one item at a time on every screen, role and width: alignment and geometry (buttons, baselines, icons, edges, padding); bars and stability (header, band, tab bar, action bars, sticky elements, layout shift, loading to ready); type, colour and copy (sizes, wraps, truncation, contrast, wording rules); interaction and states (focus, keyboard, pressed, loading, empty, error, offline, Back, toasts, sheets); widths and roles (320 to 1440, Manager and Owner, landscape, large text). Every finding is measured, located and shown with a screenshot. All findings are fixed, then re-inspected until none remain | Goal: Jose finds no defect. Inspectors don't change app code or data; fixes happen in the worktree. First run: Phase 2 surfaces. **Rhythm (agreed Oct 18):** a focused pass on just the new screens after each of phases 3–6, then one full pass across the whole app before release. **From Oct 19:** the matrix, exit rule and page coverage in "Revised plan, October 19" below apply. |

## Revised plan, October 19: every page, every role, every state, every device

Jose's bar for demanding clients. This section governs the build order, inspection and exit rule from Phase 3 onward. Where it differs from the table above, this section wins.

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
| Browsers | Chromium (Chrome, Edge, Android) and WebKit (Safari, every iPhone browser). Firefox cut by Jose on Oct 19: hardly any users have it |
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
| Device harness | Scripts for WebKit, 200% zoom, throttled network, the iOS Simulator and the Android emulator |

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

## Later, each needs a decision or backend work

| Item | Why | Needs |
|---|---|---|
| Full Spanish for the employee and Lead app (B5) | TEAM-RULES names it as what sets NEVORA apart; today the page language is fixed to English | Translation dictionaries |
| One reminder to the employee at shift start | Prevents missed clock-ins instead of reporting them | Push sender |
| Notifications in tiers with a daily digest, and alerts with record context (week, subject) | Two identical "Schedule update" rows tell people nothing | Read-model fields |
| Show the impact inside time-off and swap review (overlapping shifts, coverage) | Competitors list conflicts on the request itself | Authorized read |
| Keep last-seen numbers on screen when offline ("as of 6:14 PM", actions paused) | Better than a blank card | Privacy review |
| Employee fixes their own missed punch from a prompt | Homebase does this; fewer manager tasks | Ties to B6 corrections |
| A plain "NEVORA checked…" summary linked to its records | Answers "do you have AI?" without a model | None beyond existing reads |
| Pay-status tracker instead of instant pay | Owners ask; NEVORA doesn't move money | Payroll copy approval |
| Passkeys; invites through the owner's share sheet (WhatsApp, SMS) | Faster sign-up and sign-in | Security review |
| Capacitor wrapper, then an app-store kit with accessibility labels | No major competitor lists App Store accessibility labels yet | Spike first |
| A believable Puerto Rico demo company | Today everyone shows 56h and ten people earn $1,000 gross | Fixture work |
| Dark mode | After Spanish; brand colours are light-only and `globals.css` has 165 `!important` rules | Brand dark ladder |

## Decisions for Jose

**Approved October 18, 2026:** Jose accepted every recommendation below (D-1 to D-9).

**Phase 0 status:** the four defects were already fixed by the owner-portal session on branch `claude/owner-batch-1` (commit 44e831d, evidence in `docs/product/specs/owner-batch-1`), followed by batches 2 and 3 on `claude/owner-batch-2` and `-3`. None is merged into `NEVORA-UI-READINESS` yet; a dry-run merge of batch 3 into the current branch head reports no conflicts. Batch 4 is still in progress in its own worktree.

| # | Decision | Recommendation |
|---|---|---|
| D-1 | Employee Home: the next-shift pass overlapping a short teal band (A), or no band on employee Home (B)? | A, after a prototype at 320 and 390 in every pass state |
| D-2 | Primary buttons: action teal #077572 or header teal #1C4A47? | Action teal (all reviewers) |
| D-3 | Page background: soft grey #F2F4F3 (comps) or white (currently approved)? | Grey |
| D-4 | Desktop sidebar says "Team", and Requests folds into Inbox? | Yes, old links keep working |
| D-5 | Approve the small server change so a decision returns you to Inbox? | Yes; the "after approving" state depends on it |
| D-6 | Dark mode now or after Spanish? | After Spanish |
| D-7 | Replace the installed app icon? It is still the old blue flame (`public/icons/fuel-*.png`, `src/app/app/layout.tsx:23`) | Yes; you approve the new mark |
| D-8 | When to start full Spanish (B5)? | Right after phase 3 |
| D-9 | Run a Capacitor spike for a store app? | Yes, after phase 2 |

## Backend or data changes flagged by the reviews

Inbox count available on every page · return-to-Inbox after a decision (D-5) · open a timecard straight to one person · employee-side "shift with no punches" read · Attendance as its own page · a Profile page for managers · notification record context · overlapping-shift read for time-off review. Each is flagged before it is touched; nothing in phases 0–2 depends on them except D-5 and the per-page Inbox count.
