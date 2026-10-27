# Employee mobile Timecard history — independent UI fidelity review

- Recommendation: **APPROVE** for this bounded local prototype slice.
- Blockers: **none found** in the reviewed UI/design-system scope.
- HTML: `outputs/employee-mobile/index.html`
- Verified SHA256: `f38470e0657f18c7221db1a2877b537558857e57838863841028ffc83eb3973a`
- Reviewer: independent clone/design-system fidelity reviewer, disclosed substitute for the unavailable named Impeccable reviewer.
- Review method: fresh source/diff and original-image inspection, read-only hash verification, and inspection of existing browser evidence. No source changes, rebuild, new browser run, or screenshot automation performed by this reviewer.

## Scope and source of truth

This is an ordinary extension of the approved Employee teal corporate UI, covering own period selection, historical timecard disclosures, current/frozen status presentation, correction refusal/review/receipt, and related responsive/focus behavior. It is not a new visual direction or permission to repair unrelated metadata. The workspace is not a Git checkout; branch/commit status cannot be established here. The baseline is the frozen `work/employee-mobile/evidence/timecard-history-pass/before/src` tree, not an inferred Git base.

Read `work/employee-mobile/AGENTS.md`, the pass surface contract, package scripts, local `DESIGN.md`/`PRODUCT.md`, and frozen Owner reference manifest/styles/design/product. The local design contracts and frozen references are the relevant visual authority; the concurrently changing root Owner documents are not Employee metadata. Applied the personal design-system-enforcer and Superpowers verification-before-completion guidance.

## Findings by severity

### CRITICAL

None. The reviewed surface is live React markup, not a screenshot, raster overlay, canvas imitation, or background image standing in for controls.

### HIGH

None. Shared primitives are actually consumed, and the change preserves the centralized palette and typography/spacing system. No new component palette or hardcoded visual imitation was introduced.

### MEDIUM

None observed within this slice and supplied evidence. No clipping, overlapping labels/statuses, obscured review heading, misleading Employee approval control, or false live-history affordance was found in the inspected captures and code.

### LOW

None requiring a change. At 320px and 200% text the existing two-column bottom navigation uses substantial vertical space, but the history and refresh control remain reachable and whole words wrap. This is an established enlarged-text adaptation, not a regression or reason to redesign the shell in this pass.

## Design-system and component verification

`src/Hours.tsx:38` leads through the shared view switcher into `Timecards`; `src/Timecards.tsx:29` uses Field/Select and native date inputs. Summary, recorded entries, corrections, and history preserve the established reading order. `src/TimecardHistory.tsx:25` uses Section, Status, the shared Icon, actual `details/summary`, and reused SnapshotEntry definition rows. `src/TimecardAccess.tsx` also consumes SnapshotEntry for finalized entry detail. `src/ui.tsx:7` implements real button controls; its Select retains an actual select element and Row emits a button only when actionable. There is no image-backed UI in this slice.

The only stylesheet addition is `src/Timecards.css:39`: status explanation spacing consumes `--s4`, border color consumes `--line`, and copy consumes `--muted`/`--text-sm`. The 1px rule and unitless line-height are conventional structural values, not a new visual token family. Existing card/control radii, 48px controls, 44px compact targets, type sizes, and 4–32 spacing roles remain unchanged. Existing optical/control details predate this diff and are recorded in the visual contract. `tokens.css`, `Appearance.css`, `components.css`, `layout.css`, and `ui.tsx` are byte-identical to the baseline. Light/Dark use the same component tree and centralized roles.

Native summary controls have a visible focus treatment and minimum height in `Timecards.css:24`; `App.tsx:46` retains the native dialog plus tab containment/Escape handling. Review/refusal/receipt changes in TimeCorrectionForm and TimecardAccess explicitly focus and reveal their headings/messages within the sheet viewport. Existing activation capture in `App.tsx:124` and `App.tsx:201` supplies the native dialog's return target.

## Visual observations from all 15 original PNGs

All paths below are under `work/employee-mobile/evidence/timecard-history-pass/chromium/` and were opened individually at their original source dimensions through the image viewer, rather than judged from contact boards.

- `reopened-390.png`: strong Hours heading, clear selected Timecards control, labeled native period selector, modest aligned totals, separated break definition, and explicit current-time Reopened explanation.
- `history-open-390.png`: history follows corrections; revision/action has stronger emphasis than actor/time, visible blue keyboard focus encloses the summary, the caret reflects expansion, and Historical snapshot distinguishes preserved facts from current totals.
- `finalized-390.png`: recorded entries and read-only decisions remain distinct; no correction action appears in this finalized card; revision ordering and Refresh timecard placement are coherent. This image is scrolled below the summary, so summary-state claims rely additionally on source and browser assertions.
- `needs-review-390.png`: readable amber text status and explanatory sentence avoid using color alone or suggesting Employee approval.
- `overlap-refusal-390.png`: refusal is visible above preserved native date/time fields, tells the employee a workplace reviewer must reopen, and does not imply success.
- `history-light-320-200-top.png`, `history-light-320-200-bottom.png`, `history-dark-320-200-top.png`, `history-dark-320-200-bottom.png`: long text wraps, summary labels and refresh stay inside the phone, and the Light/Dark change retains the same hierarchy and spacing. Top/bottom captures show scroll positions rather than a truncated static page.
- `history-light-390-200-top.png`, `history-light-390-200-bottom.png`, `history-dark-390-200-top.png`, `history-dark-390-200-bottom.png`: selected navigation, period selector, decision metadata, and refresh remain readable; no horizontal clipping or status collision observed.
- `review-320-200.png`, `receipt-320-200.png`: sheet title wraps before the Close target; focused review/receipt heading is visible. Receipt says sample, pending manager review, unchanged punches, and no notification sent.

## Findability and data language

The ordinary Hours → Timecards → Last week/earlier period flow exposes history without a hidden demo-only entry point. Default Last 7 days remains Draft with no unrelated decisions. History is newest-first and contains preserved effective time, original punches, separate breaks, observation time, and a historical label. Historical content has no live-entry action. Finalized current rows deliberately open the preserved SnapshotEntry detail, not an editable current record.

`timecard-access-model.ts` resolves Finalized from the latest snapshot and Reopened from current facts; approval is conditional on the fingerprint. `TimecardContext.tsx` gates canonical correction append and sample receipt together. These are fictional local state and presentation boundaries, not verified server authorization. No Employee approve/finalize/reopen/export/payroll controls were introduced. Gross recorded-time and break definitions are retained. The refusal and receipt language matches the surface contract.

## Evidence integrity and verification limits

Fresh SHA256 comparisons matched the shipped HTML, all 15 PNG hashes in `captures.json`, every current source hash in `source-diff.json`, all baseline source hashes, all frozen reference hashes, and all four **local** metadata hashes. Eight modified files and five added files match the source manifest. Read the complete modified-file diff plus all five added modules, the existing timecard model, shared primitives/styles, and relevant modal code. No source edits were made during this review.

Inspected existing `chromium/results.json` and its producer `timecard-history-next.cjs`: 41 recorded checks, zero listed failures/errors, tied to the reviewed HTML hash. The assertions cover keyboard disclosure, period semantics, refusal/success, control geometry at 320/390/430/884px with Light/Dark and 200% root text, and visible focused review/receipt headings. The 430/884 visual claim is limited to those recorded geometry checks; the supplied original image set has no corresponding full visual captures.

Also inspected `independent-qa/browser-qa.cjs` and the Chromium/WebKit/Firefox result rows for snapshot Enter/Space operation, Escape exact-opener return, and 320/390/430 Light/Dark 200% layout/focus containment. The read result files reported PASS for those scenarios at the same HTML hash. These are corroborating recorded runs, not runs executed by this reviewer. Broad QA may continue independently; this report does not certify all regression suites, real devices, screen readers, production security, data durability, or whole-application parity.

## Inspected artifact inventory

- `work/employee-mobile/evidence/timecard-history-pass/{surface-contract.md,baseline.json,source-diff.json,captures.json,feature-green.json,model-results.json}`
- `work/employee-mobile/evidence/timecard-history-pass/before/src/` versus all current changed/added sources listed in `source-diff.json`
- `work/employee-mobile/src/{Timecards.tsx,TimecardHistory.tsx,TimecardAccess.tsx,TimecardContext.tsx,TimeCorrectionForm.tsx,Hours.tsx,timecard-model.ts,timecard-access-model.ts,timecard-history-data.ts,timecard-correction.ts,Timecards.css,App.tsx,model.ts,session-model.ts,ui.tsx,tokens.css,Appearance.css,components.css,layout.css}`
- `work/employee-mobile/{AGENTS.md,DESIGN.md,PRODUCT.md,package.json,timecard-history-next.cjs}`
- `work/employee-mobile/references/{manifest.json,DESIGN.md,PRODUCT.md,work--owner-mobile--styles.css,work--owner-mobile--template.html}` (template integrity verified; design/style text inspected)
- All 15 original PNGs enumerated above; contact boards were not needed for the verdict.
- `work/employee-mobile/evidence/timecard-history-pass/chromium/results.json`
- `work/employee-mobile/evidence/timecard-history-pass/independent-qa/{browser-qa.cjs,chromium-results.json,webkit-results.json,firefox-results.json}`

**Bounded ship/fix verdict:** ship this local Timecard history UI slice at the verified SHA from a design-system fidelity perspective. No UI fix is required by this review. Keep the separate functional/regression gate and production integration boundaries intact.
