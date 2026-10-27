> GitHub reading copy. Internal file paths refer to the extracted package. Start with [README.md](README.md) for the one-command extraction. The full original is preserved in the payload.

# Continue the Nevora mobile Owner conversation

Prepared October 27, 2026, America/Puerto_Rico. This is a continuity package, not a fresh design brief. Jose has approved a deliberate, premium, calm mobile Owner experience and has repeatedly asked to keep the same consistency and standard. Continue from the accepted implementation; do not begin by redesigning it or asking him to repeat the foundation.

## Exact stopping point

**Batch3.5, Terminology and enabled modules / Features and words, is complete in the local mockup.** Its independent final review returned PASS / APPROVE, code quality WATCH, with no material blockers. The UI source was unchanged after that review. The next implementation is **3.6 Company/location operational policies and history/conflicts**, inventory C-08/C-09. No3.6 implementation has started. The latest user request was to prepare this handoff so Codex Cloud can continue as the same conversation; local implementation stopped at this verified boundary.

Current artifact SHA-256: `65f2a5d5cbb596f90a2d08adb2fca30c869e1142e8325e9d25f23326e70d1c64`.
Application reference commit: `46e202786863279302026ee03a0e225c359fa55c`.
Coverage: **53 working bounded mockup groups, 43 remaining-or-partial, 4 Owner exclusions**, out of100. These are workflow inventory groups, not screens or a percentage of engineering completion. Overall Section3 is still in progress. Actual-app integration is unstarted in this conversation.

## Read in this order

1. **CONVERSATION-CONTEXT.md** — Jose's intent, accepted design direction, prior feedback, progression agreement and current review boundary.
2. **WORKING-AGREEMENTS.md** — his engineering instructions, scope, autonomy and service/data restrictions.
3. **DESIGN.md** — the accepted mockup system. Start with the current source tokens and approved components; later phase notes supplement the system.
4. **outputs/owner-mobile-delivery-plan.md**, **outputs/owner-mobile-quality-gates.md**, **outputs/owner-mobile-remaining.md** — exact sections, completion criteria and all100 workflow rows. The current machine inventory is outputs/owner-mobile-current-coverage.json; original source routes/line references live alongside each row.
5. **outputs/owner-features/review.md**, **work/owner-features/handoff.md**, **outputs/owner-features/review-resolution.json**, **outputs/owner-features/independent-review/review.md** — final3.5 implementation, original review, minor finding and limitations.
6. **NEXT-BATCH-3.6.md**, then its source files under reference/application — the immediate next job. Before a later section, read only that section's source contracts and relevant prior reviews rather than loading every historical file.

The historical phase hashes and “next” paragraphs inside old reviews or the canonical README are intentionally retained. They are not current status. This file plus the current coverage/delivery ledgers identify where to resume. PRODUCT.md has broader product context; it is not permission to expand beyond mobile Owner.

## Start the working preview

From the extracted package root (not reference/application):

```sh
python3 tools/validate_handoff.py
python3 work/owner-mobile/build.py
python3 -m http.server 18763 --bind 127.0.0.1 --directory outputs
```

Use the Cloud browser's supported localhost/port-forwarding mechanism. Open `/nevora-owner-mobile.html?page=home`, then `?page=settings`, and `?page=features&review=features-final`. The artifact is self-contained; it needs no npm install, backend, network credentials or database. If18763 is occupied, select another port and use tools/prepare_checks.py for copied browser tests with that port. Never kill an unrelated server. The Mac localhost URL is historical; no running Mac browser/server, cookies, panel tabs or process state transfers to Cloud.

The package is deliberately not a Git repository. The original design workspace was non-Git, so no branch/commit/PR/deployment exists for it. If using a connected Cloud repository, put this isolated mockup in its own agreed folder/worktree after inspecting status. Do not replace real application files with simulation stores. No new repository, push, PR or deployment is required merely to inspect this handoff.

## Canonical implementation map

Build order and authoritative file lists are in work/owner-mobile/build.py. template.html supplies the shell/SVG symbol assets and initial static samples. app.js owns root wiring, navigation, tools/finder, current context and integrations. Matching `*-store.js`, view `.js`, and `.css` files separate model simulation, interaction/rendering and scoped styling. Extend the owning feature rather than adding another global app shell.

- Schedule: schedule.js/schedule.css. Stable operational keys are distinct from editable location/position labels. Preserve existing shifts/publications/templates/exclusions, deadlines and source identity.
- Team: team-store/team, invitations, manager-access, clocker-pin, account-recovery, operational-rules. Preserve independent employee/access/scheduling revisions and issuer/private-code boundaries.
- Timecards: timecards-store/timecards, corrections-store/corrections, timecard-actions-store/timecard-actions; recorded time includes breaks and is not automatically payroll time.
- Daily operations: attendance, workforce (availability/weekly overview), timeoff, exchanges (including callouts/coverage lifecycle), triage. Triage aggregates current source identities; it does not own duplicate decisions or fabricated counts.
- Company/setup: company, locations, catalogs (positions/break types), branding and features. Shared presentation revision is in branding-store.js; brand-colors.js and presentation-data.js mechanically preserve the pinned source algorithms/definitions. presentation-adapter.js changes deliberate labels/gates.
- Root design tokens are in styles.css. Keep new UI scoped, use existing task headers/native controls/definition groups/neutral notices/Phosphor assets. Build output is generated and should not be edited directly.

## What was finished

The working slices include ScheduleS-01–15; TeamT-01–08; invitation, Manager scope, Clocker PIN and account recovery; time corrections; period/person Timecards and approval/finalization/reopen/batch decisions; attendance; availability/weekly Team; time-off decisions/history; swaps/pickups; callouts/closing coverage; Home/Inbox triage; company details/settings navigation; Locations; job positions/break types; branding/logo; Features and words. The exact53 rows and evidence links are in the current inventory. Existing previews are not secretly completed workflows.

Latest3.5: five fixed source vocabulary presets and five source feature choices on focused pages,400ms autosave, shared-revision section merge, original-operation retry, real company-wide raw-status disable blockers, payroll prerequisite, current capability-aware routes/tools/stores/triage, and explicit label-slot adapters. It retains approved absence/assignments/recorded history while relevant new actions are off. Full Updates, statements, real Clocker controls, Spanish dictionaries and persistence remain separate work.

## Verification at the stopping point

Executor evidence on the exact current SHA: **1,230 browser cases** (Chromium/Firefox/WebKit), **125 model checks**, **8 source checks**, **45 captures**, **162 styled text contrast samples**, minimum5.0289:1. All48 effective command records have zero exit and matching before/after hashes. See outputs/owner-features/verification-summary.json and final-effective-verification.json.

Independent reviewer reran19model+35focusedChromium cases,54passed/0failed, and inspected aggregate records/captures. It did not independently rerun all1230 cases. Original independent review is PASS/APPROVE/WATCH on the same final artifact. One LOW finding remains: sticky-header clearance can be stale after live font/viewport resizing until another render; no obscured control or failed save was demonstrated. Keep it recorded; fix if a supported material failure is reproduced, without restarting an unbounded polish loop.

Original failed tests and an interrupted early matrix are retained. Legacy Timeoff/Exchange harness selectors/tab expectations predated accepted triage; a baseline probe proved that before3.5. Copied tests were ported to actual item identities, count deltas, current filters and return paths, then passed. Read work/owner-features/ledger.md and request-baseline-probe.json before interpreting those historical logs. Do not delete failures or present them as current passing assertions.

Most historical runners have Mac-specific Playwright imports, fixed ports and some actual-checkout source probes. **tools/RUNTIME.md** explains safe isolated copies and the portable focused smoke check. Do not run historical aggregate scripts unchanged on Cloud and call a missing Mac path an application defect. Conversely, do not report a skipped actual-checkout check as passed. New evidence must name the current source and environment honestly.

## Remaining work and progression

Immediate:3.6policies/history,3.7first-run checklist,3.8Clocker device setup/protected code,3.9device management/clock receipt lookup. Finish the connected Section3 walkthrough before advancing. Then Section4time exports/handoff;5payroll setup;6payroll processing;7workforce insights/reporting;8company updates/notifications;9Owner account/navigation/discovery;10conditional AI Manager. Every batch and exit criterion is already enumerated in the delivery plan; all43 remaining rows have source routes/requirements in the inventory. Do not collapse a whole section into a single oversized implementation.

Jose authorized continuing through the mobile Owner roadmap in order after each phase passes, without routine repeated approval. This handoff itself begins no new implementation. When continuing, start with a short status acknowledgement and inspect the current source, implement one bounded user job, verify all required states/affected seams, save a reviewed result and update coverage before advancing. Ask only for genuinely missing required information or a consequential action beyond the existing authorization. Keep him informed at meaningful intervals.

Actual app integration, real server authorization/transactions, physical iPhone/Android/software keyboards/real VoiceOver or TalkBack, real delivery/download/provider behavior, release and deployment are explicitly separate acceptance states. Q-01–Q-12 remain overall unverified in the parity ledger even where individual mockup slices have browser evidence. Never turn53working mockup groups into a production-completion claim.

## Contents and provenance

The package contains canonical source, current self-contained artifact, accepted design records, complete current roadmap/inventory, owner/schedule phase briefs/contracts/plans/ledgers/tests/snapshots, relevant reports/captures/logs and frozen actual-app src/db/config/test references. reference/application-snapshot.json pins each exported source file to46e202786863279302026ee03a0e225c359fa55c. The full real-app public-assets/docs archive, credentials, .env, node_modules, Git metadata, unrelated employee/desktop work and private skill installations are excluded. This is sufficient to inspect existing contracts and continue this mockup; it is not a deployable app checkout.

manifest.json records every packaged file hash. tools/validate_handoff.py checks that manifest and reproducible canonical build; transport-check.json records package validation, not a new production/UI certification. CONTINUATION-PROMPT.md is ready to paste into Codex Cloud alongside this package. No Cloud task/upload was created automatically; this file cannot transfer conversation memory or local running state by itself.

The supplied portable test preparation was exercised in a separate disposable Mac workspace:35focused browser and19model cases passed using only environment path/port adapters. Exact adapter hashes and results are in outputs/cloud-handoff-checks. This is a portability smoke check on the Mac, not a claim that Codex Cloud/Linux has already run it. Validate the immutable arrival package before editing; after implementation changes, preserve this handoff manifest as a historical snapshot and save a new source/evidence manifest for the new batch.
