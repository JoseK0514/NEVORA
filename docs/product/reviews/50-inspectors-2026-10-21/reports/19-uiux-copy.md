# 19 UI/UX Designer — Microcopy across Owner and Manager pages

**Verdict.** The v3 rebuild made the page-level copy short and calm. Titles, empty states and most buttons now read well. Below the page level, though, the words don't line up. "Coverage" means four different things, one request state has four names, timecards use three words for "not done yet", and one link sends people to a page that doesn't have the setting it promises. Error and edge-case strings still use engineering language that a Spanish-first manager will struggle with. All of it is cheap to fix once there is a glossary.

Method: I pulled strings with grep from `src/components`, `src/app/app` and `src/lib` (manager-inbox, premium-home, timecards, manager-time-off, manager-shift-requests, manager-availability, manager-weekly-roster, schedule and settings pages, notification-inbox, employee-updates, reports/insights) and read them against the 1440 and 390 screenshots in `review50/shots/`. No browser.

## Recommendations

**1. Fix the availability-deadline directions. Today they send people to a page without the setting.**
- *What:* The Availability band says "No deadline set. **Set one in Scheduling rules**" and links to `/app/schedule/settings` (`manager-availability.tsx:55`). That page has no deadline field: `schedule/settings/page.tsx` contains no "deadline" string, and the `QAOWNER-rules-1440.png` screenshot shows none. The real form is in Schedule › More (`schedule/page.tsx:346-349`). Meanwhile the Inbox says "Set when availability is due for this week, **on the Schedule**" (`manager-inbox.tsx:95`). So two pages give opposite directions and one of them is wrong. Change the Availability link to "Set one in Schedule › More" and point it at `/app/schedule#schedule-deadline`, or move the form into Scheduling rules as the spec says (spec §Schedule: "The availability-deadline form moves to Scheduling rules"). Both pages must then use one sentence.
- *Same class:* `manager-issue-focus.tsx:24` still tells managers to "Return to the **Action Center**". That name is gone from the navigation; it should say "Inbox".
- *Impact:* High: it's a dead end plus a broken promise. *Effort:* S (link) or M (move the form). *Owner:* UI for the link. Product (Jose) decides whether the form moves.

**2. Settle the "coverage" family with one glossary and apply it everywhere.**
- *What:* The same word means different things on different pages:
  - Inbox section **"Open shifts today"** opens a detail titled **"Coverage gap at Main Office"**. Its button says **"View coverage gap"** and its status says **"Not covered"** (`manager-inbox.tsx:90,136`, `action-center-navigation.ts:4`, `lib/assistance/manager-actions.ts:121-123`).
  - On Shift requests, the **"Open coverage"** tab means shifts that *employees offered up* (`manager-shift-requests.tsx:19`), not unassigned shifts.
  - Scheduling rules has **"Recurring coverage"**, **"Trades and coverage"**, "coverage requests" and "Coverage window", plus an error that says "Coverage window could not be saved" (`wave-b-forms.tsx`).
  - The Inbox says **"Coverage rules not set"** and its action says **"Configure coverage"**, but the target page labels that setting **"Location staffing / Minimum staff"**.

  Proposed fix (see the glossary below):
  - "Open shift" means any shift slot with no one in it, everywhere. The detail title becomes "Open shift at Main Office", the button "Fill shift", the status "No one assigned".
  - "Offered shifts" replaces "Open coverage". The page's own empty state already says "Offered for someone to pick up".
  - "Staffing" is used only for the Scheduling-rules requirement: "Staffing not set" and "Set staffing".
  - "Swaps and offered shifts" replaces "Trades and coverage".
- *Impact:* High. This is the core vocabulary of the scheduling job, and a mismatch between list and detail erodes trust. *Effort:* M (about 15 strings). *Owner:* UI. Codex is needed only if the server sends the gap titles: `manager-actions.ts` builds them in `src/lib`.

**3. Use one name for each request type and one set of status words.**
- *What:*
  - **Waiting state.** Tabs say **"Pending"** (`manager-time-off.tsx`, `manager-shift-requests.tsx:19`), chips on the same page say **"Waiting"**, corrections say **"Awaiting review"**, and timecards say **"Needs review"**. Use the tab and chip **"Waiting"** throughout, since it's the shorter and plainer word.
  - **Declined state.** Corrections say **"Rejected"** (`timecards.tsx:49`) while every other decision says **"Declined"**. Use "Declined".
  - **"Unable to work".** The same report appears as "Can't-work report" (`premium-home.tsx:184`), "Review callout" (`action-center-navigation.ts:4`), "shifts people can't work" (`manager-inbox.tsx:544`) and "Can't work this shift". Keep the one the employee sees: **"Unable to work"**.
  - **Swaps and pick-ups.** Home says "Shift change request" (`premium-home.tsx:184`). Use "Shift request", which is the page name.
- *Impact:* High. The spec's contract §6 asks for "one status vocabulary everywhere". *Effort:* S. *Owner:* UI.

**4. Make the approve-then-finalize steps on Timecards readable.**
- *What:*
  - **"Not done" wording.** The state has three names: **"Need review"** (desktop metric and tab, `timecards.tsx:312,334`), **"Needs review"** (phone heading, `AUDIT-M-timecards-390.png`) and **"Needs attention"** (`timecards.tsx:426`). Insights calls the same thing **"Timecards to finish"** (`lib/reports/insights.ts`) and the Inbox calls it **"Timecards to review"**. Use **"Needs review"** before approval, **"Ready to finalize"** after it (already used), and "Finalized" at the end. Insights should say "Timecards to finalize".
  - **Wrong object on the button.** The per-person action is labelled **"Finalize period"** (`timecards.tsx:402,470,505`) but finalizes one timecard. Change it to "Finalize timecard".
  - **Wrong Inbox line.** The Inbox line "Open the timecard to check it before it's approved" (`manager-inbox.tsx:97`) is false for cards that are already approved: by the comment at `timecards.tsx:64-66`, the Inbox count includes approved, not-finalized cards. Change it to "Open the timecard to approve or finalize it."
  - **"Draft" on 0h rows.** "Draft" is a system word on rows with no time (`timecards.tsx:54`, `QAOWNER-timecards-1440.png`). Change it to "No time yet".
- *Payroll and legal:* Leave the confirmation paragraph and the payroll-side "finalized" wording (`payroll-export.tsx`, `payroll/api.ts:60`) as approved. Ask Jose to confirm that "Finalize" is the approved verb before the labels change.
- *Impact:* High: this is where pay mistakes start. *Effort:* S. *Owner:* UI, with a Product confirmation.

**5. Replace engineering language in errors and edge states.**
- *What:* These are visible strings:
  - "Timecards expired. Refresh a current protected snapshot." (`timecards.tsx:122`)
  - "Retry the same action to reconcile it." (`timecards.tsx:58`)
  - "Approve the current source revision before finalizing." (`timecards.tsx:56`)
  - "Check a current protected snapshot…" (`manager-time-corrections.tsx:78`)
  - "Some notifications are unavailable or outside this bounded view."
  - "Marked read. Announcement acknowledgement and request actions are unchanged." (`notification-inbox.tsx:40`)
  - "Blank is unknown; completion advance must not exceed submission advance." (`wave-b-forms.tsx:45`)
  - "Daylight saving times that are skipped or occur twice cannot be used." (`schedule/page.tsx:65`). Puerto Rico has no daylight saving time.
  - "Publication outcome is unconfirmed for this review."

  Rewrite each one as what happened plus one next step. For example: "This list is out of date. Refresh to see the latest." Or: "We couldn't confirm it saved. Try again; it won't be done twice."
- *Impact:* Medium-High. These strings show up at the moments of stress. *Effort:* M (about 20 strings). *Owner:* UI.

**6. Updates: collapse nine status words into three, and give the feature one name.**
- *What:* `employee-updates.tsx:48-126` uses Acknowledged, Acknowledgement required, Review needed, Reviewed, To review, Read, Not read, Required and Optional. Use **"Must read"** (in Spanish, "Lectura obligatoria"), **"Read"** and **"Not read yet"**. "Acknowledgement" is the hardest word on the Owner and Manager surface for a Spanish-first reader.
- The feature itself is called Updates, Team updates (Schedule › More), Company updates (Settings), Workplace updates and Workplace news. Its action is both "Create update" (top bar) and "Send an update" (Schedule menu). Use **"Updates"** for the name and **"New update"** for the action.
- *Impact:* Medium. *Effort:* S. *Owner:* UI.

**7. Cut helper lines that repeat a number or say nothing.** The spec's contract §4 says "A helper line stays only if it prevents a mistake."
- *What:*
  - **Timecards** repeats 13 three times on the phone: the heading, "0 of 13 approved", and the "13 timecards in this period." status line (`timecards.tsx:137`; `AUDIT-M-timecards-390.png`). Keep the status line for screen readers only.
  - **Time off detail:** "Wants Oct 30 – Oct 31 off." repeats the Dates row (`manager-time-off.tsx:58`; `QAOWNER-review-1440.png`).
  - **Inbox:** "Some attendance comparisons are unavailable. Check the attendance view for details." (`manager-inbox.tsx:450`) is vague and shows on a calm day (`QAOWNER-inbox-1440.png`). Show it only when a no-clock-in row is actually missing, and name the person or site.
  - **Scheduling rules:** the sticky save bar text repeats the rail note ("Staffing and hours save together…").
  - **Notifications** has three problems:
    - The search placeholder says "Search this *inbox*" (`notification-inbox.tsx:76,133`), which confuses it with the real Inbox. Change it to "Search notifications".
    - A **"Needs action"** filter sits right under "Decisions are in your Inbox". Drop the filter or rename it "Unread".
    - The empty state carries two link sets (`QAOWNER-notifications-1440.png`).
- *Impact:* Medium. *Effort:* S. *Owner:* UI.

**8. Make the copy readable for Spanish-first readers: rules, then a pass.**
- *What:* Add four rules to the ux-writing notes:
  - At most about 15 words per helper line.
  - One idea per sentence.
  - Verbs instead of nouns. For example, "Deactivation signs this employee out immediately. Reactivation requires a fresh sign-in. History is preserved." (`employee-core-profile-form.tsx:62`) becomes "Making someone inactive signs them out now. Their history stays."
  - No idioms or phrasal verbs.

  Idioms to replace: "You're all caught up" ("Nothing is waiting"), "offer up", "show up here" ("appear here"), "Check in with them", "Plan ahead" (keep as a tab name, but avoid it in sentences), and "over limit". The Schedule says "over limit" while Scheduling rules labels the field "**Maximum**", so say "over max" (`manager-weekly-roster.tsx`). Also fix "No one submits availability yet." (`manager-availability.tsx:55`): it should be "No one has sent availability yet."
- *Impact:* Medium-High for the PR market. *Effort:* M. *Owner:* UI.

**9. Start the Owner/Manager Spanish dictionary from the glossary now.**
- *What:* `TEAM-RULES.md:10` says "full Spanish" sets NEVORA apart. Today the Owner and Manager app is English-only (`app/layout.tsx:25` `lang="en"`), and every string is inline across dozens of files. Only the Clocker (`clocker-language.tsx`) and the four word slots (`lib/workspace-presentation/words.ts`, whose own comment says sentences come "when strings move into dictionaries (B5)") have Spanish.
- There is also an English problem with the word slots. Hard-coded "employee" ignores them: "Need 1 employee" (`manager-actions.ts:121`), "Add employee", and "13 employees" on Team even though that list includes Owners and Managers. A Retail workspace would therefore see "Associates" in the navigation and "employees" in sentences. Lock the glossary below, then move the Owner and Manager strings into one dictionary keyed by the glossary terms.
- *Impact:* High strategically. *Effort:* L. *Owner:* Product (scope and timing), then UI.

**10. Batch of small consistency fixes.**
- *What:*
  - Settings uses "&" in group names (Company & locations, Features & words, Access & recovery), but the sidebar uses "and" ("Time and pay"). Use "and".
  - "Find Cover" is Title Case in a sentence-case UI (`manager-weekly-roster.tsx`). Change it to "Find cover".
  - Hour targets have several names: "weekly hour goals" (`settings/page.tsx:43`), "hour targets" (Inbox, Owner setup), "Weekly hours" (Scheduling rules) and "Hours outside targets". Use "Weekly hour targets".
  - Availability has two names: "Availability not sent" (Inbox) and "Not submitted" (Availability page). The Schedule band shows "availability 0 of 8" in lowercase, while the spec says "Availability received 0 of 8". Use "Not sent" / "Sent".
  - "Schedule not confirmed" (`manager-inbox.tsx:213`) is vague. Change it to "Haven't confirmed their schedule".
  - "Time corrections" vs "Corrections". Use "Time corrections".
- *Impact:* Low-Medium. *Effort:* S. *Owner:* UI.

### Proposed glossary (English / Puerto Rico Spanish)

| Use | Means | Instead of | ES |
|---|---|---|---|
| Open shift | A needed shift with no one assigned | coverage gap, not covered, uncovered | Turno abierto |
| Offered shift | A shift an employee gave up for pick-up | open coverage, coverage request | Turno ofrecido |
| Staffing | Minimum people per location and time (rules) | coverage rules, coverage window | Personal mínimo |
| Shift request | Swap, pick-up or offered shift | shift change request, trade | Solicitud de turno |
| Unable to work | Employee can't work a scheduled shift | callout, can't-work report | No puede trabajar |
| Time off | Noun; "time-off request" as a modifier | PTO, leave | Tiempo libre |
| Waiting / Approved / Declined | Request states | Pending, Awaiting review, Rejected | En espera / Aprobada / Rechazada |
| Needs review → Ready to finalize → Finalized | Timecard states | Need review, needs attention, to finish, Draft | Por revisar / Lista para cerrar / Cerrada* |
| Weekly hour target / Max | Hours rules | goal, limit | Meta semanal / Máximo |
| Must read / Read / Not read yet | Update states | Acknowledgement required, Review needed | Lectura obligatoria / Leída / Sin leer |

\*Payroll-adjacent: confirm the approved Spanish for "Finalize" with Jose before use.

### Flag only (payroll and legal: do not change without Jose)
- **Payroll settings** (`QAOWNER-payroll-1440.png`) has the densest copy in the app. Examples: "Notices contain generic private references. Eligibility, consent and current access are checked separately; queued does not mean delivered." and "Provider selection records a preference. It does not connect an account…". For a Spanish-first Owner it may be the least readable page. Worth a dedicated legal-approved plain-language review.
- The sidebar **"Payroll"** item opens a page titled **"Payroll settings"** whose tabs include **"Timecards"**, a second home for Timecards. This is navigation copy rather than legal copy, but it sits in payroll, so I'm flagging it only.
- Payroll export uses "canonical time record", "mapped CSV" and "Source fingerprint" (`payroll-export.tsx`, `payroll-export-mapping.tsx`). Flag only.

## What's good
- Page subtitles and Home and Inbox section names are short and concrete. "4 things need you today." and "Planning items don't count toward the 4 that need you today." honour the count dictionary.
- Empty states mostly say what will appear and where. For example: "New time-off requests show up here and in your Inbox."
- Sentence case and verb-first buttons (Approve, Decline, Add shift, Save details) are consistent almost everywhere. Non-breaking spaces keep times and counts from wrapping badly.

## Not checked / limits
- No browser use was allowed, so I did not see sheets, menus, toasts, confirm steps, the phone More sheet or error states rendered. Those strings were read from source only.
- I didn't trace every conditional string, and some cited strings may be rare-path.
- Employee and Lead pages were out of scope except where they share components.
- Spanish suggestions are first drafts. They need a native Puerto Rico reviewer and the approved payroll terms.
- I did not verify whether `lib/assistance/manager-actions.ts` titles come from the server contract (relevant to recommendation 2's owner).
