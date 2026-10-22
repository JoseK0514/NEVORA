# Experience coherence and trust — senior analyst review

**October 21, 2026 · Lens: cross-role coherence, first-run, trust language, decision safety · For Jose**

Read-only. Sources: branch `NEVORA-UI-READINESS` at 8c4dd505 (this checkout) and `claude/auth-premium` at 88ca719d (read-only at `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/auth` — cited below as `auth:`). Code was read, not rendered; items marked **verify** need one browser pass before the go.

This review deliberately does not repeat `docs/product/reviews/gap-analysis-2026-10-20/SUMMARY.md` (the 22-gap business list). It cross-references it where a gap is also an experience problem, and otherwise covers what that list does not: what one person actually sees in one day.

---

## 1. The shell inventory: how many products does NEVORA look like?

Five visual generations coexist in the release-candidate code, selected by shell attributes in `auth:src/components/app-shell.tsx:231-239`:

| # | Generation | Marker / CSS | Who sees it |
|---|---|---|---|
| 1 | **Signature** (deep teal #0D3634 band, soft-white sheet) | `data-nv-e5`; `auth:src/components/signature/tokens.css`, `auth:src/app/app/employee-style.css` | Employee/Lead everywhere; sign-in (`.ap`); Clocker (`data-sig-surface`, `auth:src/components/clocker-shell.tsx:30`) |
| 2 | **Clean Manager/Owner** (light masthead, `.nv-*`/`.cm-*`) | `data-nv-clean`; `auth:src/app/app/premium-clean-manager.css` + `clean-manager/*.css` | Manager/Owner: Home, Inbox, Schedule, Employees, Timecards, Reports, Updates, Settings, Profile |
| 3 | **Premium waves** (Oct 18–19 rebuild) | `portal-premium.css`, `premium-wave-a/b/c.css`, pages self-labelled `premium-legacy-page` | Manager: Payroll export (`auth:src/app/app/payroll-export/page.tsx:23`), parts of Notifications (`auth:src/app/app/notifications/page.tsx:15` mixes `nv-page`, `premium-notifications` and `cm-` in one class list) |
| 4 | **Gusto portal** (base) | `portal-gusto.css`, 13,810-line `globals.css` | Underlayer everywhere; `/ui-preview/home` |
| 5 | **Employee corporate blue** (#0756d9 accent, #062959 navy masthead) | `data-employee-corporate`; `src/app/employee-mobile-corporate.css:7-20` | Still attached to the shell for employee `/app/my-time` and `/app/timecards` (`auth:src/components/app-shell.tsx:239`) |

That is far better than October 18, when the legacy dashboard openly competed with the new navigation. The employee journey on `claude/auth-premium` is now coherently Signature: Home, Schedule, Requests hub, My pay, My time (phase 1, `auth:src/components/employee-time-panel.tsx:113`), Timecards (`auth:src/components/timecards.tsx:454`), Profile (phase 2, `auth:src/app/app/profile/page.tsx:36`), and the Clocker. The build screenshot `docs/product/specs/employee-style/signature/dark-mode/build-1/home-light.png` matches the approved boards.

The remaining seams are specific, and they are the ones a paying customer meets in week one. They are listed in section 3.

**An Owner who schedules, in one day, sees:** Signature sign-in band → clean light masthead (Home, Inbox, Schedule, Timecards, Settings) → a `premium-legacy` Payroll-export page → a Signature deep-teal band if they open their own My pay (`auth:src/app/app/my-pay/page.tsx` renders the same Signature `MyPay` for every role, no branch) → Signature again at the shared Clocker. **Three generations plus the sign-in band, four distinct headers.** One is a deliberate frame (sign-in/Clocker); two are debt.

---

## 2. October 18 manager review: what is still open

| Finding | Status | Evidence |
|---|---|---|
| **D1** Inbox decides without details (P1) | **Fixed.** No Decline/Approve in the Inbox; every request opens its full review. Copy says so: "The dates, the length and any note are on the request. Approve or decline it there." | `src/components/manager-inbox.tsx:22-33` (main); `auth:src/components/manager-inbox.tsx:56,87` ("O1: never a decision from here"); decisions live on the detail page with full context (`auth:src/components/time-off-review-decision.tsx:11-15`) |
| **D2** Wrong availability population | **Fixed.** Home now separates `eligibleEmployees` from `activeEmployees`. | `src/app/app/page.tsx:81-84` |
| **D3** Disabled buttons look enabled | **Fixed** for `.button` (`src/app/globals.css:795`, opacity .45). **Verify** the clean `.nv-btn` disabled state got the same treatment. | commit 8c4dd505 |
| **D4** All-day shows "12:00 AM – 12:00 AM" | **Fixed.** `formatTimeRange('00:00','24:00')` → "All day", with tests. | `src/lib/date-utils.ts:78-82` |
| **MG1** Two competing navigation systems | **Mostly fixed** on the release branches. `view=requests` → `/app/inbox?filter=requests`; `view=schedule` → `/app/schedule` keeping week/day/location/person (`src/lib/retired-views.ts`). Home's remaining views (Attendance, Team overview, Activity) carry real titles in the trail (`auth:src/components/app-shell.tsx:31`). "Welcome back" is gone from `claude/auth-premium`. **Residue:** this checkout's `src/components/manager-dashboard.tsx:314` still renders "Welcome back, {name}." for the team/activity views — make sure the release merge supersedes it, not the other way round. | — |
| **MG2** Home and Inbox repeat work; filters buried | **Partial.** Home is now a short "Needs you" summary (`auth:src/components/premium-home.tsx:160-184`); Inbox filters sit in the header and live in the URL so Back restores them (`auth:src/components/manager-inbox.tsx:43-57`). The missed-punch lead panel still renders above the filtered list (`lead=<MissedPunches/>`). **Verify** at 320px that a filtered request is reachable without scrolling past three cards. | — |
| **MG3** More mixes team and personal tools | **Fixed.** Grouped: Time and pay / Planning / Team tools / Account. | `auth:src/lib/navigation.ts:115-127` |
| **MG4** Links lose chosen context | **Mostly fixed.** Missed-punch links deep-link to `#timecard-<employeeId>` or the person (`auth:src/components/manager-today.tsx:72`); Create shift accepts a date (`auth:src/app/app/schedule/new/page.tsx:40`); retired views carry context. | — |
| **MG5** Schedule is a long list before its tools | **Reworked, unverified.** The page is rebuilt as `cm-schedule` (`auth:src/app/app/schedule/page.tsx:309`, `auth:src/app/app/clean-manager/schedule.css`). Whether Build-and-publish is now reachable on a phone needs the browser, and the Codex load finding stands: 10.6 s p95 at 200 people (`docs/product/reviews/premium-direction-2026-10-18/RELEASE-2026-10-20.md`, "Open risk"). | — |

**Verdict on the Oct 18 NO-GO:** its named defects are substantially cleared in the release-candidate code. What remains open is cross-generation styling (its MG11), which is exactly section 3.

---

## 3. Findings

### P0 — do not ship as-is

**E1 · The Spanish promise breaks mid-journey.** Sign-in is bilingual with an Español switch (`auth:src/lib/auth-copy.ts:111`, `auth:src/components/auth-premium/lang-switch.tsx`); the Clocker shows Spanish second lines on every action (`auth:src/components/clocker-language.tsx:6-41`); legal footer links exist in Spanish (`auth:src/components/brand-legal.tsx:7`). Then the entire app after sign-in is English only — by design: "Only these four pages switch; the rest of the app stays English" (`auth:src/lib/auth-copy.ts:2`). A Puerto Rico employee who picks Español at the door, and whose Clocker speaks Spanish, gets an English app for everything about their pay and schedule. Spanish-first is NEVORA's named identity trait (TEAM-RULES "What we are building"). Full translation is not a this-week job (gap #6), but shipping a language switch that silently stops working after sign-in is a trust break, not a missing feature. **Minimum for launch:** the switch states plainly, in Spanish, that the app beyond sign-in is English for now — or the switch waits.

**E2 · Deletion copy points at another company.** "Email support@thevelani.com…" in both languages (`auth:src/lib/auth-copy.ts:51,152`). A pay app telling a NEVORA user to email thevelani.com reads as either a mistake or a shell company — on the account-deletion path, where trust is already at its thinnest. One-line fix. (Overlaps gap #4; the Terms/Privacy absence itself is counsel's call, but this string is ours.)

**E3 · Decide the My-pay seam before launch.** `/app/my-pay` renders the Signature employee page for every role (`auth:src/app/app/my-pay/page.tsx:26`, no role branch; `auth:src/components/payroll/my-pay.tsx:49-52` is all `SigBand`/`sg-*`). A Manager or Owner working all day in the light clean system opens their own pay and lands on a deep-teal employee-styled page inside the clean shell. On the most sensitive personal surface, "this page looks like a different app" is exactly the doubt TEAM-RULES says never to create. Either restyle the band for `data-nv-clean`, or make it a deliberate, consistent rule ("your own pay always looks like the employee pay page") and say so in the spec. Deciding is P0; the restyle itself is a day.

### P1 — fix in the launch window

**E4 · The corporate blue generation is still wired into the Signature employee app.** The shell still sets `data-employee-corporate` on employee `/app/my-time` and `/app/timecards` (`auth:src/components/app-shell.tsx:239`), loading a blue-accent theme (`--corporate-accent: #0756d9`, masthead `#062959`, `src/app/employee-mobile-corporate.css:7-20`) on phone widths — and Signature's own My-time view reuses `employee-corporate-record-details` for its Details disclosure (`auth:src/components/employee-time-panel.tsx:139`), while `timecards.tsx` keeps 15 `corporate` branches. Blue is off-constants (teal is the action colour). **Verify** in the browser whether blue leaks into the Signature pages; then remove the attribute and layer from these routes, or scope the corporate CSS off any page with a `[data-sig]` root.

**E5 · The Clocker speaks a different voice.** Every Clocker state is Title Case — 'Clock In Recorded', 'Recording Your Action…', 'Check Your Last Action', 'Verify Your PIN Again' (`auth:src/components/clocker-punch-panel.tsx:13,127-129`) — while the whole app is sentence case ("Approve selected", "Your request was submitted for manager review"). The Clocker is the surface employees watch each other use; its content is honest and careful ("No action has been sent", "We could not confirm this action" — good), but the shouting caps read like a different vendor's kiosk.

**E6 · The installed app's chrome names a third teal.** PWA theme colour comes from `DEFAULT_TOKENS.masthead = #1C4A47` (`auth:src/app/app/layout.tsx:48`, `auth:src/lib/workspace-presentation/derive.ts:19`); every Signature band is #0D3634; the offline page draws the mark in #164B48 (`public/fuel-portal-offline.html:37`). On an installed iPhone app the status bar visibly mismatches the header on every employee page, day one. (Gap #19, confirmed at these lines.)

**E7 · Focus ring invisible on the teal band** — 1.31:1 (gap #21, confirmed concern at `auth:src/app/app/employee-style.css:26-27` which already patches it for the header; sweep the rest). TEAM-RULES names the visible focus ring a constant; this is also the only open item that can block on the Accessibility scorecard line.

### P2 — real, can follow launch

**E8 · First-run is Owner-only and stops short of the one step that matters.** The Owner setup card covers location, coverage periods, weekly hour targets (`auth:src/components/owner-setup-card.tsx:47-53`) — but has no "invite your team" step, while invitations are Owner-only with 15-minute links (gap #7). An Owner can finish the card and still have an empty company. Managers get no first-run at all (empty Home shows "Needs you"-style empties, which is fine); employees get a decent one via the Home To-do list ("Review your schedule", "Read the team update" — see `home-light.png`).

**E9 · The written source of truth lags the shipped look.** `DESIGN.MD`'s last dated section is 2026-10-17; the Signature spec (`SIGNATURE-SPEC.md`, dated Oct 20, explicitly superseding DESIGN.MD for its surfaces) exists only on the side branch (`auth:docs/product/specs/employee-style/signature/SIGNATURE-SPEC.md`). Until it lands on the main branch, every agent and reviewer reading this checkout is told the product is Gusto-teal. (Gap #14; the residue in MG1 above is what this causes.)

**E10 · Employee desktop stays a generation behind.** `employee-style.css` is phone-first; ≥1024px mostly hides phone chrome (`auth:src/app/app/employee-style.css:55,78`). Employees are mostly on phones (TEAM-RULES), so this can wait — but write it down as a decision, not a surprise.

### What is genuinely good

Worth protecting: the Inbox decision model (detail before decision, keyboard included) is now a trust asset; the timecard approval confirmation ("I reviewed this exact selected set and its recorded time…", `src/components/timecards.tsx:178`) and the honest freshness/footer language ("Recorded punches only.", "Updates every 30s while active.", `auth:src/components/employee-time-panel.tsx:76`) are better than most competitors; the calendar-link privacy note says exactly what a link exposes (`auth:src/components/calendar-subscription-panel.tsx:51`); the Clocker never claims an unconfirmed punch succeeded. No overpromising language ("guaranteed", "bank-level", "100%") was found anywhere in user-facing copy.

---

## 4. Do-not-ship list (customer-visible in week one) vs. polish

**Do not ship without:** E1 (Spanish expectation set honestly), E2 (thevelani.com string), E3 (My-pay seam decided), E4 verified (no blue inside Signature), E6 (theme colour, one token), E7 (focus ring), and the **MG2/MG5 browser verification** at 320/390px. Everything on this list except MG5 is copy, one token, one attribute, or a decision.

**Can wait, scheduled:** E5 (Clocker voice — next sprint), E8 (invite step in the setup card), E9 (land the spec on main at merge), E10 (employee desktop pass), payroll-export/notifications restyle onto clean (finish generation 3's retirement), and the Oct 20 gap list's structural items on Jose's existing track.

---

## 5. Scorecard pass on the top recommendations

Per `docs/product/TEAM-RULES.md` (0–2 each, ≥12/16, no 0 on Trust/Accessibility/Usability):

| Line | R1 Spanish honesty at sign-in (E1) | R2 Retire blue + fix chrome/focus (E4+E6+E7) | R3 Decide + restyle My-pay seam (E3) | R4 Clocker sentence case (E5) |
|---|---|---|---|---|
| Usability | 1 (removes a dead-end expectation) | 1 | 1 (one less context switch) | 1 |
| Familiarity | 2 ("available in English for now" is a known pattern) | 2 | 2 | 2 |
| Trust | 2 (keeps the promise honest) | 2 (one teal, visible focus) | 2 | 2 |
| Accessibility | 2 (lang-tagged note) | 2 (focus ring is the fix) | 1 | 1 |
| Brand distinctiveness | 2 (Spanish-first is the brand) | 2 (kills the off-brand blue) | 1 | 1 |
| Durability | 2 | 2 | 2 | 2 |
| Cost | 2 (copy) | 2 (token + attribute + ring) | 1 (needs a decision first) | 2 |
| Continuity | 2 | 2 (nothing moves) | 1 (managers' pay page changes look) | 2 |
| **Total** | **15/16 go** | **15/16 go** | **11/16 revise** — goes to 13 once Jose picks a direction; the blocker is the open decision, not the work | **13/16 go** |

---

## 6. Verdict

The product is one decisive week away from coherent, not one quarter. The October 18 structural complaints — duplicate destinations, context-free approvals, "Welcome back" dashboards — are substantially fixed in the release-candidate code, and the employee journey is now one system end to end, including the Clocker. What remains are a handful of seams that a paying customer hits in week one: a Spanish switch that stops working after sign-in, a competitor's support email on the deletion path, a manager's own pay page that looks like a different app, a legacy blue theme still wired into two employee routes, and three different teals between the app, its status bar and its offline page. None of these is expensive; all of them are the kind of detail that decides whether NEVORA reads as "finished and safe" or "assembled".
