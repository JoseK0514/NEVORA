# Cloud screen checks — October 19, 2026

Status: environment setup in progress. **No matrix results yet.** Prior unit/build/PostgreSQL evidence in README.md and SNAPSHOTS-2026-10-19.md is separate from these browser checks.

Cloud owner: Codex, branch `codex/premium-backend`. UI remediation belongs to the Claude chat listed below. No UI edits, merges or deployment. Fictional owned loopback PostgreSQL only. Preview passwords and browser state remain outside git.

## Coordination with Setup NEVORA

Jose requested coordination with the separate Setup NEVORA chat. This session cannot read another ChatGPT conversation. Shared evidence read: HANDOFF.md, README.md, CODEX-LOCAL-PROMPT.md, SNAPSHOTS-2026-10-19.md and LOAD-2026-10-19.md in this directory. This report is the cloud screen-check handoff; it does not claim direct communication or acknowledgement by that chat.

Backend/local work already documented there (Profile endpoints, error inspection, capture, swap fixtures and bounded preview connections) will not be duplicated without a reproduced screen failure. Existing backend fixes are not silently overlaid onto immutable Claude source snapshots. If another Codex session updates the backend branch, cloud publication must preserve its commits.

## Branch queue

Remote tips observed during initial setup (each will be refreshed and pinned immediately before its preview):

| Branch / owning chat | Observed commit | Status | Passed | Failed |
|---|---|---|---:|---:|
| `claude/premium-phase-1` — Employee/Lead, shared kit/shell | `2ab131ba004f3f26cc2b21ad95c90a6e0645259b` | Setup | — | — |
| `claude/p35-profile-6cdee8` — Owner/Manager Profile | `be4a232a1e6a26b58314ff549f88e5a8a79e82c6` | Queued | — | — |
| `claude/p35-wave-a-1283c8` — Shift forms, Coverage, Copy week, requests, Availability, Team | `157e25f7dab7a21542f54722746b237dc7b52afc` | Queued | — | — |
| `claude/p35-wave-b-808dfd` — Insights, Templates, rules, Updates, Payroll | `b0e051a951642ff34692604147fcd76ba805a3e7` | Queued | — | — |
| `claude/p35-wave-c-93e13c` — Settings and recovery | `e3a99fe7b6cda3c3b8049ff62f0de376d710b58f` | Queued | — | — |
| `claude/p4-desktop-240fe0` — Desktop layout | `578748d705b941d14f37c0b01bfcfb1332343e31` | Queued | — | — |

## Required evidence

- Every `src/app/app/**/page.tsx` plus `/login`; dynamic IDs read from the owned seed. All authorized requested accounts. Redirected role exclusions must be recorded, not counted as a checked page.
- Chromium and WebKit; widths `320,360,390,430,844x390,768,1024,1440`; root text `100,125,150,200`. A second axe pass at `390,1440`, text `100`.
- One checker process per preview. Timeouts and load-related 5xx remain separate and receive one identical rerun before final classification.
- Raw checks JSON under `cloud-checks/<branch>/`, with exact source SHA and commands. Every failure receives route/account/size/browser/check/detail and UI owner or backend fix reference.
- Separate `--large` premium-phase-1 preview: Manager/Owner Home, Inbox, Schedule, Team, Timecards, Time exports and Insights; browser load timings at 390 and 1440.

Release-candidate full matrix, build, Vitest, TypeScript and lint remain pending Jose's notice that the branches have merged into `claude/premium-phase-1`. No release approval is implied.
