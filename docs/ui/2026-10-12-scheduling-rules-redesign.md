# NEVORA scheduling rules implementation

Option A is implemented and locally verified. Jose approved implementation and mobile/desktop testing on 12 October 2026. No further design approval is required for this bounded change.

## Source and scope

- Isolated branch: `codex/nevora-scheduling-rules-20261012`.
- Checkout: `/Users/josek0514/Documents/Codex/2026-10-12/coo-we-are-working-on-redesign/work/checkout`.
- Base: `ba5ed01`, the local reviewed integration candidate containing the approved DESIGN.MD.
- Tested application checkpoint: `a4b562dda70bfc2b1d8f76fb010b679a172e2095`.
- Implementation commits: `b34b84b` (redesign), `2c1229b` (tablet header correction), `a4b562d` (accurate maximum-hours explanation).
- This branch has not been pushed, merged to development/main, or deployed. Other active redesign checkouts were preserved.

Changed files: `src/app/app/schedule/settings/page.tsx`, its new `scheduling-rules.css` and page tests, one explanatory sentence in `src/components/shift-change-policy-fields.tsx`, and the scheduling-rules section in `DESIGN.MD`. This handoff is also saved in repository docs.

The desktop section rail and mobile section links organize four groups: Location staffing, Weekly hours, Recurring coverage, and Trade & coverage policy. Fields have separate labels and units, supporting instructions, scoped save actions and purposeful empty-state links. Native disclosures reduce secondary detail. The page uses the approved orange/charcoal actions, neutral surfaces, 18px panels, local Inter/JetBrains Mono and regular Phosphor icons. Restrained 180ms interaction transitions respect reduced motion. A browser-discovered tablet header overflow was corrected.

The combined staffing/hour save, independent coverage/quantity/policy saves, original native field names, fragment destinations, unknown settings, blank targets, zero values, midnight handling and inactive configured quotas remain available. Maximum hours are described as flagging excess scheduled hours, matching the existing warning behavior. Server actions, data access, mutation proofs and authorization contracts were not changed.

## Verification completed

- `npm run typecheck`: passed.
- ESLint on the changed TSX files: passed.
- Eight relevant Vitest files: **148 tests passed**. Includes scheduling page/actions, policy actions/fields, configuration form, schedule health, scheduling rules and operational rules.
- Actual Next app in Chromium and WebKit: **52 browser checks passed**, with no recorded page errors.
- Both engines: 320, 390, 430, 768, 1024 and 1440px fit; expanded forms; 44px action targets; native keyboard/focus and disclosures; Action Center targets/missing targets; normal and reduced motion; mobile touch navigation.
- Real fictional SQL writes confirmed staffing/Lead changes, blank target and zero maximum, coverage day/time/override/position quantities, end-of-day midnight, selected removal, and independent Owner policy revisions.
- Pending disabled fields/status, network-failure draft retention, duplicate/invalid coverage feedback, policy conflict/reload, manager read-only policy, employee access denial, inactive quota review, unknown Lead setup, long names, empty coverage and unavailable policy passed. A Manager completed a real hours save on a mobile viewport.
- The generated patch passed `git apply --check --reverse` against the implementation checkout.

QA used the existing toolkit's Playwright library and an ownership-marked disposable PostgreSQL cluster with fictional employees. The actual application was mirrored at the tested commit, with the repository's approved local DB transport substitution. The final ownership record verifies the source and mirror, including 1,042 captured application inputs, and confirms cleanup. The test app and owned database were closed; the temporary runtime descriptor was removed. External delivery was disabled.

The interactive browser tool could not access loopback in this session, so the same installed Playwright engines ran through the authorized local QA runner. Earlier runner setup issues were resolved without weakening application assertions: the fixture now uses a legal location label, PostgreSQL time precision is compared at the application's minute granularity, and login uses its supported schedule return destination.

## Evidence and resumption

User-facing artifacts are in the task's `outputs/` directory:

- `scheduling-rules-desktop.png` and `scheduling-rules-desktop-expanded.png`.
- `scheduling-rules-mobile.png` and `scheduling-rules-mobile-full.png`.
- `scheduling-rules-browser-report.json`: all 52 named checks and the exact application checkpoint.
- `scheduling-rules.patch`: application/design/test changes from the reviewed base.
- `scheduling-rules-reference-options.md`: inspected Mobbin references and 21st options.

The Next development indicator is omitted only during screenshot capture. Browser emulation does not certify physical devices or production. A production build and deployment were not part of this local acceptance run.

Reproducible local helpers: `work/start-rules-qa.mjs`, `work/verify-rules-ui.mjs`, and `work/qa-inventory.md`. They use only new owned fictional data and the existing runtime. Mirror logs, ownership metadata and source manifests remain under `work/browser-evidence/`.

Product position: approved Option A stays within scheduling-rule workflows and improves field/action clarity. Engineering position: renderer, responsive CSS and regression coverage; no new dependencies or business contracts. Governance position: local acceptance only; existing policy controls retained; no production action or paid service change. Delivery owner: Jose for integration/release. No remaining implementation blocker or new Jose decision is required for the completed local redesign. The next release step is review and integration with the current development/design work.

Tracked implementation is committed. An untracked `.impeccable/hook.cache.json` tooling file was left untouched.
