# Quiet v4: Codex functional review, round 1 (Oct 23, 2026)

The review covered Claude commit 34a974d8 on base 8d4a3792. The Quiet v4 look is kept: colors, type, spacing, Phosphor icons, navigation and grouped rows. Every fix uses an existing Quiet pattern, either the in-place disclosure, the top-bar action or grouped rows.

Before this work, `development` was still at 8d4a3792, so there was nothing newer to reconcile. PR #29 (`codex/owner-ai-release-testing-20261023`) shares no files with this work.

## Fixes

1. **Shift requests: full shifts before a decision.** The fix is in `src/components/manager-shift-requests.tsx`.
   - Each waiting request is now a row that opens in place. A deep link opens it already expanded.
   - **Swap:** both employees, both full dates, start and end times, and both locations (with position and Shift lead).
   - **Coverage:** the affected shift, plus who picked it up or that no one has yet.
   - **"Unable to work":** the shift, the reason and the note.
   - Open cover rows use the same pattern.
   - Unchanged: Decision, revision binding, eligibility checks (`readShiftChangeAvailability`) and the changed or unavailable notices.
2. **Timecards: bulk review on phones.** The fix is in `src/components/timecards.tsx`.
   - The flow is Select (in the top bar), then eligible cards (round checks, plus Select all eligible), then Review selected timecards, then the reviewed set, then an explicit confirmation, then per-card results.
   - Unchanged: the approval wording, the separate Approve and Finalize actions, the exclusions (self-review, issues, state), the 100-card limit, source and revision checks, clearing on expiry, blur and actor change, and Retry original attempted action.
   - Selection, review and results live above the phone/desktop switch, so a resize in either direction keeps them.
3. **Support: approved wording.** The fix is in `src/app/support/page.tsx`.
   - The response text is `POLICY_FACTS.SUPPORT_RESPONSE_TIME`, word for word: "We aim to respond…", the Puerto Rico holiday exclusion, and "may take longer".
   - The mailing address is `POLICY_FACTS.BUSINESS_CONTACT_DETAILS`.
   - `policies.ts` is unchanged.
4. **Clocker devices: interaction tests.** The tests are in `src/components/clocker-device-manager.test.tsx`; production code is unchanged.
   - Covered: the Active, Needs setup and Removed tabs, opening each device's options, Rename, Replace, Reconnect, New setup code, Revoke, Cancel and Escape, where focus goes, inactive locations, and the hydration lock.
   - No defect was reproduced. To confirm the tests have teeth, three deliberate breaks were made (Revoke on removed tablets, Cancel no longer focused first, Replace allowed at an inactive location). Each one was caught.

## Tests

- **Regression tests**, each confirmed to fail before its fix:
  - Shift requests: 4 tests, including Codex's fixture (Oct 5 08:00–12:00 North Office, Oct 8 14:00–18:00 South Office).
  - Phone timecards: 6 tests, including resizing both ways.
  - Support: 1 test.
- **Device tests:** 7 new; the 7 existing ones are unchanged.
- **Local full run:** typecheck and eslint clean; vitest 9,502 passed, 0 failed, 801 skipped.

## Browser evidence

All captures are in this folder, from the owned local preview (Chromium, fictional data, signed in as the fictional Owner).

- **requests 390/1440:** the list, a swap opened by keyboard, and all rows open. The local preview company has no required scheduling rules, so the server answers "Needs Owner rule review" and correctly withholds Approve on swaps and coverage. The "Unable to work" report shows Approve. The Approve-visible swap path is covered by the regression test.
- **timecards 390:** the list, selecting, reviewed, confirmed, results (one fictional card approved on the local database), then resized to 1440 with the results still showing.
- **support 390 (reduced motion) / 1440:** the canonical response text and address.
- **devices 390/1440:** the list, then the options sheet with focus on the name field. Escape closes it and returns focus to the device row.

## Gaps

- **Not run locally:** the 12 GitHub jobs, the SQL and Attendance suites, the 70 Phase E browser cells and the evidence gates. These run in GitHub cloud on the combined candidate.
- **WebKit:** not captured this round.
- **Fixture rows:** the swap, coverage and callout rows were written straight into the throwaway local preview database, using the app's own terms SQL. They were not created through the employee flow.
