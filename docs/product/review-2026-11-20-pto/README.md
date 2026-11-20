# Time off for Owners: browser evidence (Nov 20, 2026)

Policies, each person's balance and adjustments, and cancelling an approval, on Codex's PTO contract. Hand-back:
[`docs/handoffs/2026-11-20-claude-pto-owner-screens.md`](../../handoffs/2026-11-20-claude-pto-owner-screens.md).

## How it was checked

Local Next development server, owned loopback PostgreSQL, the fictional workspace (Owner Jose Natal, Manager Elena Ruiz,
employee Sofía Méndez). Playwright Chromium at 1440x900, 390x844 and 320x640; Spanish is the device's language
(`nv-lang=es`). Run `pto2` on source identical to `c9d042b9`. A lost reply is made by letting the request reach the app and
then failing it in the browser.

## Results

| Check | Result |
| --- | --- |
| Settings row | "Time off policies" under Scheduling, with the airplane glyph. |
| Empty policies | "No time off policies yet" with Add Vacation (filled) and Add Sick. |
| Validation | 25 hours a day: the field marked, focus on "1 thing to fix above". |
| Save Vacation | 8 h a day, 2.77 h per 100 h (saved as 166 minutes), 120 h carryover: revision 1 in the database. |
| Lost reply on Sick | "Your change isn't confirmed yet", focus on it; Check again sent the same command and confirmed it (revision 1). |
| Keyboard | Kind (Vacation, Sick, Other), Name, Hours in a full day, earning rate, carryover, the on/off switch, Cancel, Save. A new step moves focus to its title. |
| Balance | Opening 40 h, add 8 h, take away 4 h: three Vacation ledger entries with their reasons; the balance reads 44 h. |
| Below zero | Taking away 100 h is stopped before sending with "This would take the balance below zero". |
| Lost reply on an adjustment | Check again confirmed it. |
| Conflict | The Vacation policy changed in another tab while a review was open: "This changed" with Load the latest. |
| Manager | No Time off balance row; the page goes to Restricted; Settings is closed; `PTO_POST` answers 403. |
| Cancel approval | Approve a waiting request, then Cancel approval › Cancel time off: the request is `CANCELLED`, the list says "Time off cancelled. Any paid time it used is back in the balance." Focus moves to the confirmation's title. |
| Spanish | Policies and the balance render in Spanish; stored policy names show as typed. |
| Overflow | None at 390 and 320 on the new screens. |
| axe-core | 0 findings in the new parts in 5 runs. The time off page's existing segment links report `color-contrast` and the navigation's existing `label-content-name-mismatch`; neither is part of this change. |

Code checks: TypeScript 0 errors in `src`; oxlint clean in `src`; full suite 15,878 passed, 1 failed (the guide check
before the rebuild, which passes after `d74a9578`); 11 new unit tests.

## Not covered

WebKit and physical phones, a screen reader pass, hosted Development, a paid request deducting and restoring a balance
in the browser (the fixture's waiting requests are unpaid; the server's restore is covered by Codex's tests), and Puerto
Rico accrual, which these screens don't post.

## Pictures

| Pictures | Shows |
| --- | --- |
| `pto-settings-row-1440`, `pto-policies-empty-1440`, `pto-policy-problems-1440`, `pto-policy-unknown-1440`, `pto-policies-1440`, `pto-policies-390`, `pto-policy-edit-390`, `pto-policy-edit-320`, `pto-policies-es-1440` | Time off policies |
| `pto-balance-empty-1440`, `pto-review-opening-1440`, `pto-review-add-1440`, `pto-adjust-below-1440`, `pto-adjust-unknown-1440`, `pto-adjust-conflict-1440`, `pto-balance-1440`, `pto-balance-390`, `pto-adjust-390`, `pto-balance-es-1440`, `pto-balance-es-390` | A person's balance and adjustments |
| `pto-manager-settings-closed-1440` | A Manager closed out |
| `pto-approved-list-1440`, `pto-cancel-confirm-1440`, `pto-cancelled-1440`, `pto-approved-390` | Cancelling an approval |
