# WP1 report: Owner payroll scope wording and hand-offs

All eleven fixes are in the patch. ESLint and the targeted tests pass; `tsc` and a browser run were not done, as COMMON.md directs, so types were checked only by reading the diff.

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp1.patch`

`git diff HEAD --stat`: 17 files changed, 458 insertions(+), 244 deletions(-).
- Edited: `payroll-runs.tsx`, `workflow-status.ts`, `payroll-settings.tsx`, `native-review.tsx`, `use-payroll.ts`, `payroll-corp.css` (all under `src/components/payroll/`), plus `src/components/payroll-export.tsx` and `src/components/payroll-period-close.tsx`.
- Deleted: `payroll-stepper.tsx` and `payroll-stepper.test.tsx`.
- Tests updated: seven existing test files, matching edits only, plus new cases in `payroll-premium.test.tsx` and `workflow-status.test.ts`.

One thing to know about the worktree: I ran `git rm --cached` on the two stepper files before deleting them, so the index shows them as staged deletions. No commit was made and the patch is unaffected.

## Findings

| ID | Status | What changed |
|---|---|---|
| PY-14 | done | Scope line under the Payroll title on the phone hero and the desktop band. "Its payday was" became "Scheduled payday was"; the chip became "Scheduled payday passed". |
| PY-3 | done | "What's next" card on approved Payroll details and on Payroll home (phone and desktop). Not shown on a correction or on a payroll a correction replaced, because "Pay each person their net pay" would be wrong there. |
| PY-4, PY-9 | done | Notes above the Approve button. Mode comes from `run.sourceAuthority`; before a draft exists, from `capabilities.internalCalculatorAvailable`. Import runs show only "Approving doesn't pay anyone or send taxes." because "NEVORA calculated these amounts" would be false for them. |
| PY-10 | done | `workflow-status.ts` now holds one table of 104 codes, each with a sentence and the place its next step happens. Code-shaped unknowns get a generic sentence. Fix cards gained "Contact support" (`/app/help`) and "Open Payroll settings" buttons. |
| PY-11 | done | Settle line added to the Correction card and both correction forms. |
| PY-17 | done | "Prepare payment instructions" is hidden on corrections; one line says why. |
| PY-18 | done | Bank list and "Remitted by" relabelled, with help text. |
| PY-19, PY-15 | done | "Collected" wording replaced in `native-review.tsx`. Stepper and its test deleted (grep across `src` found no other importer). "publish" became "share" and "Pay history" became "Payroll history" in scope. |
| OW-005 | done | Phone: while an overdue period leads, its "Prepare" is the only button and this period's step is a quiet teal link. Desktop: the same three steps now sit under the Up next row. |
| AR-4 | done | The blocker links to `/app/payroll-export?start=…&end=…#who-is-included`. The section opens, scrolls into view and focuses its summary; on a phone the inner list shows at once. Labels in `payroll-period-close.tsx` reworded; commands and payloads untouched. |
| BR-2 (Time exports) | done | The waiting line always names finalizing. |

## Strings changed or added

Payroll surfaces are English only, so there are no Spanish twins.

### `src/components/payroll/payroll-runs.tsx`
| Line | Old | New |
|---|---|---|
| 42; used 297 (phone), 338 (desktop) | (none) | "Calculate pay and share statements. You pay your team outside NEVORA." |
| 176 | "Its payday was {date}." / "Oldest is {range}. Its payday was {date}." | "Scheduled payday was {date}." / "Oldest is {range}. Scheduled payday was {date}." |
| 304 (phone) | "Its payday was {date}" / "Oldest is {range}, payday {date}" | "Scheduled payday was {date}" / "Oldest is {range}, scheduled payday {date}" |
| 269 | chip "Payday passed" | "Scheduled payday passed" |
| 283 | "Approve payroll / Then share pay statements" | Native: "Approve payroll / Statements are shared with your team automatically". Import: unchanged. |
| 44–45; cards at 318, 353, 395 | (none) | Card "What's next": "Pay each person their net pay." / "Send withheld taxes and employer contributions." / "Keep the company summary for your accountant." / "NEVORA doesn't pay anyone or send taxes." |
| 431–432 | (none) | "NEVORA calculated these amounts from your setup. Check withholding with your accountant." (native only) and "Approving doesn't pay anyone or send taxes." plus, native only, " Pay statements are shared with each employee once they're ready." |
| 47; used 393, 403, 499 | (none) | "If pay changes, settle the difference with the employee outside NEVORA." |
| 421 | row "Prepare payment instructions" on corrections | "NEVORA doesn't make payment instructions for a correction. If pay changes, settle the difference with the employee outside NEVORA." |
| 128, 319, 354 | "Pay history" | "Payroll history" |
| 37 | "Statement publication" (also "Retry statement publication") | "Pay statement sharing" |
| 452 | "Statements not shared yet" / "Approved statements are shared with employees automatically…" | "Pay statements not shared yet" / "Approved pay statements are shared with employees automatically…" |
| 526 | "{n} timecards not approved" | "{n} timecards not finalized" (the code is TIME_NOT_FINALIZED; not asked for, changed for truth) |
| 527 | "{n} people need a population review" | "Choose what to do with {n} people this period" |
| 533 | button "Review payroll population" | "Choose who's included" |
| 535, 536 | (none) | buttons "Open Payroll settings", "Contact support" |

### `src/components/payroll/workflow-status.ts`
| Line | Codes | Old | New |
|---|---|---|---|
| 39 | ROUNDING_POLICY_ACCEPTANCE_REQUIRED, RULE_ACCEPTANCE_REQUIRED, EXACT_CENT_REQUIRED, WAGE_ROUNDING_REQUIRED, PR_ROUNDING_REQUIRED | five "Ask the Owner to confirm…" sentences | "NEVORA can't calculate this payroll until its payroll rules are confirmed. Contact support." Also used for PR_ROUNDING_RULE_UNVERIFIED, WAGE_CENT_RULE_UNVERIFIED, WAGE_DOLLAR_CENT_RULE_UNVERIFIED, OWNER_CALCULATION_POLICY_REQUIRED, EXACTNESS_EVIDENCE_LIMIT, POLICY_EVIDENCE_LIMIT, INVALID_NATIVE_RULE_INPUT (raw before). |
| 113 | RULESET_NOT_APPLICABLE | raw code | "NEVORA can't calculate paydays in that year yet. Contact support." |
| 112 | NATIVE_RULE_MAPPING_REQUIRED | "Ask the Owner to review unsupported payroll rule mappings." | "This company has saved deduction or contribution rules that NEVORA can't use in its own calculation. Contact support." |
| 74 | POPULATION_REVIEW_REQUIRED | "Review the employee population for this period before recalculating." | "Choose who's in this payroll for the period, then recalculate." |
| 75 | POPULATION_SOURCE_CONFLICT | "Review the current employee population for this period." | "People or timecards changed after you chose who's in this payroll. Review the list again, then recalculate." |
| 76 | CORRECTION_POPULATION_CONFLICT | "The correction must retain the original employee population. Review the original payroll before continuing." | "A correction must include the same people as the original payroll. Review the original payroll before continuing." |
| 139 | POPULATION_DISPOSITION:{ref} | "Review the period population disposition for employee reference {ref} before approval." | "Choose what to do with employee reference {ref} for this period before approval." (never rendered; the fix card overrides it) |
| 53 | unknown code | raw code | "Something stops this payroll that NEVORA can't explain here. Recalculate the draft. If it stays, contact support." |

New sentences for codes that used to show raw (lines 40–51 and the table at 57–125):
- "NEVORA can't use the saved wage details. Review the wage in payroll setup."
- "Two saved wages cover the same dates and location. Keep one in payroll setup."
- "Minimum wage coverage isn't confirmed for this wage. Confirm it in payroll setup."
- "The hourly rate is below the minimum wage NEVORA checks. Review the rate in payroll setup." (BELOW_APPLICABLE_MINIMUM_WAGE)
- "NEVORA can't calculate this mix of withholding choices yet. Review the withholding details in payroll setup, or contact support."
- "Employer contribution details are missing or not supported. Review them in payroll setup."
- "NEVORA can't apply one of the saved deductions. Review deductions in payroll setup."
- "Deductions are more than the pay for this period. Review deductions in payroll setup."
- "NEVORA can't use the saved workweek. Review the workweek in payroll setup."
- "The opening year-to-date balances don't add up for this employee. Review the opening balances in payroll setup."
- "Some saved payroll details can't be read. Review them in payroll setup. If it stays, contact support."
- "No payroll settings are saved for this payday. Save your pay schedule in Payroll settings."
- "A time correction is still waiting for review. Review it in Timecards, then recalculate."
- "Two recorded times overlap. Fix the overlap in Timecards, then recalculate."
- "NEVORA needs finalized timecards for the days just before and after this period to work out overtime. Finalize them, then recalculate."
- "NEVORA couldn't confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support."
- "NEVORA can't calculate one of the recorded breaks. Check the break on the timecard and the break rules in payroll setup."
- "NEVORA can't calculate payroll for this company's time zone yet. Contact support."
- "Someone worked more than seven days in a row, which NEVORA can't calculate yet. Contact support."
- "This payroll is larger than NEVORA can calculate at once. Contact support."
- "NEVORA couldn't read the time and payroll details for this payroll. Recalculate the draft. If it happens again, contact support."
- "The dates of this pay period don't match the saved time. Recalculate the draft. If it stays, contact support."
- "NEVORA can't calculate a pay period with these dates. Contact support."
- "This year's payroll totals don't line up for this employee. Contact support."

Newly mapped time codes reuse existing sentences (OPEN_RECORDED_BREAK, RECORDED_SOURCE_STALE_SOURCE, RECORDED_SOURCE_NOT_FINALIZED and similar).

### `src/components/payroll/payroll-settings.tsx`
| Line | Old | New |
|---|---|---|
| 176 | "Publish pay statements after payroll is approved" | "Share pay statements after payroll is approved" |
| 176 | "…then publishes it to the employee." | "…then shares it with the employee." |
| 176 | "…statement-availability notices after publication." | "…statement-availability notices after pay statements are shared." |
| 187 | "Bank and file type" (label and aria-label) | "Bank you plan to use (for your records)" |
| 208 | "Remitted by" | "Who sends it", with help "For your records. NEVORA doesn't send payments." |

### `src/components/payroll/use-payroll.ts` and `native-review.tsx`
| File:line | Old | New |
|---|---|---|
| `use-payroll.ts:75` | toast "Pay statements published" | "Pay statements shared" |
| `native-review.tsx:34` | "Federal employee tax collection" | "Calculated Social Security and Medicare withholding" |
| `native-review.tsx:34` | "Saved nearest-cent employee collection for…" | "Saved nearest-cent withholding calculated for…" |
| `native-review.tsx:34` | "Collected minus exact" | "Rounded minus exact" |
| `native-review.tsx:34` | "Collection rule" | "Calculation rule" |

### `src/components/payroll-export.tsx:179` (BR-2)
| Case | Old | New |
|---|---|---|
| Unapproved only | "Approve 10 timecards first" | "Approve, then finalize 10 timecards first" |
| Mixed | "Approve 7 timecards and finalize 3 first" | "Approve 7 timecards, then finalize 10 first" |
| Approved only | "Finalize 3 approved timecards first" | unchanged |

### `src/components/payroll-period-close.tsx` (AR-4)
| Line | Old | New |
|---|---|---|
| 15 | "Loading complete population" | "Loading the list of people…" |
| 15 | "Population expired. Reload to review current data." | "This list is out of date. Refresh it to see current data." |
| 79 | "Review the complete roster, including inactive and zero-time employees." | "Check everyone on the list, including inactive accounts and people with no hours." |
| 81 | "Population unavailable. Reload to try again." | "We couldn't load the list. Refresh it to try again." |
| 90 | "Recovery storage unavailable. Enable browser storage before saving payroll period changes." | "Browser storage is off. Turn it on before saving changes here." |
| 91 | "Population paused. Reload to review current data." | "Paused while you were away. Refresh the list to continue." |
| 108 | "Population expired. Reload before sending a period command." | "This list is out of date. Refresh it before saving." |
| 116 | "Could not retain the original command. No payroll period change was sent." | "We couldn't keep a copy of this change, so nothing was sent. Try again." |
| 129 | server conflict message shown as sent | "Something changed while you were working. Refresh the list and check it again." (keyed on `state: "conflict"`) |
| 139 | "Handoff report saved. Provider import and payroll processing remain unverified." | "Saved. NEVORA can't confirm your provider imported it." |
| 140 | "Saved with an immutable operation receipt." | "Saved." |
| 145 | "Outcome unconfirmed. Retry the original command before starting another." | "We couldn't confirm that was saved. Try again before changing anything else." |
| 153 | "Complete payroll population and handoff" | "Who's in this payroll" |
| 155 | "Account creation and active status are not employment start or end dates. Review period employment facts for every member. Preparing a manifest does not mean payroll is processed." | "Choose what to do with each person for this period. An active account doesn't say when someone started or left, so note that here. Nothing you save here runs payroll." |
| 166 | "Reload population" | "Refresh the list" |
| 175 | "Retry original period command" | "Try again" |
| 178 | "Review payroll population" / "Close population details" | "Choose who's included" / "Hide the list" |
| 222 | raw card state on desktop (DRAFT) | "Draft timecard" and so on, on every width |
| 225 | "Historical period evidence retained" / "No recorded period evidence" | "Has time or timecard history this period" / "No time or timecard history this period" |
| 227 | raw issue codes on desktop | plain issue names on every width |
| 231 | "ADP RUN export is unavailable for inactive accounts. Review a compatible neutral or custom export; do not drop this member silently." | "ADP RUN files can't include inactive accounts. Use the CSV file or a custom layout for this person, so they aren't left out by accident." |
| 237 | "Period disposition" | "What to do with this period" |
| 244 | "Review this member" | "Choose one" |
| 247 | "Include finalized time in exports" | "Include their finalized hours" |
| 250 | "Reviewed zero-time member" | "No hours this period" |
| 253 | "Exclude with audited reason" | "Leave out, with a reason" |
| 258 | "Disposition reason" | "Reason" |
| 267 | "Reviewed period employment facts (manager-attested; include entrants/leavers)" | "Employment this period, as you know it (say if they started or left)" |
| 284 | "Save reviewed population revision" | "Save this list" |
| 287 | "Reconcile export batches" | "Match your export files" |
| 289 | "Population revision {n}. Select all original export batches covering included members exactly once. Zero-time members and audited exclusions remain in the manifest." | "List version {n}. Select the export files that cover each included person exactly once. People with no hours and people you left out stay on the period record." |
| 341 | "Prepare verified manifest" | "Save period record" |
| 347 | "This population revision already has a manifest below. If data changed, review and save a new population revision before preparing another." | "This version of the list already has a period record below. If something changed, save the list again before making another." |
| 351 | "Prepared manifests" | "Period records" |
| 356 | "Manifest matches current reviewed population" / "Historical manifest — current data requires review" | "Matches the current list" / "Older record, made before the list changed" |
| 360 | "Population revision {n}" | "List version {n}" |
| 364 | "Manifest fingerprint" | "Record fingerprint" |
| 371 | "Retrieve saved manifest" | "Download period record" |
| 378 | "Retrieve saved CSV batch {n}" | "Download CSV file {n}" |
| 384 | "Retrieve canonical JSON batch {n}" | "Download time record {n} (JSON)" |
| 395 | "Server artifact responses are recorded. Browser file completion is unverified." | "NEVORA records each download request. It can't confirm the file finished downloading." |
| 412 | "Record manual downstream handoff" | "Note where you sent the files" |
| 414 | "Destination" | "Sent to" |
| 418 | "External reference" | "Their reference or confirmation number" |
| 422 | "Reported state" | "Status" |
| 425 | "Reported submitted" | "I sent the files" |
| 428 | "Reported imported (unverified)" | "They imported the files (not checked by NEVORA)" |
| 433 | "Save handoff report" | "Save note" |
| 437 | "No connected provider verifies import or payroll processing." | "NEVORA isn't connected to your provider, so it can't confirm the import or that payroll ran." |
| 441 | "Artifact and handoff history" | "Downloads and notes" |
| 445 | "{KIND} · {raw timestamp} · actor {id}" | "Download requested" / "Marked as sent" / "Marked as imported" · formatted date · "by {name from the list, or 'someone on your team'}" |
| 450 | "…Manager reported, provider verification unavailable." | "…Reported by a manager. Not confirmed by the provider." |
| 456 | "…Browser file completion unverified." | "…Download not confirmed." |

## Tests
- `npx eslint` on every changed `.ts`/`.tsx` file: clean.
- `npx vitest run` on `src/components/payroll/`, the three `payroll-export*` / `payroll-period-close*` test files, `payroll-review-copy.test.ts`, `b-viewport.test.ts`, `no-page-entrance-motion.test.ts`, `hex-guard.test.ts` and `operational-page-composition.test.tsx`: 22 files, 282 tests passed, before the last one-line notice change. After it I re-ran ESLint on `payroll-period-close.tsx` and the three affected test files (109 passed).
- `page.payroll.test.tsx`, `corp-upscale.test.tsx`, `scoped-read-frame.test.tsx` and `layout.native.test.tsx` also pass.
- New cases: 9 in `payroll-premium.test.tsx` and 2 in `workflow-status.test.ts`.
- `payroll-export-lifetime.test.tsx` requires `PayrollExport` to keep exactly one effect, so the hash logic lives in a small child component, `IncludedSection`.

## For Codex
- `src/app/api/period-close/route.ts:64–75`: the 400 messages still use system wording ("Review every member, reason and employment attestation.", "Outcome unconfirmed. Retry the original operation."). The UI rewords only the 409 conflict.
- PY-11: the Owner line is generic. "Net pay changed by $X for N people" needs a server delta.
- PY-10: the UI now says "Contact support" for rule confirmation. If rules should be confirmable in the app, that needs a server path and a screen.
- Import runs with `automation.publish` on also share automatically, but run data doesn't carry that setting, so the import wording stays "Then share pay statements".

## Left for the coordinator
**QA scripts that still use the old labels** (`scripts/` is outside my scope):
- `scripts/six-findings-ui-qa.mjs:176,183,210,212,217,225,236,237,241,243,252`
- `scripts/payroll-workflow-ui-qa.mjs:108,109,112,124,126,302`

**Things I kept as they were:**
- About 20 older fix sentences that say "Ask the Owner to…" for payroll setup. A setup screen exists, so they are true, but they read oddly to an Owner. Say if you want a plain pass.
- `src/components/payroll/my-pay.tsx` ("published statements", "Next payday") and `native-tax-fields.tsx:20` ("Federal employee tax collection"). These belong to PY-7 and PY-13, not this package.
- The "Payday today / tomorrow / in N days" chips.

**Leftovers from deletions:**
- Stepper CSS is now dead: `src/app/app/payroll/payroll-workflow.css:151–165,179` (in scope, left for a small diff), `src/app/app/premium-wave-b.css:539–542`, `src/app/app/portal-premium.css:578,726,760`.
- `.21st/DESIGN.md:189` still describes the stepper.
- `src/app/mobile-workforce.css:8,201–202`: the `.desktop-payroll-review-copy` / `.mobile-payroll-review-copy` rules are unused now.

**Check in the browser:**
1. Phone Payroll hero with the extra scope line under the title row, at 390 px and 320 px; the longer "Scheduled payday passed" chip beside "Up next · Every two weeks payroll".
2. Desktop band with a two-line subtitle. The band height comes from `border-image-outset` in `owner-b-desktop.css`.
3. Desktop Up next card with the three steps under its row. The global rule at `owner-b-desktop.css:428` should give it 22 px side padding.
4. "What's next" card on phone, on desktop and on approved Payroll details.
5. Approve area at 768 px and up: the notes are left-aligned above a right-aligned button.
6. Phone with an overdue period: one teal "Prepare" plus the quiet "Prepare payroll" link with a 44 px target.
7. Fix page, then "Choose who's included": the section opens and clears the header (`scroll-margin-top: 96px`); on a phone the list shows without the inner disclosure.
8. The history line's date parsing in Safari. It falls back to the stored text if the date can't be read.
9. Payroll settings in import mode: the longer select label and the help text under "Who sends it".
