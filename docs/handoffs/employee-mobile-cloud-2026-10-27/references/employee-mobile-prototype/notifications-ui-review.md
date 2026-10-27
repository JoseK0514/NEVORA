> **Current verdict after bounded recheck: APPROVE / ship (local prototype only).** Both F1 and F2 are resolved for HTML SHA-256 `f22cdd5636fb14f2c1da8c67d0e8de70348adea2475fcb2875599f0f03a3fcb7`. See the appended recheck below. The initial review is retained verbatim as historical evidence.

# Employee notifications and updates — independent finish review

## 1. Recommendation / disposition

**recommendation: REQUEST_CHANGES**  
**disposition: fix**  
Reviewed HTML SHA-256: `efdb6ba99b80909cfd20347015427ce1a22f5afb3784a12eb0967dc0fc39cbfc`.

This is an incumbent-system extension in Operate mode, not a new visual direction or a pixel clone of a new comp. The UI is real React DOM with reused primitives and the frozen Owner-derived Employee visual system. There is no screenshot substitution or material design-system divergence. One reproducible enlarged-text review transition needs correction before the finish pass; the no-expiration copy should be clarified in the same bounded patch. No application source was changed by this reviewer.

## 2. Visual hierarchy / fidelity evidence

Inspected `work/employee-mobile/AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, frozen `references/manifest.json`, frozen Owner CSS/template, the notifications plan and source-authority record, and the craft floor. Independently recomputed all five frozen-reference hashes: all match (`work/employee-mobile/evidence/notifications-review/reference-hashes.json`). The pinned system font and teal task UI take precedence over generic aesthetic suggestions.

Read all new notification/communication modules and the existing-file source diff, including App, More, model, Availability and ExchangePanel integration. The complete source delta inspected is preserved as `work/employee-mobile/evidence/notifications-review/inspected.diff` (472 lines). Inspected shared ui.tsx, tokens.css and component/layout rules. The local prototype workspace is not a Git repository; the read-only application checkout is clean and detached at `46e202786863279302026ee03a0e225c359fa55c`.

Independent Chromium computed values at 320/390/430/660px confirm: 20px page inset at 320px, 24px otherwise; 20px communication section gap; 32px heading; system typography; 22px row icons; 48px primary control minimum. The only rendered image is the official 88×12 wordmark. Rows, fields, articles, controls, selectors and review state are live elements. No horizontal overflow was detected at these widths. These measurements and five bounded interaction checks are recorded in `work/employee-mobile/evidence/notifications-review/independent-results.json`.

Visually inspected the current six public captures, plus focused 320px notification, 200% text detail/review and independent action captures. White header and tab bar, pale canvas, ink hierarchy, teal action family, amber review status, restrained separators and spacing agree with the incumbent design. Long article and review content use normal scroll rather than fake clipped imagery. At enlarged text the navigation reflows and reserves its space; bottom actions remain reachable.

Specific inspected render artifacts:
- `work/employee-mobile/evidence/notifications-pass/{notifications,updates,update-detail,team-compose,team-message-review,update-recovery}.png`, tied to the reviewed HTML by `captures.json`.
- `work/employee-mobile/evidence/notifications-pass/chromium/{notifications-320,required-text200-320,team-review-text200-320}.png`.
- `work/employee-mobile/evidence/notifications-review/{updates-430,ack-action-390,publish-action-text200-320,review-arrival-390-100,review-arrival-320-200}.png`.

## 3. Component / token / anti-slop findings by severity

**CRITICAL: none.** No rasterized application UI, screenshot overlay, background image substitute or fake control tree found.

**HIGH: none.** Reused Button, Row, Field, Heading, Section, Status, ViewSwitcher and Icon primitives drive the surface. New Communications.css consumes the established palette, spacing, typography and radii. A fixed 20px checkbox and inherited optical dimensions are consistent with the existing control system, not a parallel hardcoded theme. No decorative hero, giant metric, ornamental motion, generic card grid, emoji icon system or new palette found.

**MEDIUM: F1 — review starts with its focused heading offscreen at enlarged text.** `work/employee-mobile/src/CommunicationCompose.tsx:9` uses `heading.current?.focus({preventScroll: true})` after replacing the compose form with the review. It retains the lower form scroll position. At 320px and 200% text, the focused review heading is y=-900 to -801 while the scroll viewport is y=77.6 to 594.6. The visible arrival frame shows the end of the message and Publish/Edit controls; the audience, business date, recipient count and acknowledgement summary are above the viewport. This undermines the deliberate review step for enlarged-text users. At 390px/100% the heading is visible; the defect is responsive, not universal.

Reproduction: open Updates → set browser root text to 200% at 320px width → Message today’s team → enter title “Afternoon handoff” and body “Please leave the supply area clear.” → Preview audience. Do not manually scroll after the transition. Evidence: `work/employee-mobile/evidence/notifications-review/review-focus.cjs`, `review-focus-results.json`, `review-arrival-320-200.png`. Fix by revealing the start of the review as focus moves, while retaining the ordinary document flow. Regression should assert the focused heading is inside the scroll viewport, not just that it is document.activeElement.

**LOW: F2 — no-expiration copy resembles a completed withdrawal.** `work/employee-mobile/src/CommunicationCompose.tsx:14` displays “Available until” / “Withdrawn” for a draft with no expiration. In the publication review this can be read as a current state, conflicting with the pending Publish action. Use a future condition such as “Until you withdraw it,” or an explicit “No expiration.” Evidence: `work/employee-mobile/evidence/notifications-pass/team-message-review.png` and the source branch. This is a copy clarification; it does not indicate that the model actually withdrew the post.

## 4. Behavioral / permission / accessibility findings

Inspected the real application communication policy/service and notification authority anchors read-only at the stated development commit. The local model deliberately exercises a subset; it is not the production authorization implementation.

Confirmed source behavior: notifications resolve own current records; generic inbox Mark read is absent; opening does not acknowledge; required acknowledgement requires an explicit checkbox and exact revision/content match; informational Mark read is separate; only own eligible today-team posts can be withdrawn; no announcement editing, broad-audience selector, required-acknowledgement authoring or named coworker receipts are exposed. Current own published, unreleased assignment overlap permits team posting, including overnight overlap; module off/access denied suppress reads and actions. Unknown operations preserve their original identifier and payload, require a status step before replay and recheck model eligibility. No real messaging or external integration is present.

Read the complete focused runner and current Chromium/WebKit/Firefox result artifacts: each records 32 grouped cases, reviewed HTML hash, `failure: null`, empty runtime-error and external-request arrays. Those evidence records cover filters, exact source destinations, receipts, own withdrawal, validation, stale audience/revision, uncertain recovery, read states, widths and keyboard controls. They did not assert review-heading visibility, explaining why F1 escaped the suite.

Reviewer independently ran five bounded browser groups (all passed) covering required acknowledgement, live DOM/computed geometry, 320px/200% reachable publication, overnight/no-assignment compose eligibility and generic-inbox prohibition; runtime errors and external requests were empty. Also reran the 19 pure model assertions without modifying the incumbent test output: `work/employee-mobile/evidence/notifications-review/model-results.json`. Its `source_sha256` is the **communications-model.ts hash**, `d0523d4710b44c3a77c10584fa885fd4ca3f786dc5f23c9907e499fd8faa8d6d`, independently matched to that source. It is not an obsolete HTML hash.

Control labels, explicit text statuses, native checkbox, field errors, preserved focus ring and enlarged-text wrapping are appropriate. F1 remains the material accessibility/flow finding. Independent full screen-reader/device certification was not performed.

## 5. Limitations / next action

**Blocker:** fix F1 and recapture the compose → review transition at 320px/200% text. Confirm the heading and initial review context are visible, and rerun the focused regression on the rebuilt HTML. Clarify F2 while making this small patch. No redesign or rebuild of the design system is warranted.

This verdict is limited to the fictional, in-memory local prototype and exact artifact hash above. It does not certify durable idempotency, sessions, server authorization, production delivery, OS device notifications, native screen readers or persisted recovery. No credentials, API mutations, real customer messages, production source changes, deployment, commit or push occurred in this review. The executor can apply the bounded fixes without further user design decisions.

Primary report: `outputs/employee-mobile/notifications-ui-review.md`. Canonical reviewer artifact: `.omo/evidence/employee-notifications-clone-fidelity.md`.


---

# Bounded recheck — F1 and F2

## 1. Recommendation / disposition

**recommendation: APPROVE**  
**disposition: ship — fictional local prototype only**  
**blockers: []**  
Current HTML SHA-256: `f22cdd5636fb14f2c1da8c67d0e8de70348adea2475fcb2875599f0f03a3fcb7`.

Rechecked only the two prior findings and the directly affected compose-review transition. F1 and F2 are resolved. The original REQUEST_CHANGES above applies to the earlier `efdb…` build and is preserved for provenance, not the current disposition.

## 2. Visual hierarchy / fidelity evidence

Read the revised `CommunicationCompose.tsx:1`, `:9`, and `:14`; independently hashed the rebuilt deliverable and inspected the refreshed capture manifest. The transition now uses a layout effect to focus the review heading and reveal it with scrollIntoView. Expiration copy now reads “Expiration” / “No expiration.” The shared components, typography, icons, colors and spacing are unchanged.

Independent fresh captures show the review starts with its heading and audience context at 320px/200%, rather than showing publication controls first. At ordinary 390px, the complete review summary remains clear and the new expiration wording is unambiguous.

Inspected current artifacts:
- `work/employee-mobile/evidence/notifications-review/recheck-chromium-320-200.png`.
- `work/employee-mobile/evidence/notifications-pass/team-message-review.png`.
- `work/employee-mobile/evidence/notifications-pass/captures.json` (current HTML hash).
- `work/employee-mobile/evidence/notifications-review/recheck-{chromium,webkit,firefox}.json` (current HTML hash).

## 3. Component / token / anti-slop findings by severity

**CRITICAL: none remaining. HIGH: none remaining. MEDIUM: none remaining. LOW: none remaining in this bounded recheck.**

F1 (MEDIUM) resolved: independently reproduced compose → review at 390px/100%, 320px/200%, and 390px/200% in each of Chromium, WebKit and Firefox. All nine review headings are focused and fully inside the app-scroll viewport. Chromium 320px/200% geometry changed from heading y=-900..-801 to y=94..192.8 inside viewport y=77.6..594.6. Scroll position changed from 1433 to 439. No assertion was relaxed.

F2 (LOW) resolved: all nine reproductions independently asserted “No expiration” and absence of “Withdrawn” in the review details. The ordinary-width render confirms the pairing is clear.

## 4. Behavioral / permission / accessibility findings

Ran `work/employee-mobile/evidence/notifications-review/review-focus-recheck.cjs` separately against Chromium, WebKit and Firefox, with three viewport/text configurations per engine. Every run exited zero. The script asserts visible focused review-heading geometry and the corrected expiration copy, and writes screenshots and hash-bound JSON records.

Reran the independent five-group browser check against the rebuilt HTML; all five passed with empty runtime errors and external requests (`work/employee-mobile/evidence/notifications-review/independent-results.json`). Read the refreshed focused runner results for all three engines: each has the current HTML hash, 32 grouped cases, `failure: null`, `errors: []`, and `external_requests: []`. The strengthened enlarged-text case now explicitly checks focused heading visibility at 320px and 390px.

This was a bounded verification of two small UI changes; no new permission or model claims were introduced. The initial source-authority and local-only limitations remain applicable.

## 5. Limitations / next action

No further source correction is required by this review. The executor may present the rebuilt local prototype and current evidence. This approval is not authorization to deploy or integrate real communications.

The initial report remains verbatim. Historical failing geometry is preserved in `work/employee-mobile/evidence/notifications-pass/review-focus-before.json` and in the original report’s recorded measurements. The generic `notifications-review/review-focus-results.json`, `review-arrival-*` captures and `independent-results.json` were refreshed during recheck; they now describe the fixed build. Explicit `recheck-*` records are the authoritative final recheck evidence.

No application code was edited by the reviewer. Native-device/screen-reader, production authorization, persistence and delivery remain outside scope. All five required review contract sections are retained both in the original review and this final recheck.
