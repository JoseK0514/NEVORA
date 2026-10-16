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
- **One word per concept**: tasks (not actions), shift requests, time off, timecards, Clocker.
- **No terminal periods** on headings, labels and buttons. Full sentences in body copy get periods.

## Dates, times and numbers
- Dates: "Tue, Oct 14" (`formatDisplayDate`). Ranges: "Sep 28 – Oct 4, 2026" (`formatDateRange`).
  Never show raw ISO dates (2026-10-14) to people.
- Times: "8:00 AM" in sentences; "8 am – 4 pm" on compact schedule chips. Freshness lines say
  "Updated 4:49 PM" with no seconds. Exact audit records may keep seconds.
- Counts use the noun in agreement: "1 task", "3 tasks". Fractions read "6 of 10", optionally with
  a bar.
- Hours: "56h" in dense tables, "56 hours" in sentences. Money is right-aligned with two decimals.
- Figures use tabular numerals so columns line up.

## Empty states (`EmptyState`)
- **Title**: what's true now, in a few words ("No pending requests", "You're all caught up").
- **Description**: one sentence of context, or what will appear here and when.
- **Action**: at most one next step, only when the person can actually take it.
- Use the "all caught up" tone only for a verified empty result, never for loading or errors.

## Errors and status
- Lead with the state, then the next step: "Tasks unavailable. Refresh to try again."
- Loading: "Loading tasks…". Offline: "Tasks unavailable offline".
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
