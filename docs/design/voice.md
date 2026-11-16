# NEVORA writing guide

How the portal speaks. Calm, specific and kind, like a capable coworker. Use this guide for every
new label, message and empty state.

## Voice
- **Plain over clever.** "Schedule published", not "You're all set to rock this week!"
- **Specific over generic.** "10 employees haven't submitted availability", not "Items need attention".
- **Calm about problems.** Say what happened and what to do next. No blame, no alarm words, no
  exclamation marks.
- **Truthful.** Never imply a check, a publication or a count we didn't confirm. When a source
  wasn't checked, say so ("No tasks found in the checked sources").

## Mechanics
- **Sentence case everywhere**: buttons, headings, tabs, menu items ("Add employee", "View profile").
  Keep proper nouns and acronyms: NEVORA, Clocker, PIN, ID, Apple Calendar, Google Calendar.
- **Buttons start with a verb** and name the result: "Publish schedule", "Approve time off", "Save PIN".
  Avoid "Submit", "OK" and "Click here".
- **Links that stay in the app** end with "›". Use the external arrow only when a link leaves NEVORA.
- **One word per concept**: things to do (tab: To do; not tasks, actions or Needs you as a heading), shift requests,
  time off and a time-off request (not leave), can't work and a can't-work request, Withdraw request (Cancel only closes
  a dialog), Clocked in, correction request (verb: Fix a punch), timecards, pay statement, Clocker. The full list, with
  Puerto Rico Spanish, is the glossary at the end of `docs/product/review-2026-11-10/reviews/copy-audit.md` (B7, Nov 10, 2026).
- **No terminal periods** on headings, labels and buttons. Full sentences in body copy get periods.

## Dates, times and numbers
- Dates: "Tue, Oct 14" (`formatDisplayDate`). Ranges: "Sep 28 – Oct 4, 2026" (`formatDateRange`).
  Never show raw ISO dates (2026-10-14) to people.
- Times: "8:00 AM" in sentences; "8 am – 4 pm" on compact schedule chips. Freshness lines say
  "Updated 4:49 PM" with no seconds. Exact audit records may keep seconds.
- Counts use the noun in agreement: "1 thing needs you", "3 things need you". Fractions read "6 of 10", optionally with
  a bar.
- Hours (B7, NV-068), through `src/lib/duration-format.ts`: "1 h 30 min" in sentences and cards, "8 h 06" for a row's
  figure, whole hours ("511 h") for a period total. Dense tables and the week grid may stay compact. Money is
  right-aligned with two decimals.
- Figures use tabular numerals so columns line up.

## Empty states (`EmptyState`)
- **Title**: what's true now, in a few words ("No pending requests", "You're all caught up").
- **Description**: one sentence of context, or what will appear here and when.
- **Action**: at most one next step, only when the person can actually take it.
- Use the "all caught up" tone only for a verified empty result, never for loading or errors.

## Errors and status
- Lead with the state, then the next step: "Things to do didn't load. Refresh to try again."
- Loading: "Loading your time off…". Offline: "Time off unavailable offline".
- Success: say what happened, past tense: "Schedule published", "PIN saved".

## Examples
| Instead of | Write |
|---|---|
| Add Employee | Add employee |
| Needs your attention | To do |
| Review · 10 actions | 10 employees haven't submitted availability |
| Checked 4:49:10 PM | Updated 4:49 PM |
| 2026-09-28 – 2026-10-04 | Sep 28 – Oct 4, 2026 |
| No assignment (×70) | (blank cell, with a hover "+ Add") |

## Plain language over audit language (U5, 2026-10-16)
People see what happened and what to do next. Audit terms (source, observation, verified,
authorized snapshot, revision, captured, reference) stay in code, in exports and in "Details"
disclosures, and appear in the main text only where they are the subject. For example, a payroll
approval belongs to one exact revision, so the revision is shown there.

| Instead of | Write |
|---|---|
| Recorded time includes breaks. Not payroll hours. | Hours include breaks and aren't payroll hours. |
| Verified recorded-time signals that may need manager review. | Clock-ins and breaks that may need a look. |
| No verified attendance signals were found in the current authorized snapshot. | No clock-ins need a look right now. |
| Period checked. 10 timecards. | 10 timecards in this period. |
| Oct 10 – Oct 16 · Revision 0 | Oct 10 – Oct 16 (revisions are in the card's history) |
| Requests preserve the original recorded time and require manager review. | Your manager reviews each request. Your original times are kept. |
| This inbox shows supported source updates. | Updates about your requests and schedule. |
| Exact durations and finalized-source references. No provider compatibility claim. | Exact hours, each linked to its finalized timecard. Check the format with your payroll provider. |
| History checked through Oct 16, starting Sep 21. | Checked Sep 21 – Oct 16. |
| Attendance observations / Hours by captured position | Clock-in notes / Hours by position |
| 2026-10-12 · 00:00–07:00 · Need 1 employee | Mon, Oct 12 · 12:00 AM–7:00 AM · Need 1 employee |
| 00:00–24:00 | all day ("midnight" for an end of 24:00) |
| Monday at 00:00 | Monday at 12:00 AM |
| Time Off Request | Time-off request |
| Attendance intelligence · 0 signals | Today's clock-ins · 0 to review |
| Checked 7:43:15 AM | Updated 7:43 AM |
