# Owner, Employee and Clocker reliability inspection — November 1, 2026

## Decision

**QA recommendation: NO-GO for closing this reliability review.** Six reproducible defects remain, including a desktop Employee shift-details blocker. This is a local inspection recommendation, not production authorization or a complete release certification.

Inspected source: `JoseK0514/NEVORA`, full SHA **`2c4431386308b58b2684fa21492ea0a57e9d0a68`**. Origin was fetched before inspection and again at completion; the release branch still pointed to this SHA. The audit checkout is detached. No application, existing test, migration, environment, CI or release-branch changes were made. Nothing was committed, pushed, merged or deployed.

The scope was Jose's request to inspect scrolling, tabs, slowness, flaky interactions and connected workflows across Owner, Employee and Clocker. A source analyst, browser analyst and independent QA evidence reviewer participated. Findings below were checked against rendered browser evidence rather than source hypotheses alone.

## Environment and evidence

Fresh disposable local PostgreSQL clusters and source-verified Next development mirrors were created through the repository's owned-runtime helpers. Fictional employees, published schedules, historical time, payroll fixtures and Clocker help requests supplied populated cases. Chromium and WebKit ran headlessly; Mac unlock/native browser access was not needed for this method.

Phone widths included 320 and 390, coarse-pointer landscape 844×390, and desktop/tablet widths 1024 and 1440. The Clocker suite also covered portrait/landscape tablet sizes and enlarged type. These are browser emulations, not physical iPhone/iPad certification.

Canonical PIN saves, fictional tablet registration, punch/break transitions and receipt recovery were exercised only in disposable local databases. Financial approvals, publication, real messages, external providers, camera collection and production operations were not performed by the new inspection drivers. The existing fictional payroll fixture prepares its own local published sample statements.

Evidence root: [reliability-audit-20261101](../../../../outputs/reliability-audit-20261101/).

| Evidence | Actual coverage/result |
|---|---|
| [Main strict browser results](../../../../outputs/reliability-audit-20261101/portal-browser-verified/results.json) | 208 route-load cases, Owner/Employee phone and desktop, both engines; all reached actual content; zero route-record errors and zero recorded page errors in this pass. These are not 208 complete business transactions. |
| [Supplementary strict results](../../../../outputs/reliability-audit-20261101/supplementary-verified/results.json) | 40 additional route-load cases; all reached content, zero route-record errors. Attendance, availability, request review/detail, full-page swap/callout, branding, location form, payroll setup/preparation and shift editing were included without submitting operational forms. |
| Tabs and scrolling | 94 valid tab actions passed across the two strict passes. Eight controls were skipped after their context changed. Four attempts targeted inert underlying tabs while the New time-off dialog was open; these are inappropriate audit actions, not broken application tabs. 452 viewport scroll/geometry observations were recorded. |
| [Timecard cycle/focus diagnostics](../../../../outputs/reliability-audit-20261101/corrected-scenarios-verified/results.json) | 40 normal Done/Escape cycles passed, in addition to 20 cycles in the main strict pass: **60 normal open/close cycles**. Native browser-chrome Tab/focus retirement is discussed separately below. |
| [Fresh profile views](../../../../outputs/reliability-audit-20261101/final-targets-fresh/results.json) | 20 Owner employee-profile query views reached content in fresh contexts: profile, access, edit details, positions and scheduling rules at 390/1440 in both engines. No changes were saved. |
| [Catalog dialogs](../../../../outputs/reliability-audit-20261101/catalog-verified/results.json) | 32 add/edit scenarios across Positions/Break types and four widths. 28 passed all assertions. Four WebKit Add-position cases closed with Escape but did not restore focus to the mouse-opened trigger; retain the focus distinction rather than claiming 32 full passes. |
| [Protected-read recovery](../../../../outputs/reliability-audit-20261101/latency-verified/results.json) | Eight targeted desktop scenarios passed across both engines: repeated refresh, held reads, offline/reconnect and a response released after full-document navigation. Ten warm refreshes: median 116ms, range 115–183ms. |
| [Clocker suite](../../../../outputs/reliability-audit-20261101/clocker/clocker-ipad-results.json) | 42 existing rendered-browser checks passed, including duplicate-action protection, failed-send exact retry, lost response after commit, closed-tab recovery, privacy deadlines, Spanish UI and tablet layout. |
| [Clocker reset trials](../../../../outputs/reliability-audit-20261101/clocker-repeated-reset-verified/results.json) | Both engines reproduced redundant reset-queue amplification; PIN clearing remained intact and these trials wrote no punch ledger entries. |

Timing measurements come from local development servers and small fictional fixtures. They do not establish hosted cold-start latency, production throughput, physical touch smoothness, Web Vitals or provider performance. The late-response scenario used `page.goto`; it proves isolation after a full-document navigation, not every possible SPA race.

## Reproducible defects

### R-01 — P1: Desktop Employee shift details are off-screen

**Reproduced:** Chromium and WebKit, 1440×1000, twice in separate owned runtimes.

1. Sign in as the fictional Employee and open Schedule for the populated published week.
2. Open a shift row.
3. Wait for the panel animation to settle, then try to read the shift or use Swap.

**Actual:** the right-side dialog is visually blank. Its settled rectangle starts at `y=-500` with height `1000`; the Swap link ends at `y=-290`. A browser trial click repeatedly attempts scrolling but cannot make the action reachable. This blocks the normal shift detail/actions path, not just a selector in the test.

Evidence: [both-engine geometry and actionability](../../../../outputs/reliability-audit-20261101/final-targets-fresh/results.json), [Chromium screenshot](../../../../outputs/reliability-audit-20261101/final-targets-fresh/chromium-desktop-swap.png), [WebKit screenshot](../../../../outputs/reliability-audit-20261101/final-targets-fresh/webkit-desktop-swap.png).

Source matches a positioning conflict: [employee-shift-sheet.css](../../src/components/employee-shift-sheet.css) retains the individual `translate: 0 -50%` from its centred-dialog styling, while [corp.css](../../src/components/corp/corp.css) applies a full-height right drawer using `inset` and `transform`. Resetting `transform` alone does not clear that individual translate. Claude should confirm the cascade while repairing it.

**Closure:** shift facts, Done, Swap, coverage and callout actions must be visible and actionable at 768/1024/1440, normal and reduced motion, both engines. Preserve the approved corporate drawer design and request semantics.

### R-02 — P2: Back from an Employee swap sheet strands the page scroll lock

**Reproduced:** Employee phone, both engines, with actual wheel scrolling.

1. Open a published shift on Schedule.
2. Open Swap through the intercepted sheet route.
3. Use browser Back to return to Schedule.

**Actual:** zero dialogs remain, but `html[data-c-lock]` remains and computed overflow is hidden. The page has 177px of available vertical content; a 650px wheel input leaves scroll at zero. Programmatic `scrollTop` can bypass overflow hiding, so it was not accepted as proof of user scrolling.

Evidence: [strict scenario states and wheel measurements](../../../../outputs/reliability-audit-20261101/portal-browser-verified/results.json), [Chromium return](../../../../outputs/reliability-audit-20261101/portal-browser-verified/chromium-employee-phone-intercepted-swap-back-after-back.png), [WebKit return](../../../../outputs/reliability-audit-20261101/portal-browser-verified/webkit-employee-phone-intercepted-swap-back-after-back.png).

Source: [sheet-gestures.tsx](../../src/components/sheet-gestures.tsx) observes dialog `open` attributes but not removed dialog nodes; [quiet-sheet.tsx](../../src/components/quiet/quiet-sheet.tsx) has a separate `data-q-sheet` lifecycle. Native Tab into browser chrome also retires protected Timecards content and exposed a stale lock in diagnostic traces. Browser-chrome focus departure itself is not classified as a defect; privacy clearing must remain intact.

**Closure:** every close/removal/Back/forward/retirement path must clear the lock when no modal remains. Verify real wheel/touch scrolling, focus restoration and navigation afterward; do not weaken privacy retirement to keep a dialog alive.

### R-03 — P2: A completed older Team search erases the latest draft

**Reproduced:** six of six controlled trials, three in each engine.

1. Search Team for `Alexandra`; hold that RSC response.
2. Type `AlexandraZ` before the next 300ms debounce runs.
3. Release the older response.

**Actual:** the input remounts with `Alexandra`, drops `Z`, and the final query remains `Alexandra`. This is lost user input, not merely an old result shown while a newer request is pending.

Evidence: [trial inputs, release timing, requests and resulting URL](../../../../outputs/reliability-audit-20261101/suspects-verified/results.json).

Source: [employee-directory-filters.tsx](../../src/components/employee-directory-filters.tsx) reads the current form when the debounce fires; [employee-directory.tsx](../../src/components/employee-directory.tsx) keys/remounts the input from the server query.

**Closure:** hold an old response while typing/clearing/retyping. The newest draft, caret/focus and final query must survive. Preserve server filtering and replace-history semantics.

### R-04 — P2: Timecards shows the wrong period after a same-route navigation

**Reproduced:** Owner phone and desktop, both engines.

1. Open populated Timecards for October 12–18.
2. Tap the main Time tab/Timecards sidebar link to bare `/app/timecards`.
3. Compare the displayed week with a reload of that same bare URL.

**Actual:** soft navigation keeps October 12–18, while reload shows October 26–November 1. The address and displayed period disagree. Normal refresh of an explicitly selected period passed; this defect is the same-route prop/state transition.

Evidence: [four natural-link scenarios](../../../../outputs/reliability-audit-20261101/portal-browser-verified/results.json), [soft-navigation screenshot](../../../../outputs/reliability-audit-20261101/portal-browser-verified/chromium-owner-phone-bare-timecards-soft.png).

Source: [timecards.tsx](../../src/components/timecards.tsx) initializes period state once; the [route component key](../../src/app/app/timecards/page.tsx) contains the actor, not the requested period.

**Closure:** navigation, date segments, direct links, reload and browser history must agree on the period. Clear stale selections/reviews and retain existing source-revision/authorization safeguards.

### R-05 — P2: Clocker help polling loses scroll position and focus

**Reproduced:** both engines, a real admitted protected response with 55 fictional requests.

1. Open Clocker recovery and scroll/focus near the bottom of its first 50 requests.
2. Hold the next routine background response.
3. Release it.

**Actual:** 50 rows collapse to zero, document height falls from 3313px to 844px, focus moves to BODY and scroll drops from 2469px to zero. The 50 rows return, but the reader's position does not.

Evidence: [before/during/after measurements](../../../../outputs/reliability-audit-20261101/help-list-verified/results.json).

Source: [clocker-owner-requests.tsx](../../src/components/clocker-owner-requests.tsx) explicitly clears its displayed snapshot whenever the shared controller reports refreshing, even during renewal of a still-valid read.

**Closure:** keep the reader's place during valid renewal; clear private content promptly on actual authority expiry, access loss, blur/offline retirement. Test focus, slow renewal, expiry and pagination together. Separately, “Show more requests” replaces 50 rows with the remaining five rather than appending; that wording/pagination choice needs product review and is not counted as a seventh defect here.

### R-06 — P2: Repeated Escape multiplies a slow Clocker reset

**Reproduced:** both engines with an explicitly injected one-second clear delay.

One Escape produced one clear and re-enabled the keypad after about 1.1 seconds. Five keydown events produced five serial clears and held it pending for about 5.2 seconds. PIN clearing and identity removal stayed correct; the trials recorded no time.

Evidence: [request sequence and durations](../../../../outputs/reliability-audit-20261101/clocker-repeated-reset-verified/results.json). Source: [clocker-pin-gate.tsx](../../src/components/clocker-pin-gate.tsx), serialized clear queue and unconditional Escape reset handler.

**Closure:** coalesce redundant resets or repeated keydown events without reopening the keypad before verification is securely cleared. Test delayed/failed clear, Escape repeats, visibility changes and a late verification response. Preserve fail-closed behavior and exact-command punch recovery.

## Additional concerns and limits

- **Brand Save pending feedback — P3 risk:** a held, intercepted request remained “Saving…” for 13 seconds. The status was screen-reader-only; the visible header Save and Color button stayed enabled and no local retry/cancel/check-save action appeared. Aborting the request produced the existing recovery alert. The source has no application timeout. This proves a bounded observation and a source-supported unbounded-request risk, not an observed infinite production hang. No brand write was forwarded. [Evidence](../../../../outputs/reliability-audit-20261101/suspects-verified/results.json), [brand-editor.tsx](../../src/components/brand-editor.tsx).
- **WebKit Add-position focus — needs classification:** four mouse-opened cases closed with Escape but did not restore focus to the trigger. Other catalog cases passed. Distinguish Safari's mouse-button focus policy from keyboard return-focus requirements before calling it an accessibility defect. Do not label all 32 catalog assertions green. [Evidence](../../../../outputs/reliability-audit-20261101/catalog-verified/results.json).
- **Held-read deadlines:** a real hung Timecards read reached retry after approximately 45.6 seconds; own-hours reads reached unavailable after approximately 10.5 seconds in both engines. Recovery/privacy assertions passed. Consider the perceived wait separately from the source validity/security budget. [Original targeted records](../../../../outputs/reliability-audit-20261101/latency/results.json).
- **Runtime errors remain retained:** the two strict breadth passes recorded zero page errors. Separate targeted/focus suites retained WebKit access-control/cancellation messages. No blanket harmless-error classification or production CORS diagnosis is made. Native browser-chrome focus retirement is recorded, not bypassed.
- **Geometry heuristics are not defects:** hidden 1px submit controls, earlier rows partly above a scrolled viewport, inert tabs behind a modal, and measurements taken before scrolling settled were rejected as defect claims. One Photo-review 390px screenshot captured a later loading skeleton after readiness; exclude that image from a settled visual/geometry verdict.
- The eight findings from the [preceding local inspection](../../../release1-local-recheck-20261101/docs/handoffs/2026-11-01-fresh-local-owner-employee-clocker-inspection.md) remain open. This pass did not fix or independently close them, including the 1024px Timecards Status-column clipping.

Hosted Vercel performance/environment parity, physical iPhone/iPad gestures and keyboard, Home Screen lifecycle/camera permissions, provider delivery, production schema/data, concurrency/load at business scale and every destructive/financial state transition remain outside this evidence. Lead remains held; light mode and tablet-only punches are preserved. No paid AI, subscription or remote scan was started.

## Audit-method failures preserved

The first breadth driver could mistake a protected-frame skeleton for ready content and later stalled in an unbounded visual wait. Its invocation-owned browser was deliberately retired using verified ancestry; the parent completed owned app/database cleanup. It is exploratory evidence, not a passing breadth gate. The strict pass used actual headings/private readiness and bounded animation waits.

Initial targeted drivers assumed mobile Refresh was available outside its actual UI state, expected the private offline heading while an enclosing View-paused frame was shown, and referenced a retired profile tablist. These are audit assumptions, not app defects. Desktop Refresh was retested through its valid selection state; current profile query views were retested in fresh contexts.

Other retained setup failures: a help-fixture query initially looked for workspace identity on devices rather than locations; Clocker's configured loopback origin differs from the portal/device-alert origin in this owned helper. Correct requests were retested without changing either admission control. A late profile retest exhausted one fixture's login budget and displayed the real 15-minute rate-limit response; a new disposable fixture completed all 20 profile views. No rate limit or assertion in the application was weakened.

All five owned application lifecycles closed with `sourceVerified=true` and `mirrorVerified=true`; their application PIDs were checked absent. Cluster wrappers stopped and removed only their own temporary PostgreSQL clusters. Raw attempts, logs, screenshots, driver files, counts and ownership records are preserved in the evidence root.

## Implementation handoff

**UI implementation owner: Claude.** Codex has not changed or pushed UI. Preserve the current accepted corporate design and the unchanged advisor interface contract.

1. Repair R-01 and R-02 together as a bounded sheet/navigation batch. Reproduce the desktop blank panel, intercepted Back lock and retirement paths first; verify actual scrolling, actionability and focus afterward.
2. Repair R-03 and R-04 as the input/route-state batch. Add focused regression cases for the demonstrated delayed response and natural same-route link.
3. Repair R-05 and R-06 as Clocker reliability work. Preserve private-read expiry, PIN clearing and exact-command/idempotent recovery contracts. Review pending-feedback concerns with that batch.
4. Independently rerun the original failing scenarios after each batch, then the connected route/tab/scroll matrix and existing Clocker suite. Run exact-candidate hosted and physical-device checks before treating this as release-ready.

Do not redesign unrelated pages, add new migrations, change payroll/approval semantics, broaden permissions, ignore browser errors or silently relax tests. A fix requires fresh reproduction/closure evidence. Claude alone commits/pushes `claude-codex-collab-nevora`; this inspection does not authorize production migration, environment changes, deployment or moving `main`.

Independent disposition: [independent-review.md](../../../../outputs/reliability-audit-20261101/independent-review.md). Final machine-readable inventory and hashes: [summary.json](../../../../outputs/reliability-audit-20261101/summary.json).
