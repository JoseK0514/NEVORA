# Canceled-subscription Checkout recovery

Codex owns backend and this bounded functional recovery page change; Claude owns the later visual remake. Development is the operating and acceptance release, held to production standards. Main/production and live billing require separate approval.

## Observed defect and contract

The original fictional acceptance company had a terminal canceled subscription, retained paid coverage and no active subscription controls in Stripe Portal. Central billing derived its action from normalized paid access and offered Portal only. Paid access and subscription lifecycle are separate facts.

Authenticated `/v1/status` now includes `billingAction`: `checkout` for no subscription or a known terminal subscription; `portal` for known nonterminal subscriptions; `null` for unknown/inconsistent catalog facts, unavailable billing configuration or an unready company. It exposes no new customer/subscription identifiers. The central browser parser accepts a missing field as unavailable during mixed-version rollout and rejects invalid values. UI uses the hint and hides plan-change actions unless Portal applies. Existing labels, CSS and design assets are retained.

The hint is presentation guidance. Actual Checkout still enforces server authorization, strict actor/request/operation-key binding, live provider identity/current-subscription checks and durable operation recovery. Replacement while original coverage remains is **setup mode**; opening Checkout does not prove a charge, conversion or new subscription. Original customer and later trial/paid-through anchor remain unchanged. Active subscriptions, including cancellation at period end, retain Portal.

## Regression evidence and scope

Lane B supplied the three runtime-file patch after reproducing the failure in real service-handler and React rendering tests. The finisher reviewed/applied it in a detached worktree based on development `322a279a264b583776707993db7738b243e63928`. Its owning targeted suite passed 99 tests and full TypeScript validation passed before the additional browser regression.

The source-bound owned Chromium/WebKit journey now starts with initial Checkout, seeds a canceled subscription with retained paid access in a disposable SQL catalog, and checks English/Spanish layout at four widths and 100/200 percent text. Native keyboard submission and lost-response recovery must use one setup Checkout with one unchanged operation and the original customer/coverage. The same runtime must show Portal for a current subscription and no financial actions for unknown state. Its existing denial, private retirement, foreign-network and process/database closure assertions remain mandatory. Semantic artifact verification rejects missing recovery evidence, charging mode, changed coverage/customer or unknown-state financial actions.

These tests use owned local HTTP/PostgreSQL and the existing SDK-level provider fixture. They do not certify hosted Checkout, real payment authentication, payroll/push, physical devices or independent findings. Exact-source local preparation, source qualification, immutable candidate CI/artifacts and independent actual-development CI/artifacts remain required before release claims.

## Hosted closeout

All three finite hosted packets are closed. The last source-M run verified the normal Owner Portal return and one genuine provider redelivery/dedup for an already recorded event. Enrollment stayed unissued after delayed native invocations; payroll/PDF/share/push and complete restart custody were not run. No new hosted recovery retest is authorized by this code change. Full closeout evidence is referenced by the finisher workspace `work/hosted-final/final-closeout.json` and Jira SCRUM-146 comment10372 / SCRUM-190 comment10373. Do not treat historical local/hosted evidence as qualification of this new source.
