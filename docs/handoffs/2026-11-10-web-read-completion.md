# Web read completion — NV-006 and NV-007

November 10, 2026. Native app/device/store work remains separate. This is the bounded P1 backend/read completion from Claude's November10 handoff, not certification of every P2/P3 request or the held UI branch.

## Source and resulting behavior

Base: development6091fb8d5783025b7a3e87be694d22c7cad99ae5. Isolated detached checkout: /Users/josek0514/.codex/worktrees/nevora-web-read-completion-20261110.

- 7b645067d8174e3a19808a7378c4bcf4ffb9e410 centralizes recorded-time review classification across Action Center, Timecards and Time exports. Mixed approval/finalization work no longer says every card is ready to approve. Untouched rows remain available through the existing disclosure and never inflate recorded-time review counts. No approval, zero-time-attestation, selection or export eligibility policy changes.
- 7c1b47b737656b9f4c8a06d188e0f0cf9fdf38a7 adds Owner/company Home payroll preparation facts from the canonical bounded missing-period read, independent of the personal upcoming payday. Manager company-history exclusion remains. Unknown/malformed/overflow/truncated history is unavailable; ambiguous transitions direct schedule review. Home timecard counts now retain each actual period and link to it.
- 15cbbac641f93ac7297a8119fe616c14c6ea4e61 lets these new payroll fact details wrap locally so full period dates/years remain visible on phones. Shared corporate row defaults and visual tokens remain.

New additive contract: readHomePayrollStatus(proof,executor?) returns null for unsupported roles or a disabled feature (the Home page separately gates module/view/company context), unavailable, or ready with optional overdue/reviewRequired {payday,period:{startDate,endDate}}. payrollStatus threads through ManagerDashboard/PremiumHome/OwnerHomeCorp. Personal readNextPay and NextPay stay upcoming-only. Raw settings, money, identities and private diagnostics are not serialized to Home.

For Claude's held DirectionB integration: HomeB currently consumes NextPay only. Forward the new optional payrollStatus from the dashboard/premium Home boundary into that UI's payday tile, retaining its explicit unavailable and schedule-review states. Do not widen personal NextPay, turn a missing preparation period into a claim of unpaid wages, or replace the bounded read with full runs(). Preserve period-aware closed-card review links and full visible dates in that UI's approved components. This implementation verifies the current development corporate Home; it does not claim the held HomeB has adopted the new contract.

## Controls and leadership positions

CPO/CTO: correct the demonstrated wording/period-routing defects using existing authorized facts and components. CISO: preserve payroll pre/post current-role/session guards, the final withOperationalCompany fence, module closure and the outer finite ScopedReadFrame. Governance/program: no exception accepted; local verification, code review, development publication, hosted CI and production activation are separate states. No schema, money calculation, mutation API, native bridge, payment/message send or cloud activation is part of these commits.

## Verification

Final runtime source15cbbac6 passed the serialized default suite:11,783 tests passed,857 skipped,798 files passed/32 skipped (455.09s, exit0). The existing reporter has55 additional pending records; they are not claimed executed. The final capped-memory TypeScript check also passed, exit0. Raw logs are final-default-15cbbac6.log and final-typecheck-15cbbac6.log in the external evidence root. Earlier passing default runs are source-qualified: Task1 had11743 passed/857 skipped; Task2's pre-correction source had11778 passed/857 skipped. Neither is relabeled as the final corrected source.

Focused Task1:447 tests; final Task2:60 tests across6files. Capped-memory TypeScript and changed-code lint passed on the Task2 functional source; the later fix adds only a local CSS/class and focused component cases. All red/green logs and source manifests are retained under the external evidence root below.

Real local PostgreSQL17.10 and browser attempt6 on15cbbac6:18 checks passed in Chromium/WebKit, desktop1440 and phone390, plus cross-year320/390. Verified canonical1-awaiting-approval/1-awaiting-finalization projection, untouched disclosure, keyboard focus/Enter, finalized-only export eligibility, exact review-period URLs, independent future payday plus older missing period, Employee exclusion, complete visible cross-year dates, and unavailable status after appending malformed test history.0 browser page errors and0 window error/unhandled-rejection events. All owned test databases/clusters closed/disposed. These are local test facts, not hosted/production acceptance. Compound role/company/module and session-failure branches were also checked in focused unit/composition tests with fake executors; they are not relabeled as additional real-browser role/revocation acceptance.

Attempts1–5 remain visible. Harness corrections respected the existing untouched disclosure, append-only payroll ledger and disclosure autofocus; no assertions, ledger constraints or runtime-error gates were weakened. Earlier rapid hard-navigation runs recorded WebKit native fetch/devtools diagnostics. The final settled-page run retained the strict zero-error gate and added window-exception tracing; no application navigation/transport fix or global closure is claimed.

Task1 and Task2 code/spec reviews approved; the phone wrapping correction received its own scoped approved re-review. The final combined review and exact publication/hosted-CI state are recorded in the referenced final-verification.json receipt; do not infer hosted acceptance from local results.

Evidence root: /Users/josek0514/.codex/web-read-completion-20261110. Plan/ledger/reports/logs/review packages are archived there before scratch workspace cleanup; browser-attempt-6/result.json and screenshots bind the real browser check to15cbbac6. Earlier CI42819901817/42819901843 proves6091 only; only its own completed CI can qualify the new publication; see final-verification.json rather than reusing6091 evidence.

## Decisions made

1. Keep company overdue facts in a separate Owner/company Home contract, preserving personal My pay and Manager history policy. Broader role access would require a distinct permission-policy decision.
2. Use Review for the combined approval/finalization work and Before payroll for unreviewed facts. A stage-specific Home breakdown would require additional UI/contract work.
3. An ambiguous period gets schedule review, without a preparation invitation for that same period. Different intended guidance would require a small tested copy/selection change.
4. Split closed review counts by exact period and retain all cards across those rows. This can add a row when two periods need review; it fixes navigation to the wrong week.
5. Allow a narrowly scoped normal-wrap rule for new payroll facts. The cost is taller fact rows on phones; full source dates take priority over ellipsis.

## Separate source and remaining launch gates

The separate signup owner delivered0c414ae65b9119f1d03c84b6933d10cb40276670 (deployed application3922df94, source-owned acceptance in docs/handoffs/2026-11-10-codex-to-claude-signup-production.md). Actual handoff records production infrastructure/domain/backend acceptance, controlled test-recipient admission, general admission closed, and remaining Claude UI, managed-worker and real paid-conversion gates. It supersedes earlier infrastructure-pending reports. This chat did not independently repeat that hosted acceptance or alter its resources.

A read-only merge-tree preview of15cbbac6 and0c414ae6 returned a267b51cbe95bf68b0ac374d168b972b2fd3de58 with exit0/no conflicts. No checkout/head/ref was merged or published by that preview, and that combined tree is NOT runtime-qualified. Selected signup UI/backend assembly remains its separately delivered source until the integration owner assembles and verifies it with these changes. No messages interrupted the lead or signup owner.

The finite worker packet remains bound to6091, with its own earlier green CI. No Render worker was created, no staging role/grant/credential transfer performed, no new paid service purchased and no worker activation inferred from this code work. Activation still needs its exact proposed scope, fresh private custody/headroom/window controls and the applicable approval; the separate production infrastructure budget does not erase those controls.

General customer admission, live paid checkout/Portal and broader production release remain closed pending their actual gates. Native delivery remains separate. Claude's held collaboration branch and P2/P3 followups are not imported, certified or closed by these two P1 fixes. Per-person PIN-attempt policy remains explicitly server-later. Jose publishes Shopify themes; this change publishes none.
