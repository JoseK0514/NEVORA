# Employee mobile next pass — independent UI/UX and design-system review

**Recommendation: APPROVE the bounded local prototype.**

Reviewed artifact: `outputs/employee-mobile/index.html`.

SHA-256: `aa48c2c4d40c1a45d6a8fdb8ed79d7d46c15ae78508002f0cf2be5d27b5fd59b`.

**Blockers: none remaining in this review.** This is approval of the Home time, Requests and Availability prototype pass, not complete Employee parity, server authorization, production integration or deployment.

## Scope and method

The target is Jose's approved Owner-derived teal Employee mobile direction: clear task hierarchy, restrained status color, native controls, consistent spacing, real reusable components and Employee-only actions. The user's Home time annotation is the interaction target: recorded time should be prominent and clearly connected to today's work, without implying phone punching.

I read the local AGENTS, PRODUCT and DESIGN contracts, frozen reference manifest, prior UI report, next-pass plan, source and available before snapshots. Source changes were inspected directly; `evidence/next-review/available-source-diff.patch` records the available App/Home/Hours/More/model/components/build comparisons. The original Requests source was not preserved in those snapshots, so this is a current-implementation review plus bounded regression evidence, not a claim to have inspected a complete Git diff. This workspace is not a Git repository.

I independently ran the inspected `build.mjs --check` path: it rebuilds in memory and the result matched the saved HTML byte for byte. I separately fetched the localhost page and verified its served hash. All five frozen Owner reference files match their manifest hashes. The prototype remains a local fictional React application; actual desktop source was used as a read-only capability reference.

I used the existing Impeccable Operate/refinement and No AI Slop guidance as review criteria. This report is the independent reviewer assessment, not a claim of a separate complete Impeccable critique orchestration or a native accessibility certification.

## Evidence inspected

- `work/employee-mobile/DESIGN.md`, `PRODUCT.md`, `AGENTS.md`, `references/manifest.json`, and their frozen reference files.
- `src/main.tsx`, `App.tsx`, `ui.tsx`, `tokens.css`, `components.css`, `layout.css`, Home/HomeTime/Hours, Requests/TimeOffRequest/RequestDetail, ExchangePanel/Create/Detail/model, published-shifts, coverage-eligibility, and Availability/editor/model/CSS.
- Prior `outputs/employee-mobile/ui-review.md`, `desktop-parity-audit.md`, and `next-pass-plan.md`; actual availability action/component source in the read-only desktop checkout at development `46e2027`.
- Own fresh headless Chromium capture run: `work/employee-mobile/evidence/next-review/capture.cjs` and `manifest.json`. It captured 17 surfaces on the final served hash: Requests root, open shifts, incoming swaps, own activity, change-shift form, usual availability and weekly availability at320/390px; plus Home break/off/overnight states at390px. Document/dialog scroll widths fit their viewports; no runtime errors occurred. No user browser tabs were used.
- Own `next-review/switcher-enlarged-320.png`, `enlarged.cjs`, and `enlarged.json`: the three selectors remain fully readable at200% text. Each measured86px wide, with equal client/scroll width and97px height.
- Supplied final Chromium captures: Home390 and enlarged320; partial-day, swap and unable-to-work reviews; enlarged exchange forms320/390; coverage-unavailable; Availability overview/day editor, weekly whole-week-unavailable review and closed week. The source changes between candidate captures and the final artifact were reconciled; the changed selectors and eligibility state were freshly inspected.
- All18 final suite result JSON files under `evidence/{chromium,webkit,firefox}`, `home-time-next`, `today-card`, `account-card`, `requests-next`, and `availability-next`. Every file names the final hash. They report103 passing cases per engine:38 legacy,14 Home time,9 Today card,10 account card,17 Requests and15 Availability, with no reported failures/runtime errors. These are inspected execution artifacts from the other agents, not103 scenarios independently rerun by this reviewer. Counts are not feature-completion percentages.
- `next-review/final-evidence.json` records final source hashes and the exact18 result-file hashes inspected.

## Findings by severity

### CRITICAL

None. The interface is live React DOM, not a screenshot or raster substitute. The official wordmark is the only UI image found. Phosphor SVG symbols supply icons. App's canvas only measures navigation labels; it is not used to render a fake interface.

### HIGH

None. Reused Button, Row, Section, Field, Status, Receipt and ViewSwitcher primitives render the screens. Shared CSS tokens drive color, typography roles, spacing, control height and radii. Existing optical dimensions remain in shared rules; new screens do not introduce per-screen color palettes or decoration. Primary controls are48px minimum and compact controls44px. The selected-state treatment now belongs to a shared component.

No Employee manager-approval, schedule-publishing, payroll-execution or phone-punch control was introduced. Request acceptance is described as a response awaiting the sample's manager-review policy, not permission to approve a schedule change. These UI observations do not establish backend authorization.

### MEDIUM — resolved before approval

**M1: the initially eligible coverage offer overlapped the employee's published shift.** The earlier candidate offered November5,10AM–2PM while the employee also worked9AM–5PM that day. That contradiction was reported to the root before approval.

Resolved in `src/published-shifts.ts:1`, `src/exchange-model.ts:12` and `src/coverage-eligibility.ts:10`: own exchange shifts derive from the canonical published list, the eligible fixture is October29 (an unassigned Thursday), and overlap is computed rather than dependent on a hand-written label. It also fits the initial Thursday availability and does not conflict with approved November6 leave.

**M2: editable availability must affect coverage eligibility.** The final implementation checks current usual/weekly availability and approved full/partial leave in `src/coverage-eligibility.ts:10`; `src/ExchangePanel.tsx:17` and `:25` use that rule for listing and submission, and the detail lookup uses the filtered offer. Final Requests evidence includes saving Thursday as unavailable and reopening Shift requests: October29 moves into a nonactionable refusal row. `requests-next/chromium/coverage-unavailable.png` was visually inspected. This is a local fixture rule, not integrated server policy certification.

### LOW — resolved observations and retained limitation

**L1: competing selected/action styling — resolved.** The previous solid-teal exchange selector competed with the solid-teal task action. `src/ui.tsx:25` and `src/components.css:27` now provide shared soft ViewSwitcher styling for both exchange and availability. Fresh final captures show the primary action retaining the stronger hierarchy, and the selected view retaining text plus border/background cues.

**L2: Home composition documentation — resolved.** DESIGN now describes shift → today's recorded clock status → attention → upcoming shifts, matching `src/Home.tsx:23` and `HomeTime.tsx`.

**L3: dismissal discards uncommitted drafts — retained, nonblocking scope limitation.** `src/Availability.tsx:29` guards changing Usual/By week when a draft is dirty. The shared sheet Close/Escape/backdrop paths in `src/App.tsx:34` close it without a discard confirmation. The plan now explicitly limits protection to switching views and states that closing cancels draft edits. Do not describe this as all-exit draft protection or draft persistence. Saved sample availability survives in-app navigation; refreshing still resets all sample state.

## Visual and interaction conclusion

Home now gives recorded clock status an intentional place directly below the published shift. The teal status area, white secondary route to Hours and adjacent location-Clocker instruction establish its purpose without an oversized metric or invented live timer. Break, off-clock and overnight wording stays distinct; unavailable/empty fixtures do not falsely report an active clock state.

Requests keeps work tools near the top, separates waiting requests from history and uses explicit review, submit, accept/decline, cancel and withdraw language. Detail/review pairs remain aligned and readable at phone widths. Availability distinguishes saved usual preferences, unsubmitted week values, submitted/closed weeks, midnight end-of-day and deliberate whole-week unavailability. Native fields, consistent insets, text-bearing status chips and shared actions retain the approved enterprise style.

Navigation remains reachable in the supplied enlarged-text checks. Sheets scroll rather than clip their lower actions. Native select collapsed text can truncate long option strings at enlarged sizes; the selected shift is restated in the subsequent review. No native iOS/Android picker, software keyboard or screen-reader session was certified here.

## Release limits

Approval covers this exact fictional in-memory prototype and the inspected scenarios. It does not mean every Employee desktop workflow is present. Remaining Hours/timecards/correction-history, communications, account tools, gated Pay and integrated revision/session/offline recovery remain in the coverage ledger. No source implementation, production app change, commit, push, real notification or deployment was performed by this reviewer.

---

## Bounded recheck — native select-arrow polish

**Current artifact SHA-256: `c75ceac716f2d54ab243dd8aada9e2bf427f2340fb21674fadd32812ac0a7244`. Recommendation: APPROVE. Blockers: none.** The full `aa48…` review above is preserved. This addendum covers only the shared Select wrapper and its use in Availability and shift-request forms.

I compared all five exact source snapshots under `work/employee-mobile/evidence/select-polish/before/` with current source: `ui.tsx`, `components.css`, `Availability.tsx`, `AvailabilityDayEditor.tsx`, and `ExchangeCreate.tsx`. The delta introduces a shared native-select wrapper and replaces those screens' raw select tags. Values, handlers, required flags, ids and labels remain intact. I ran the inspected in-memory build check again and independently verified the served localhost HTML hash against the saved artifact.

The shared `Select` at `src/ui.tsx:36` renders an actual `<select>` plus the existing Phosphor caret-down symbol. The icon is aria-hidden, noninteractive and has pointer-events:none. `src/components.css:72` uses the shared spacing/color roles for a16px logical end inset and44px text reserve; the caret is vertically centered. Existing native focus and validation remain on the select. Forced-colors uses system ButtonText. There is no custom listbox, fake dropdown image, new palette or per-screen arrow implementation.

Visually inspected final `select-polish/week-320.png`, `week-390.png` and `week-field.png`. The arrow is now evenly inset from the border with sufficient text separation, matching the restrained form system. Own fresh `next-review/select-final-keyboard-390.png` confirms a visible focus outline on the labeled field after selection. Own recorded DOM evidence in `next-review/select-final-evidence.json` confirms SELECT semantics, the Schedule week label,44px end padding, decorative icon and successful automated selection updating the closed-week state.

All three `select-polish/<engine>.json` files match this current hash and report11 completed checks each for mobile widths,200% text, arrow geometry, native value changes, keyboard focus, other reused select instances, forced-colors and runtime errors. The18 existing suite reports were also checked and match this hash with the previously documented103 cases per engine and no reported failures. These21 file hashes are recorded in `next-review/select-suite-manifest.json`; suite execution was performed by the implementation agents, while the source/build/served-hash and narrow independent browser inspection were performed by this reviewer.

### Recheck findings

- **CRITICAL:** None.
- **HIGH:** None.
- **MEDIUM:** None.
- **LOW:** No new visual defect identified. Native-popup keyboard selection is not certified: an exploratory ArrowDown/Enter sequence did not change the value in headless Chromium on either this field or a bare unstyled native select. Automated native selection and visible keyboard focus passed; the equivalent baseline result does not support a product-regression finding. Real mobile picker, software-keyboard and screen-reader verification remain outside this recheck.

The original draft-dismissal, local-sample, authorization/integration and incomplete-parity limits still apply. No application source, other chat artifacts, commit or deployment was changed by this reviewer.
