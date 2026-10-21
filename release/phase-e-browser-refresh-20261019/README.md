# Historical Phase E browser refresh: October 19–20, 2026

Jose requested merging `claude/premium-phase-1` at `1fa7a260` into `codex/verify-preview-33`, then updating the navigation, calendar and communications suites for the redesigned screens, with browser execution in the cloud and no application changes to satisfy old tests.

The coordinator commit was merged as `c8752f2b`. This task's final candidate was **6c56f5043bcf264296a11961b5335a54255b31cd**. All three focused suite gates passed: **42/42 executions**, Chromium and WebKit at 320, 375, 390, 430, 768, 1024 and 1440 px. These are historical receipts for that candidate, not acceptance of later UI/auth/backend integrations or the current release head.

| Suite | Passed executions | Actual tested source | Cloud evidence |
|---|---:|---|---|
| Navigation | 14/14 | `6c56f504` | [39351351653](https://github.com/JoseK0514/NEVORA/actions/runs/39351351653) |
| Calendar | 14/14 | `b9412a5c` | [39351214621](https://github.com/JoseK0514/NEVORA/actions/runs/39351214621) |
| Communications | 14/14 | `7e9e931e` | [39350515603, communications job](https://github.com/JoseK0514/NEVORA/actions/runs/39350515603) |

Run 39350515603 as a whole failed its earlier navigation/calendar jobs. Only its communications job supplies passing final evidence here. The later dedicated runs supply the final navigation/calendar receipts; the old failures remain failures.

## Changes and retained controls

Navigation follows current Requests section ownership, the desktop Profile account menu, actual notification rows and endpoint, current private Profile placeholders, native date constraints and availability controls. It retains actual 401/403 refusals, cross-view/session denial, hidden-DOM privacy clearing, SQL-lock recovery, stable request/outbox replay, Owner approval, keyboard/focus, contrast, control-size, axe and overflow checks. Text reflow uses the repository's documented 200% root-font method; this does not claim physical browser zoom acceptance.

Calendar follows the current retry label, management disclosure, separate provider instructions and revocation caveats. Communications follows current validation fields, content structure, acknowledgement states, offline/access-change states and explicit withdrawal confirmation. Their capability privacy, clipboard completion, unknown-result recovery, exact-version receipts, no duplicate commands and zero-runtime-error gates remain.

Test readiness now waits for current page reads before leaving Home/Schedule or pressing Back, checks native Partial day/Full day behavior before filling time-off dates, and waits for the app's declared document title before unchanged axe rules. The development badge is moved and closed through its own controls. No application code, assertion weakening, error filtering, forced clicks, timeout increase, production credential or real message delivery was used by this task.

Other agents advanced the branch through `ac99ed31` during verification. Those app fixes were preserved before the final integrated runs. [Input custody](input-custody.json) verifies this task's exact commit/file scope and compares 2,846 tracked entries. Calendar differs from the final candidate only in the unexecuted navigation module; communications differs only in the unexecuted navigation/calendar modules. Every other tracked input, including the executed suite, app, runtime and helpers, is byte-identical. Original receipts retain their actual tested checkpoint.

The per-suite browser reports, owned-resource reports and ownership files are included. Every final suite reports clean source, zero runtime errors, closed app/database ownership and all observed resources stopped. The application tree for this candidate is `432054fbc8c14a448e5c0278b240bd4576079acc`.

## Failure history and release limits

[Earlier failures](earlier-failures.json) preserve the immediate-Back WebKit errors, a transient missing document title, the intermediate calendar runtime failures, and the contemporaneous broader Home/Attendance CI failures. The first communications attempt also stopped before execution on an `IDENTITY_CHANGED` ownership observation in [39344945639](https://github.com/JoseK0514/NEVORA/actions/runs/39344945639); no supervision control was relaxed.

[Merge CI 39342768307](https://github.com/JoseK0514/NEVORA/actions/runs/39342768307) passed validate, typecheck, lint, production build, dependency audits and the Clocker/release/Phase E database gates. Its synthetic merge tree matched `c8752f2b`, verifying the history-depth correction. It was not a final-candidate full CI execution. The historical broader Home/Attendance failures are not described as current blockers here: later owners have advanced those suites and their current status must be read from their own exact-source runs.

These focused owned Next/PostgreSQL fixtures ran on GitHub-hosted Ubuntu. They do not establish hosted Neon/Vercel behavior, actual calendar-client acceptance, physical devices, assistive technology, independent UI/QA closure or production authorization. PR13 was kept draft and unmerged; this task performed no main merge or deployment. The probe workflow exists only on `codex/browser-probe-20261019`, outside the release PR.

Engineering guidance applied: test actual supported contracts and keep invariants. Security guidance applied: retain authorization, privacy, identity and retry controls. Delivery/governance guidance applied: preserve exact-source evidence and independent release gates. Owner: this browser-refresh integration task. No policy exception, risk acceptance or further Jose approval was requested. The remaining release gate belongs to the current integration/CI and independent review owners, using the current candidate rather than this historical checkpoint.
