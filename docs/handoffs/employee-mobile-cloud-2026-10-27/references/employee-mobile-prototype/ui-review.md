# Employee Mobile UI/UX and design-system fidelity review

## 1. Disposition

**SHIP the bounded first-stage prototype — recommendation: APPROVE.** M1 is resolved by the bounded remediation recheck below. No open UI/UX blocker remains from this review. This is not production/integration approval or a new full audit of the revised artifact.

Original full-review disposition: **FIX / REQUEST_CHANGES**. The first connected slice used real React components, shared styling roles and the selected teal visual foundation, but scheduled the sample employee on an approved full-day leave date. No rebuild or wholesale redesign was required.

Original full-review artifact SHA-256: `302e0d96a95fbf7576dfc13aef21407fd5804b74665f0160617763948a08a08c`.

Reviewer: available clone/design-system fidelity reviewer substituted for the unavailable exact Impeccable-named reviewer. Applied the supplied Impeccable `reference/craft-floor.md` against the settled enterprise direction. The missing Tastemaker knowledge base prevents formal CR/TS citations or grading; none are claimed.

## 2. Scope

Goal: independently review the new Employee mobile React prototype's first connected slice, preserving the frozen Owner clean-teal palette, system typography, Phosphor regular icons, control roles and own-employee boundaries. Success means coherent task hierarchy, readable narrow/enlarged layouts, connected review flows, accurate sample state and real reusable UI rather than a screenshot substitute.

Reviewed `work/employee-mobile/AGENTS.md`, `outputs/employee-mobile/plan.md`, all `src/*.tsx`, `src/model.ts`, all three CSS files, `build.mjs`, package configuration and `check.cjs`. Scope includes Home, own published Schedule and review, Requests/time off, recorded Hours/correction, and own Profile/More previews. The existing app at commit `46e202786863279302026ee03a0e225c359fa55c` was read only: navigation, role permissions, My time page and Employee time panel support the Hours/no-phone-punching boundary. Root Owner/access work is excluded.

This workspace is not a Git repository, so no full Git diff or branch comparison exists for this new artifact. I reviewed the complete new source instead. No separate notepad was supplied; the plan and scoped AGENTS record were used as the review context. No application sources were changed by this reviewer.

## 3. Capture and evidence validity

- Independently reconstructed the standalone bundle in memory using the inspected build recipe; its bytes exactly matched `outputs/employee-mobile/index.html` and the hash above. This was a read-only comparison, not an output rebuild.
- Independently hashed all five files in `work/employee-mobile/references/manifest.json`; PRODUCT, DESIGN, frozen `.21st` design record, Owner stylesheet and Owner template all match their manifest hashes.
- Inspected `evidence/chromium/results.json`, `evidence/webkit/results.json`, `evidence/firefox/results.json`, and `evidence/flows/manifest.json`. All match the reviewed HTML hash. Each browser reports 38 passed, zero failed, no runtime errors and no operational requests. I inspected the assertion source; these are supplied automated executions, not fresh executions by this reviewer.
- Visually inspected every Chromium image for `home`, `schedule`, `requests`, `hours`, and `more` at 320, 390, 430 and 660 viewport widths (20 images), plus `enlarged-320.png` and `enlarged-390.png`. The 660 viewport intentionally renders a 430px-wide app; screenshots capture the app element, not the whole viewport.
- Visually inspected all 12 flow images under `work/employee-mobile/evidence/flows/`: `time-off-form`, `time-off-review`, `time-off-receipt`, `entry`, `correction-form`, `correction-review`, each at 320 and 390. The flow manifest identifies titles, viewport widths and overflow results.
- The final keyboard check reports success across all three engines after explicit modal Tab handling. Old failure PNGs remain historical and are not evidence against this matching final run.
- Source palette contrast calculations: ink/white 15.71:1, muted/white 5.42:1, muted/canvas 5.03:1, white/teal 6.09:1, amber/amber-wash 5.92:1, red/red-wash 5.44:1. These cover the principal authored pairs, not every native-browser placeholder or disabled state.

## 4. Material findings

### CRITICAL

None found in this bounded review. No raster/screenshot UI substitution or manager/payroll execution surface was found.

### HIGH

None found. `src/main.tsx` mounts a live React tree; `ui.tsx` supplies reused Button, Heading, Section, Row, Status, Field and Receipt primitives. All feature modules consume them. The only UI image is the official wordmark; icons reference SVG symbols. The canvas created in `App.tsx` measures navigation text and does not render UI imagery. Colors, primary type sizes, spacing, radii and touch-control heights are driven by shared CSS roles.

### MEDIUM — M1: approved leave conflicts with the employee's next-week work — RESOLVED

**Historical blocker on the original full-review hash.** `work/employee-mobile/src/model.ts:27` seeds approved full-day time off on November 6. `model.ts:30` includes day offset 11 from October 26, which is November 6, and `model.ts:33` gives it a 9:00 AM–5:00 PM shift. Home and Updates say “Time off approved”; Requests confirms the day, while Schedule → Next week renders it as a published workday. No conflict explanation exists. The employee cannot tell whether to attend work.

Evidence: `evidence/chromium/home-320.png`, `requests-320.png` and their wider equivalents show the approval; the complete fixture and the Schedule map prove the next-week conflict. This issue was not covered by the existing next-week assertion, which checks the week label but does not compare leave and shift dates.

Original required fix: make the fictional schedule consistent with the approved leave (or deliberately explain a conflict if that were the requested scenario). If a shift is removed, update `src/Schedule.tsx:42`, whose planned-hour text is currently fixed at 40, to match the visible shifts. Add a bounded assertion for the approval/date/count relationship; rebuild, rerun and refresh hash-bound captures/results. Do not add manager capabilities to resolve the prototype data.

### Bounded M1 remediation recheck

Current artifact SHA-256 independently verified: `234593a6901187d4d68f2f40e463875e88cbc01aad78bdc37bed09501ca04db7`.

**Verdict: RESOLVED.** Re-read `src/model.ts:27` and `src/model.ts:30`: approved full-day November 6 leave remains, while offset 11 has been removed from the shifts. Re-read `src/Schedule.tsx:42`: the summary now calculates `current.length * 8`, consistent with this fixture's uniformly eight-hour planned shifts. This is not a general variable-duration hours calculator.

Visually inspected the two new exact captures `evidence/flows/next-week-320.png` and `next-week-390.png`. Both show Nov 2–8 with four published shifts on Monday 2 through Thursday 5, **4 shifts · 32 planned hours**, and no Friday 6 shift. The list and summary remain aligned and readable at both widths. The approved request is retained in the inspected model.

Read the updated `check.cjs:37` assertions: next week must contain four rows, the summary must contain 32 planned hours, and the list must not contain Friday 6. Refreshed Chromium, WebKit and Firefox results each report 38 passed/0 failed, including that strengthened case, and all three hashes match the current artifact. The refreshed flow manifest matches the same hash and contains 14 records including both next-week screenshots. These are inspected test-result artifacts, not browser reruns by this reviewer.

The recheck is limited to M1, its dependent summary, the exact two captures, and final evidence provenance. The original full review and its coverage limits remain above; the other refreshed screenshots were not re-reviewed in this bounded pass.

### LOW

No additional blocking visual findings. Existing scalar optical values such as icon sizes and sheet heading size are shared class rules, not widespread per-screen styling. Their future token consolidation is not necessary to resolve this review.

The reviewed screens preserve aligned insets, clear section hierarchy and a single primary task action. Main content scrolls separately from navigation; partially visible later rows are reachable continuation, not horizontal clipping. The 200% navigation adapts to multiple rows and preserves labels, at the cost of a smaller content viewport. The 320px review buttons wrap legibly. Forms and detail sheets show readable labels, proposed versus recorded values and explicit pending/sample receipts. Own profile exposes no privilege or role editor; capability-dependent destinations are not falsely presented as available actions.

## 5. Limits and release boundary

This is a local, fictional, in-memory first-stage prototype. Approval covers this slice only, not full Employee parity, authorization enforcement, durable submission, real notifications, integration or production deployment. UI hiding is not backend access control. Swaps/coverage, complete availability editing, missing-entry/break corrections, payroll, messaging, account operations and other recorded deferred workflows remain separate work.

Visual inspection used Chromium captures. WebKit and Firefox provide matching behavioral assertions but no screenshot batches. Enlarged-text PNGs depict Requests/navigation, not every page or all form stages. No real iOS/Android software keyboard, screen-reader session or native date-picker interaction was inspected. The automated form check asserts the dialog's width, not every descendant's scroll width. Error/loading/partial behavior was inspected in code/assertions, not visually captured here. Frozen source/design records establish the style target; no pixel-for-pixel rendered Owner reference comparison or formal accessibility certification is claimed.

The 21st review log contains advisory hardcoded-color output whose cited layout line positions no longer describe the final file; it is not used as final-pass evidence. Current source and byte-matched build are the authority for the design-system conclusion.

**Blockers:** none remaining from the original full review after the bounded M1 recheck. No source implementation, commit, push or deployment was performed by this reviewer.
