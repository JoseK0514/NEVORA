# Owner mobile 3.5 — Features and words

Completed October 27, 2026 in the standalone mobile Owner mockup only. Final artifact SHA-256: `65f2a5d5cbb596f90a2d08adb2fca30c869e1142e8325e9d25f23326e70d1c64` (unchanged after independent review). Canonical source: `work/owner-mobile`; build: `python3 work/owner-mobile/build.py`.

Features and words now provides five fixed vocabulary presets and five source-defined feature choices. Focused pages explain each choice and its consequence, save after 400ms, preserve the original operation during uncertain results, distinguish current saved state from a retained unsaved intent, and review revision conflicts explicitly. The shared presentation store merges only the requested section and preserves saved branding/logo and other settings. New disable commands check current company-wide raw request blockers; original receipt replay precedes new blocker checks. Payroll prerequisites preserve the hidden saved statements preference. Navigation, tools, direct destinations, request stores and triage reflect current feature/source availability. Approved absences, completed assignments and recorded time/breaks remain intact.

Only explicit vocabulary slots change; IDs, access roles, names and full operational sentences retain their source meaning. The current default prose and visual world remain accepted. The full Updates, pay-statement, Clocker and translation workflows are not completed by these settings.

## Verification actually completed

- Executor: **1,230 browser cases** across Chromium/Firefox/WebKit, **125 model checks**, **8 source checks**, **45 captures** and **162 actual styled text contrast samples**, minimum **5.0289:1**. The 48 effective commands have zero exits and matching before/after artifact hashes. See verification-summary.json and final-effective-verification.json.
- Independent reviewer: **PASS / APPROVE**, code quality **WATCH**, no material blockers. Independently reran **19 model + 35 focused Chromium cases**, all passed. The aggregate executor matrix was inspected, not independently rerun in full. Original report: independent-review/review.md; resolution: review-resolution.json.
- Deferred minor L1: live viewport/text resizing can leave sticky-header scroll clearance stale until another render; no hidden control or failed save was demonstrated. This remains a follow-up, not a fixed issue.
- Original failing tests and the interrupted early header matrix remain preserved. Old pre-triage Timeoff/Exchange selector/tab expectations were proven obsolete in the accepted baseline, then copied harnesses were ported to current request identity/count/filter/return assertions. Current full request checks pass; the original obsolete assertions are not reported as passing unchanged.

## Boundaries and next step

This workspace is non-Git; no branch, commit, PR, merge or deployment exists for this mockup. Actual app source was read-only, clean and detached at `46e202786863279302026ee03a0e225c359fa55c`; no app scripts, real messages, operational calls or customer data were used. Mock state is in memory and reset/reload loses it. Physical-device/software-keyboard/real-assistive-tech, server/DB/authorization/concurrency, actual integration and release verification remain pending.

Only C-07 advances: **53 working bounded groups / 43 remaining-or-partial / 4 excluded**, from 100 inventory groups. These are not completion percentages or screen counts. Overall Section3 remains open. Next is **3.6 Company/location operational policies and history/conflicts** (C-08/C-09), then3.7 setup checklist,3.8 Clocker setup,3.9 device management/receipt lookup. The user requested a Codex Cloud handoff at this boundary; no3.6 implementation has started.

All implementation decisions and the reviewer's bounded exclusions are recorded in work/owner-features/ledger.md. Current handoff: work/owner-features/handoff.md. The portable cloud package supplies the complete remaining roadmap, source reference and user instructions.
