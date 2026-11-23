# Batch 1 gate findings: Payroll, Rondo, Profile (Nov 23, 2026)

Captured on one production build of `bcef21b8` (fictional data) at 390, 768 and 1440 for every role each page opens
for. Entries with notes, blocking and end-sweep lists: `batch1-rows.json` in this folder. These are blocking: fix them
with the accessibility items. Approved payroll, tax and legal wording stays word for word; removing a repeat or adding
a missing status is fine.

## Payroll (G)
1. G3 Review pay: the first run is the Nov 2–8 payroll a correction replaced. The page never says it was replaced and
   still offers "Fix this payroll" and "Prepare payment instructions" for it. `RunReview` in
   `src/components/payroll/payroll-runs.tsx` (about 440–500); `standsApproved()` already exists for this check.
2. G4 People: "Net pay" repeats under all 11 names; the period line doesn't say the payroll was replaced
   (`payroll-runs.tsx` about 624).
3. G1, G7: a replaced row says "Replaced" twice (chip and detail line); on phones the chip drops to its own line and the
   row runs to 5 lines (`RunRow`, `payroll-runs.tsx` about 211).
4. G1, G8 (Owner): at 768 and 1440 the selected tab repeats the band title (`src/components/payroll/payroll-tabs.tsx`).
5. G8 Time exports: "Nov 23–29" in the Week field and again in the notice; for the Manager "Timecards" in the back link
   and in "Go to Timecards" (`src/components/payroll-export.tsx`).
6. G9 Paid time export: "Time exports" three times on a one-card page (`payroll-export.tsx`,
   `src/components/payroll-import/copy.ts`).
7. G10 My pay (location Manager): "No statements yet. Only you can see them." The Manager gets a separate look-alike of
   the Employee Pay screen: render the Employee's Pay component with the Manager's data (brief rule 1)
   (`src/components/payroll/my-pay.tsx`).
8. G10 Pay (Employee, Lead): the first row of "Earlier" is titled "Earlier version" with no payday date
   (`src/components/employee-b/pay-b.tsx` line 58).

## Rondo and Insights (H)
9. H1 Rondo AI (Owner): item title, date and time, source line and actions repeat ("Observed 8:14 AM" four times);
   action rows mix one outlined button with three text buttons and "Not relevant today" wraps alone at 768; "Where are we
   short this week?" sits flush on the paragraph above; on phones two stacked buttons have unequal widths
   (`src/components/owner-advisor/attention.tsx`, `advisor.css`, `workflows.tsx`).
10. H1 Rondo AI (Manager): "shifts published" on all 7 day rows (`owner-advisor/manager/manager-rondo.tsx`).
11. H2 Weekly plan: the band subtitle repeats the "Compare options" button (`owner-advisor/weekly/weekly-page.tsx`).
12. H3 Business records: two buttons for one job, worded "Add", "Add record", "Add a record"
    (`owner-advisor/business/business-page.tsx`).
13. H4 Company knowledge: "Add document" twice; "0 of 20" duplicates "No documents yet"
    (`owner-advisor/knowledge/knowledge-page.tsx`).
14. H6 Christmas bonus: at 768 and 1440 the bonus year is in the menu and the subtitle
    (`src/components/christmas-bonus-report.tsx`, `christmas-bonus-year-menu.tsx`).

## Profile (I)
15. I2 Privacy Policy: at 768 and 1440 "In this policy" lists all 13 section titles the accordions repeat (at 768 before
    any content); the intro is said twice; on phones "In this policy" comes after "Who we are"
    (`src/components/employee-b/account-b.tsx`). Policy text itself stays word for word.
16. I3 Calendar: "Your calendar link" title repeated by "Create calendar link" (`employee-mobile/calendar.tsx`).
17. I4 Device alerts: "Check again before starting a new request" in the card and the warning below
    (`employee-mobile/device-alerts.tsx`).
18. I5 Passkeys: "Saved passkeys" card sits inside a second card, 13–14px inside the column (3px on phones); its empty
    text is 2px off the heading; "Saved passkeys" repeated by "No saved passkeys"
    (`src/app/app/profile/passkeys/page.tsx` `b-keep` wrapper, `employee-mobile/passkeys.tsx`).
