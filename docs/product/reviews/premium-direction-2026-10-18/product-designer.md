# Premium direction review: Product Designer

- **Date:** 2026-10-18
- **Reviewer:** Product Designer (read-only; no app code changed, nothing committed)
- **What I reviewed:** the Manager and Owner design comps and their latest screenshots, measured against `docs/product/TEAM-RULES.md`, `DESIGN.MD` from "Gusto Home — 2026-10-15" onward, `docs/product/direction.md` (principles P1–P5, the five NEVORA traits), and the two independent reviews of 2026-10-18 (manager and employee).
- **Screens cited:** `SHOTS` = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/shots/`. Comp sources are in `…/scratchpad/canvas/project/*.dc.html`.
- **Limits:** these are static comps on fictional data. I did not open the live preview for this review, so I made no claims about the shipped app beyond the code lines cited. Nothing ran on a phone.

---

## Verdict

**Revise. The direction is right; as drawn it scores 11 of 16.** The structure is the best NEVORA has had: one summary line, one Next up, decisions only on full review screens, honest states. What holds it back is execution detail that would hurt trust and continuity once built: counts that don't agree between screens, one state that can't happen, a button colour that leaves the token system, new words for things that already have approved names, and no Employee or Spanish version at all. With the required changes in section 2, I score it **15 of 16: go**.

| Line | As drawn | Reason | After required changes |
|---|---|---|---|
| Usability | 2 | One summary line and one primary action per screen; decisions sit beside their details (`p1-Request-Review.png`). | 2 |
| Familiarity | 2 | Band, overlapping cards and a pill tab bar match Gusto Mobile and iOS conventions people already know. | 2 |
| Trust | 1 | Home says 3 things while the Inbox badge says 4, one Owner Home shows a state that can't happen, a pronoun is guessed from a name, and the word "missing" leans toward blame (2.1). | 2 |
| Accessibility | 1 | Pills are 13px against the 15px phone floor (U0). The teal focus ring would disappear on the dark band. Muted text on the grey canvas measures 4.53:1, right at the AA limit. | 2 |
| Brand distinctiveness | 1 | The chevron line art and the teal ladder are NEVORA. A dark band over white cards is a common fintech template, and the comps show no Spanish and no pass. | 2 |
| Durability | 2 | Calm surfaces and plain words will age well. A 22px radius is a 2025–26 iOS habit; on desktop it should step down. | 2 |
| Cost | 1 | Restyles every phone page and the desktop shell. That is fine if it reuses what already exists (skeletons, toasts, sheets) and avoids rebuilding it. | 1 |
| Continuity | 1 | Renames (Employees → Team, Account recovery → Help someone sign in), a sidebar entry removed, and the D1 location trail dropped, all without migration notes. | 2 |
| **Total** | **11 — revise** | | **15 — go** |

---

## 1. Where the direction is strong: protect these

| What | Where | Why it matters | Protect by |
|---|---|---|---|
| **Decisions only on a full review screen** | `p1-Request-Review.png`, `p3-Desktop-Inbox-1440.png`; Inbox rows say Review, not Approve (`p1-Inbox.png`) | It closes the manager review's P1 defect D1 (context-free approval). The code still ships that path today: `src/components/manager-inbox.tsx:37-41` renders `TimeOffReviewActions` inside a `SwipeRow`. | Approve and Decline appear only next to dates, length, location and note. No keyboard shortcut from the list pane on desktop. No swipe. |
| **The summary line in the band** | Every comp ("3 things need you today.", "Main Office is live. West Office is a draft.", "Approvals open after Oct 18. 2 shifts need a fix.") | It answers "what's going on?" before any card. It's the most NEVORA thing in the comps, because it puts our voice to work: plain, specific and calm. | One sentence, built from the same data as the cards below it, never hand-written. Rule in 2.1. |
| **One Next up with one primary action** | `p1-Home-Manager.png`, `p2-Schedule.png` | Cuts the choice down to one thing (Hick's law). The 40-task wall from the manager review (MG2) is gone. | Exactly one filled button per screen. Everything else is a row link or a secondary button. |
| **Honest states** | Offline: "Nothing was changed. Numbers come back when you reconnect." (`p3-State-Home-Offline.png`). "Counts published shifts only", "Updated 6:14 PM", "Checked 6:14 PM" (`v6-State-Inbox-Clear.png`) | This is the "calm and verified" trait and principle P2. | Keep every freshness stamp. Show "caught up" only for a ready, empty read, as U4 already requires. |
| **Disabled means disabled, and says why** | Timecards: "Approve opens after the period ends" with a lock (`p2-Timecards.png`). Payroll: Approve stays grey until the checkbox is ticked (`p3-Payroll-Owner.png`) | Fixes defect D3 and shows the reason, not just a faded button. | Pair each disabled control with its reason. Keep `disabled` semantics. |
| **Self-review made visible** | Timecards row "Morgan Rivera · Another manager approves · Yours" (`p2-Timecards.png`) | Shows a permission boundary without hiding the record. | Use the same treatment everywhere the viewer's own record appears (gap in 2.1). |
| **More grouped by purpose** | `p3-More-Owner.png`: Time and pay, Scheduling, Team, Company, You. "My pay · Only you". | Closes MG3 and separates team exports from personal pay. "Only you" is a strong privacy cue. | Keep the groups and the "Only you" tag. Add migration notes for the renamed rows (2.4). |
| **Payroll kept serious** | Stepper, "Revision 2", pinned button name "Approve revision 2", no celebration (`p3-Payroll-Owner.png`) | The "trustworthy pay" trait and P4. | Every new payroll string goes through the payroll copy approval (2.4). |
| **Schedule focused on today** | "Publish West Office" per location, "7 not working today" collapsed, amber legend (`p2-Schedule.png`) | Closes MG5. Publishing stays per location, as the review asked. | Keep "Publish <location>". Never one "Publish all" button. |
| **The fixed availability denominator** | "0 of 5 sent" on Home and Team (`r2-Home-Refined.png`, `p2-Team.png`) | Defect D2 fixed in the design. The code still uses `activeEmployees` (`src/app/app/page.tsx:79`). | Use `eligibleEmployees` for progress and `activeEmployees` for team size. |
| **The chevron line art** | Faint double chevron in every band | A quiet echo of the wordmark's A. It's the one decorative element that is ours. | Keep it on the band only, never behind content, and hidden under increased contrast. |

---

## 2. Gaps and risks

### 2.1 Trust: numbers and words that would mislead

| # | Issue | Screen | Required change |
|---|---|---|---|
| T1 | **Counts disagree.** Home says "2 things need you today" while the Inbox tab badge says 4. The Inbox headline says "3 missed clock-ins and 1 request" (4 items). Home counts groups and the badge counts items. | `p1-Home-Manager.png` vs `p1-Inbox.png` | **One counting rule:** badge = Inbox headline = sum of Home's Next up and Also waiting items. Count items, not groups ("4 things need you"). All three read from the same `useActionCenter()` snapshot plus the B4 missed-punch list. Test: the numbers match on every fixture. |
| T2 | **A state that can't happen.** The Owner Home at 6:14 PM shows "Not in yet 2" and "2 people haven't clocked in… started at 8:00 AM". The Manager Home at the same moment says "All of today's shifts have ended" and lists 3 shifts with no punches. The two greetings also differ: "Good afternoon" and "Good evening". | `p3-Home-Owner.png`, `r2-Home-Refined.png` vs `p1-Home-Manager.png` | Build Next up from the B4 projection (`src/lib/today/project.ts`), never from fixed copy. Before handoff, fix the Owner comp to the post-shift state so the build doesn't copy it. |
| T3 | **"Missing" and "missed".** "See who's missing", "Review missed clock-ins" and "3 missed clock-ins" imply fault. B4 deliberately uses factual words ("Started, not clocked in", "No punches recorded") and a test bans "no-show" and "absent". | Home and Inbox comps | Use "See who hasn't clocked in", "Review shifts with no punches" and "3 shifts with no punches and 1 request need you." Add "missing" to the banned-words test for attendance copy. |
| T4 | **A pronoun guessed from a name.** "Her note" is inferred from "Alexandra". NEVORA holds no gender data, so this invents data. | `p1-Request-Review.png`, `p3-Desktop-Inbox-1440.png` | "Note" or "Alexandra's note". Spanish gets "Nota de Alexandra". |
| T5 | **Status pills read like buttons.** On Home, "Approve" (amber) and "Review" (teal wash) sit in the same column. One is a verb on a status colour, the other a verb on the action colour. People will tap the pill expecting a decision. | `r2-Home-Refined.png`, `p3-Desktop-Home-1440.png` | Make the whole row the link, with a chevron. Pills become status nouns on the ladder: "Waiting for you" (amber), "Your review" (amber), "Draft" (grey). Verbs belong only on buttons (P1). |
| T6 | **New words for approved states.** "Live" replaces "Published" ("1 of 2 live", "Main Office is live"). U3, B4 and the employee pass all say Published. Employees would see "Published" while managers see "live" for the same thing. | `p2-Schedule.png`, Home comps | Keep "Published" ("1 of 2 published", "Main Office is published. West Office is a draft."). |
| T7 | **Your own record as someone else's task.** Morgan (the signed-in manager, avatar MR) sees "Morgan Rivera · no punches" in Act now with a Timecard link. Timecards correctly says "Yours · Another manager approves". | `p1-Inbox.png`, `p3-Desktop-Inbox-1440.png` vs `p2-Timecards.png` | In the Inbox, mark the viewer's own row "Yours · another manager reviews" and leave it out of the count that "needs you". Self-review rules stay on the server. |
| T8 | **"Plan next week" may hold past gaps.** The manager review (MG2) found that the 21 coverage gaps include earlier days of the selected week. Calling them "Plan next week" relabels history as future work. | `p1-Inbox.png` | Group by date: "This week" for open gaps from today on, "Next week" for planning, and a collapsed "Earlier" for past gaps. Don't delete or resolve them. |
| T9 | **Unclear payroll labels.** "Earlier periods · No payroll run yet · 2" can read as "no runs at all". "Fictional Accountant" at the top right of Totals has no label. | `p3-Payroll-Owner.png` | "2 earlier periods have no payroll run" and "Provider: Fictional Accountant", subject to payroll copy approval (2.4). |
| T10 | **Owner payroll sits under "Also waiting · Inbox", but payroll isn't in the Inbox.** Tapping "Inbox" won't show it. | `r2-Home-Refined.png` | Either add payroll review to the Owner's Inbox (it's a decision) or move it out of the card the Inbox link heads. I recommend adding it to the Inbox under a "Pay" group, linking to the run. It is never decided from the list. |

### 2.2 System: tokens, colour and type drift

| # | Issue | Evidence | Required change |
|---|---|---|---|
| S1 | **Primary buttons use the masthead colour #1C4A47, not the action teal #077572.** That breaks trait 1 ("teal means act here") and P1. It also defeats B1: the brand derivation lightens dark seeds "so buttons stay distinct from the header". With a company brand, buttons the same colour as the band would merge into it. | `Request-Review.dc.html` `<button class="btn" style="background: #1C4A47">`; the same in every comp | Buttons use `--g-accent`. If design wants a deeper button, add a derived `--g-action-strong` to `derive.ts` and test it against the B1 floors (white text ≥ 5:1, distinct from the masthead). Don't hard-code it. |
| S2 | **The comps use their own palette.** Ink #16191C (approved #1C1C1C), muted #6B7075 (approved #5F6368), canvas #F2F4F3 (approved white), hairline #EEF0F1 (approved #ECEDEF). Muted on the new canvas measures 4.53:1, barely AA. | Hex count across `*.dc.html` | Phase 1 decides once. My recommendation: adopt the #F2F4F3 canvas, which gives the cards their lift, and keep the approved ink, muted and hairline values (#5F6368 on #F2F4F3 measures 5.5:1). Re-run the U10 baseline and the B1 floor tests on the grey canvas, because B1 checked tints on white and wash only. |
| S3 | **Pills at 13px** ("Waiting for you", count chips) are under the 15px phone floor. Only the "Published" and clock chips may be 14px (U0, U2). | `Request-Review.dc.html` line 49 | 14px minimum for status pills on phones, 15px for everything else. |
| S4 | **The focus ring disappears on the band.** The approved ring is teal #077572, which measures 1.8:1 on #1C4A47 (3:1 needed). This affects band chips, the search field, the week arrows and the back link. | Inbox chips, Team search, Schedule week arrows | A white (or `--g-masthead-ink`) ring on band elements, at least 3:1 against the masthead for every brand seed. Add it to the B1 floors. |
| S5 | **A second filter style.** Chips on the dark band ("All · Act now · Requests · Plan") compete with D4's single segmented control. Labels drift between screens ("Plan" vs "Planning"), and counts show on some screens and not others. | `p1-Inbox.png` vs `v6-State-Inbox-Clear.png`, `p3-State-Approved.png` | One band-chip component, documented as the phone version of the D4 control, with the same 44px targets. One label set: "All · Act now · Requests · Planning", always with counts. At 320px the row scrolls with an edge fade (U1 behaviour), and "Planning 39" must not clip at 390 as it does now. |
| S6 | **New sizes outside the scale.** A 30px title with -0.022em tracking, 22px card radius, about 16px button radius. The approved scale is 28/20/16/14/12, with 12px cards and 8px controls. | All comps | Update the scale on purpose: phone title 30, desktop title 28. Card radius 20 on phones and 12 on desktop dense pages (D2 tables, Timecards). One control radius per platform. Write it into DESIGN.MD as a dated section that supersedes Batch 1. |
| S7 | **Eyebrows aren't consistent.** The loading state's eyebrow is sentence case ("Sunday, October 18"); every other state is uppercase. | `v6-State-Home-Loading.png` | One eyebrow style. Uppercase with tracking is fine in English. In Spanish, check that uppercase doesn't strip accents. |

### 2.3 Continuity: renames and removals without notes

TEAM-RULES requires a reason and a migration note for every move or rename. Each of these needs one before build:

| Change in comps | Today | Note needed |
|---|---|---|
| Sidebar "Team" | Sidebar "Employees", label set by the B2 words preset (Retail, Restaurant and other presets) | Read the label from `words.ts`. Don't hard-code "Team" on desktop. The phone tab already says Team. Decide whether the sidebar matches the tab (I recommend yes, using a new words slot). |
| Sidebar loses "Requests" | D3 has Requests in the Owner's 10 entries | Where do Time off, Shift requests and Availability live on desktop? I recommend Inbox owns them, as on phones (U4), with `/app/requests` still working and lighting Inbox. |
| "Help someone sign in", "Find a Clocker action" | Account recovery, Clocker recovery (D3 shortcuts, More) | Good plain language (MG10). Keep the old names as ⌘K finder keywords, and update QA scripts that press the old labels. |
| Desktop top bar shows only the workspace name | D1 trail: "Workspace › Section › Page" with a link back | Keep the D1 trail. It's how desktop users know where they are. |
| Back link "Requests" on the review screen | The reviewer arrived from Inbox | Back returns to where you came from, with the Inbox filter kept (manager review scenario 1). |
| Back to Inbox after approving | Today the action lands on the Time off page (U4) | **Backend change:** U4 recorded that returning to the Inbox needs a small server-action change awaiting Jose's approval. `p3-State-Approved.png` depends on it. |

### 2.4 Copy that needs separate approval

- **Payroll copy is locked.** New strings on `p3-Payroll-Owner.png` ("Your review is next", "Before you approve", "Employee amounts · Check each person's net pay", "Earlier periods") and the Home row "Payroll Sep 21 – 27 · Payday Tue, Sep 29" go through the payroll copy approval. "Approve revision 2" and "I reviewed revision 2…" stay exactly as they are.
- **Script-pinned strings** stay ("Loading Home…", "Refresh home", "You're all set.", "Approval recorded"). The comps' "Loading today…" is a new string: add it, keep "Loading Home…" for screen readers, or update the scripts in the same change.

### 2.5 Where it could feel generic

A dark band over white cards with a pill tab bar is the shape of most 2026 finance apps (Gusto, Mercury, Revolut). Our layout is not what makes NEVORA recognisable. These things are, and the comps show only some of them:

1. **The voice.** The summary line is the strongest differentiator. Write it in Spanish first (see 4.3).
2. **The pass.** The perforated next-shift ticket (U2) is NEVORA's one brand moment, and the comps never show it. The employee version must keep it (section 3).
3. **The chevron motif.** Keep it.
4. **Verified stamps.** "Updated", "Counts published shifts only", "Only you". Keep them on every summary.
5. **Spanish.** Not one comp shows it. Until it does, the Puerto Rico trait exists only on the Clocker.

### 2.6 Missing states and variants

- **Partial-day time off.** The review comp shows only "2 full days". The manager review's D1 acceptance asks for the interval on partial days ("Wed, Oct 28 · 1:00 PM – 5:00 PM").
- **When it was asked.** The review screen should say when the request was submitted, if the request record holds it.
- **Overlap with shifts.** "She has 2 shifts in those days" would help the decision. That needs an authorized read joining the request to published shifts: **backend read**. Until then, the "See that week's schedule" link is the right fallback.
- **Long Spanish names.** "María José Rivera Santiago With A…" truncates on every screen. On the review screen and in the Timecards "From Inbox" card the full name must wrap, never truncate. Truncation is fine in lists if the accessible name holds the full name.
- **Error state.** There's a loading, offline, empty and success state, but no "couldn't load, online" state (the server failed). It must differ from offline and never show zeros (P2).
- **Lost access** (role changed mid-session), already handled by U4. It needs a comp in the new shell.

---

## 3. Employee and Lead: adopting the system

Employees are most of NEVORA's phone users (TEAM-RULES "Users"), yet the plan has no employee phase. A manager who opens an employee's phone during a shift would see two products. The employee review rated the employee portal "go with conditions": consistent but uneven. This system can fix that, if what is specific to employees stays.

### 3.1 What carries over unchanged

The band with eyebrow, title and summary line. White cards on the grey canvas. Status pills on the ladder. The thin "n of m" bars. The pill-behind-icon tab bar. The loading, offline and empty states. One primary action per screen. Freshness stamps.

### 3.2 What stays different for employees

| Stays different | Why |
|---|---|
| **Tabs: Home · Schedule · Requests · Pay (Hours when payroll is off) · More** (`mobileTabsForRole`, `src/lib/navigation.ts:143-147`) | Muscle memory since U1. No Inbox and no Team. |
| **The pass is the employee's Next up**, always first (commit fae3512, U2 script contract "next shift before To do") | It's the brand moment and the thing employees open the app for. |
| **No coral alarms aimed at the employee.** Their own reviews are amber. A late or missing punch is never shown to them as a red warning on Home. | U7 bans shaming. The "calm" trait. |
| **Only their own data.** No team counts, no colleagues' names outside a published schedule, no availability progress for others. | Privacy and role boundary. |
| **Celebrations stay employee-side** (schedule confirmed, time off approved, payday). They never appear for managers' decisions or for payroll. | U7 gate, as built. |
| **Leads use the employee experience.** `LEAD` shares employee tabs and pages. The only lead-specific content is open shifts that "need a qualified shift lead" (B3), shown when the lead is eligible. | Don't invent lead screens. |

### 3.3 Employee Home in the new system

**Layout decision for Jose (D-1 in section 5).** The band and the pass are both dark teal. Put the pass on the band and it loses its edge. U2 dropped the teal hero precisely so the pass would be the only brand-colour block. Two options:

- **A (recommended): a short band, with the pass as the overlapping first card.** The band holds the eyebrow date, "Good afternoon, Alexandra" (name only where supplied, as today) and the summary line. The pass overlaps the band in place of the white Today card: its accent-to-masthead gradient, a 1px light inner edge and the card shadow, so it reads as a raised ticket. Increased contrast flattens it to an outlined card, as U2 already does.
- **B:** Employee Home only keeps a thin wordmark bar with no band, as today. Every other employee page uses the band.

A keeps one system across roles. B is cheaper and safer for figure-ground. Prototype A at 320 and 390 with the pass in each of its states before deciding.

**Next up (the pass), in priority order, from existing Home data:**

| State (data that exists) | Pass shows | Summary line |
|---|---|---|
| Open time entry recorded | "You're on · Clocked in 7:58 AM · Until 4:00 PM" (clock status, U2) | "You're working until 4:00 PM." |
| Shift today, not yet started | Today · time · countdown pill · location and position | "Your shift starts at 8:00 AM." |
| Next shift later | Tomorrow or date · time · location | "Your next shift is tomorrow at 8:00 AM." |
| No published shift | Calm white card, "No upcoming published shift" (script-pinned) | "No shifts published for you yet." |
| Required reviews exist (schedule confirmation, update acknowledgement) | The pass stays first. A "Needs you" card follows directly, in amber. | The count takes priority: "2 things need you. Next shift tomorrow, 8:00 AM." |

The last row also settles the employee review's M8 (required work below the first screen). The count moves into the summary line, so the pass stays first and the script contract holds.

**Fix in the same pass:** "Shifts shown are final" (`18-visual-home-390.jpg`) suggests a shift can never change. Use "Published shifts can still change; we'll tell you if they do." only if that matches the update policy. Otherwise "These shifts are published."

### 3.4 Employee screens that change

| Screen | Eyebrow | Summary line (existing data only) | Next up / primary action | Notes |
|---|---|---|---|---|
| Home | Date | See 3.3 | The pass | Quick actions stay as tiles (U2). |
| Schedule › My shifts | "Oct 12 – 18, 2026" with week arrows | "3 shifts this week · 24 hours." Plus "West Office hasn't published yet." when true | "Confirm this week" when a confirmation is required, otherwise none | Keep the shift list before confirmation (employee review). |
| Schedule › Open shifts | Same | "2 open shifts you can pick up." | None. Each card links to "View and claim". | Blocked list collapsed (B3). Lead-only shifts appear only when eligible. |
| Requests (overview) | "Requests" | "1 request waiting for your manager." or "No requests waiting." | "Request time off" | Keep the "Start a request / Track your requests" grouping, which the review praised. |
| Time off form | "New request" | "Your manager reviews it before it's final." | "Send request" | Draft handling stays. Full and partial day stays. |
| Request detail | "Time off request" | "Waiting for Morgan" / "Approved by Morgan, Oct 17" (only if the record holds the reviewer) | Withdraw, if allowed today | A small timeline: Sent → Reviewed. |
| Availability | "Availability" | "Your usual week." / "Week of Oct 19 · due Fri" when a deadline exists | "Save usual week" or "Send for Oct 19 – 25" | Closes M5: a visible Usual / Specific week switch. When no deadline exists, say why no weekly send is open. |
| Pay › Statements | "Pay" | "Latest statement: payday Fri, Oct 16." / "No statements published yet." | Open latest statement | **Payroll copy approval.** No amounts (statements carry none, U6). |
| Pay › Hours, Timecards | "Oct 12 – 18 · open period" | "This period is open. Your manager reviews it after Oct 18." | None | Keep the Pay family tabs (already fixed for M7, `navigation.ts:185-188`). |
| Updates | "Updates" | "1 update needs your review." | "Review" on the update | Keep opening separate from acknowledging. |
| Notifications | "Notifications" | "3 unread." | None | M6 needs week and subject in the read model: **backend read**. |
| Profile | "Profile" | "Your work information and app settings." | None | Apply M1–M4: Work details, App settings, collapsed calendar row, compact Sign out. |
| More (sheet) | n/a | n/a | n/a | Same grouped sheet as managers: "You" (Profile, Updates, Notifications), Sign out. |

**Employee desktop (D5):** same band as on phones, compact (about 160px), with My schedule's two-column layout kept.

---

## 4. More improvements not in the plan, by impact and effort

Score order: Usability / Familiarity / Trust / Accessibility / Brand / Durability / Cost / Continuity. Each line is 0–2.

| # | Improvement | Impact | Effort | Score | Why (one line) | Backend? |
|---|---|---|---|---|---|---|
| I1 | **One "needs you" count** (T1): badge = headline = Home items, from one snapshot | High | S | 2/2/2/2/1/2/2/2 = **15** | Numbers that disagree are the fastest way to lose a manager's trust. | No |
| I2 | **Employee adoption phase** (section 3) | High | M | 2/2/2/1/2/2/1/2 = **14** | Most users are employees; without it the product looks like two apps. | No, except M6 |
| I3 | **Spanish in every comp, before build:** each summary line as a dictionary template, checked at 320 for length | High | S (design) / L (B5) | 2/2/2/2/2/2/1/2 = **15** | Spanish runs 20–30% longer; band chips and 30px titles will break if we find out late. | B5 for the full app |
| I4 | **Action colour back on the token** (S1) and a band focus ring (S4) | High | S | 1/2/2/2/2/2/2/2 = **15** | Keeps B1 brands working and keyboard users oriented. | No |
| I5 | **Context-carrying links** (MG4): person and period into Timecards, day into Create shift, return to the original Inbox filter | High | S–M | 2/2/2/1/1/2/1/2 = **13** | "From Inbox" in `p2-Timecards.png` shows the intent; the URLs must carry it. | Small route params; no data change |
| I6 | **Status nouns on pills, verbs on buttons; "Published" not "live"** (T5, T6) | Medium | S | 2/2/2/1/2/2/2/2 = **15** | A pill people tap by mistake is a small daily friction that erodes trust. | No |
| I7 | **Self-record rule in Inbox** (T7) | Medium | S | 1/1/2/1/1/2/2/2 = **12** | The same "Yours" treatment Timecards already shows. | No (server rules unchanged) |
| I8 | **Retire the legacy `/app?view=*` dashboard** (MG1) explicitly in phase 2, with redirects to Inbox, Schedule, Team and Attendance | High | M | 2/2/2/1/1/2/1/1 = **12** | The new shell is wasted if "All requests" still opens the old dashboard. | No |
| I9 | **Date-grouped Inbox** (T8): This week, Next week, Earlier | Medium | S | 2/2/2/1/1/2/2/2 = **14** | Past gaps stop posing as next week's work. | No (grouping of existing findings) |
| I10 | **Build new components in rem from day one** (direction item 8, A9) | Medium | S now / M later | 1/2/2/2/1/2/2/2 = **14** | Doing it in phase 1 avoids restyling everything twice for large text. | No |
| I11 | **Request review: partial-day variant and submitted date** (2.6) | Medium | S | 2/2/2/1/1/2/2/2 = **14** | D1's acceptance criteria name partial days explicitly. | No, if fields exist |
| I12 | **Overlapping-shift line on time-off review** | Medium | M | 2/2/2/1/1/2/1/2 = **13** | Managers decide better when they see the impact before approving. | **Yes: authorized read** |
| I13 | **Notifications with record context** (M6) | Medium | M | 2/2/2/1/1/2/1/2 = **13** | Two identical "Schedule update" rows tell people nothing. | **Yes: read-model fields** |
| I14 | **Server-error state** distinct from offline (2.6) | Medium | S | 1/2/2/1/1/2/2/2 = **13** | P2: a failed read must never look like "nothing to do". | No |

---

## 5. What I'd cut, reorder or do differently in the plan

| Plan phase | Change | Reason |
|---|---|---|
| 1. Tokens, components and four defect fixes | **Split it. Ship the four defects first, on their own** (context-free approvals, denominator, disabled look, all-day time). Then do tokens. | D1 and D2 are live in code today (`manager-inbox.tsx:37-41`, `page.tsx:79`). A trust defect shouldn't wait on a CSS consolidation. |
| 1 (tokens) | Resolve S1, S2, S3 and S6 **before** building components: one action colour, one palette, a type floor, radii per platform. Build in rem (I10). Re-run the U10 baseline and the B1 floors on the grey canvas. | Otherwise every comp hex becomes a new hard-coded value, which is exactly what U10 removed. |
| 2. Manager and Owner phone screens | **Add the legacy dashboard retirement** (I8), the one-count rule (I1) and the summary line (moved here from phase 5). | The summary line is the core of the design, not polish. |
| (new) 2b. Employee and Lead phone screens | **Add.** Section 3. Decide D-1 (pass on band) with a prototype first. | Majority of users; one product. |
| 3. Desktop Home and Inbox | Keep the D1 trail and the sidebar labels from `words.ts`; band at most 200px tall on desktop; 12px radius on dense pages. | Desktop is where Owners spend their day; a tall dark band costs a quarter of the 900px screen. |
| 4. Speed and motion | **Reframe as "apply what exists".** Skeletons (U0), toasts (Phase 4), sheet physics (Phase 3) and reduced motion already ship. Keep prefetch for navigation routes, not private snapshot APIs, which must keep pausing offline and in background tabs (U4). Keep the sliding tab pill (cheap, off under reduced motion). **Cut count-up numbers.** | Count-up delays reading the number people came for. It re-animates on every 30-second B4 poll and makes operational and pay figures feel playful (P4). |
| 5. Type, voice, PWA | Inter Display: use Inter's variable optical-size axis instead of a second family (it's still Inter, so within the constant, with less to download). Voice moves to phase 2. The PWA status bar is already #1C4A47 (U0); add `overscroll-behavior` and a band-coloured `html` background for the top bounce only. | Avoid redoing finished work. |
| 6. Company logo, dark mode | **The logo already ships** (B1: white chip beside the wordmark in the phone header). This becomes "place the B1 chip in the new band". **Defer dark mode** and put Spanish readiness (I3) in its slot. | Direction A16 scored dark mode Cost 0: the B1 ladder is light-only and `globals.css` carries 165 `!important` rules. Spanish is the weakest NEVORA trait. |
| 7. Verification at the end | **Verify every phase**, not just the last: the 156-check sweep, the U10 diff, axe at 320, 390, 1440 and 200% zoom, and the D1–D4 acceptance scenarios from the manager review. | Bugs found at the end cost the most. |

**Open decisions for Jose**

| # | Decision | My recommendation |
|---|---|---|
| D-1 | Employee Home: pass overlapping a short band (A) or no band on employee Home (B)? | A, after a prototype at 320 and 390 in every pass state. |
| D-2 | Primary button colour: action teal #077572 or masthead #1C4A47? | Action teal, through `--g-accent`. If you want it deeper, add a derived, tested token. |
| D-3 | Canvas: grey #F2F4F3 (comps) or white (approved)? | Grey on phones and desktop, keeping the approved ink and muted values. |
| D-4 | Desktop sidebar: "Team" to match the phone tab, and Requests folded into Inbox? | Yes to both, with the label from `words.ts` and `/app/requests` still working. |
| D-5 | Approve the small server-action change so a decision returns to the Inbox (U4)? | Yes. `p3-State-Approved.png` depends on it. |
| D-6 | Dark mode now or after Spanish? | After Spanish. |

---

## Top 10, in priority order

1. **Ship the four defects now, on their own:** remove the context-free Inbox Approve and swipe, use `eligibleEmployees`, add a distinct disabled look with its reason, show "All day" for 00:00–24:00.
2. **One "needs you" count:** badge = Inbox headline = Home items, from one snapshot. Fix the Owner comp's impossible state.
3. **Primary buttons on `--g-accent`** (or a derived, tested token), plus a white focus ring on the band.
4. **Reconcile tokens before components:** one palette, a 14–15px phone floor for pills, radius per platform, built in rem. Re-run the U10 and B1 tests on the grey canvas.
5. **Fix the words:** "Published" not "live", no "missing" or "missed", "Note" not "Her note", status nouns on pills and verbs on buttons, one filter label set.
6. **Add the Employee and Lead phase:** the pass as Next up, summary lines from existing data, Profile M1–M4, Availability M5, tabs unchanged.
7. **Design every new screen in Spanish at 320px before build,** with summary lines as dictionary templates.
8. **Retire the legacy dashboard views and carry context:** redirects for `/app?view=*`, person and period into Timecards, back to the original Inbox filter, "Yours" on your own records.
9. **Write migration notes for every rename and removal:** Team, Help someone sign in, Find a Clocker action, the Requests sidebar entry, the D1 trail kept. Route new payroll strings through copy approval.
10. **Cut count-up numbers, defer dark mode, and verify every phase** with the existing sweep and baselines instead of one pass at the end.
