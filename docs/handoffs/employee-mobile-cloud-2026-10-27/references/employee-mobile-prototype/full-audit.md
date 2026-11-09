# Employee mobile: complete coverage and quality audit

**Full readiness: NO-GO.** The approved visual system remains coherent, but a confirmed enlarged-text defect and source-parity/interaction gaps remain. Continued fictional concept review is **GO WITH CONDITIONS**. This report completes the audit; it does not claim that its findings were fixed.

Artifact SHA-256 `68aad106fa42dd4bcdf7dafb2e521561e15868e4cf607d810906244c7f9ff0ab`. Application source: clean detached `46e202786863279302026ee03a0e225c359fa55c`, inspected read only. Prototype source/UI/design metadata unchanged; no branch/commit, PR or deployment. No new palette, font, component system or owner/manager change.

## Implementation integrity verdict

**PASS for the incumbent system; FAIL for complete Employee readiness.** Live React primitives, shared23Light/20Dark roles, system typography, Phosphor icons and44/48px controls are preserved. No raster substitute for UI was found. Impeccable’s one audit scan reports no findings.21st reviewed81files:0errors,0warnings,43 informational color suggestions; all43 point to the canonical23Light/20Dark token definitions, not consumer drift. No suppressions or auto-fixes were applied.

## Evidence and scope

-34 source-anchored workflow groups, with per-group gaps in [the coverage matrix](full-audit.json). Nineteen further source snapshots are hashed in the private audit manifest.
-320 fresh root-scene measurement cases: Chromium200 at320/390/430/884 Light/Dark plus320200%text; WebKit/Firefox60each at320/390 and320200%. No page/scroll-container overflow, sub44px measured buttons, unlabelled sampled controls, sampled visible-text contrast failures, page exceptions or outside-origin attempts. These checks do not certify all WCAG requirements or every intervening scroll region.
-238 original Chromium screenshots plus20contact boards, with separate top/bottom segments and six targeted inner-layout images across engines.884 evidence is a430px app crop from884×853; it is not an884px-wide app. The UI reviewer inspected20boards and47original Chromium captures, including the Calendar interior; not every original or WebKit/Firefox pixel was independently reviewed.
-36 new parent journey probes preserve mismatches as open audit evidence. Independent QA personally executed42additional scenarios:18PASS assertions,12FAIL assertions,12neutral observations; no errors/outside-origin attempts. Observations include actual partial-read success receipts and fixture breadth; they are not silently counted as passing acceptance tests.
-The prior419-per-engine suites remain matching-hash historical evidence. They were not rerun in this read-only audit and did not cover all newly reproduced gaps. Strict TypeScript and source-to-saved build comparison were run and passed again.
-StandaloneHTML679,083bytes; gzip267,740bytes. Performance score below reflects static/source review only; no throttled physical-phone/field benchmark. Browser contexts emulate mobile/touch capability, while journey actions use browser click/keyboard; native touch gestures/virtual keyboards/safe areas and screen readers were not certified. axe-core is not installed; custom DOM/contrast checks are a limited measured subset, not an axe or complete WCAG pass.

## Audit health score

| Dimension | Score /4 | Evidence and limit |
| --- | --- | --- |
| Accessibility |2| Calendar text obscured at200%; WebKit focus-return defects. No full compliance claim. |
| Performance |3| No expensive effect/continuous layout shortcut established; known bundle cost. No field benchmark. |
| Theming |4| Centralized Light/Dark roles, measured root variants and unchanged shared bytes; score at this tested scope only. |
| Responsive |2| Root geometry passes, but an interior Calendar collision blocks readiness. |
| Implementation integrity |3| Coherent product-specific components; some fixed/unwired source behavior remains. |
| Total |14/20| Good technical foundation. This score never overrides an open blocker or proves feature parity. |

Nine grouped issues:1P1,7P2,1P3. One separateP1integration risk. NoP0 established. Priority is user impact, not a claim of deployed severity.

## Prioritized findings

### EM-A01 · P1 ISSUE · Calendar status obscures its title at enlarged text

**Location:** `src/Calendar.css:3–6; src/Calendar.tsx:38`. **Type:** visual/accessibility.

The employee cannot read the complete calendar-link heading at320px/200%. **Reproduce/evidence:** Open page=calendar&appearance=dark at320×844, set200%root text and scroll Your calendar link into view. Not created covers calendar. All three engines reproduce text/status rectangle overlap; the screenshot confirms actual obscured text.

**Correction:** Let the heading and status use nonoverlapping rows or enough minimum width, using existing roles/spacing. Verify longer lifecycle statuses in both themes at200%, then normal320/390/430. **Standard/boundary:** Text resizing/reflow acceptance; WCAG1.4.4/1.4.10 relevance, not a complete WCAG audit. Suggested bounded playbook: `$impeccable adapt`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `chromium/calendar-inner-text200.png`, `chromium/inner-layout.json`, `webkit/inner-layout.json`, `firefox/inner-layout.json`.

### EM-A02 · P2 ISSUE · WebKit generic sheets lose exact-opener focus

**Location:** `src/App.tsx:40–60`. **Type:** interaction.

Keyboard and assistive-technology users lose task context when a pointer-opened sheet closes. **Reproduce/evidence:** Home shift Done/Escape; Schedule shift Done/Escape; Requests New request Escape; More Availability Escape. Independent WebKit run leaves BODY active in all six. Chromium/Firefox return to each exact opener.

**Correction:** Store/focus the actual invoking element for generic sheets; restore it on every close, with a logical fallback if removed. Keep native modal containment and existing special-flow returns. **Standard/boundary:** Project exact-opener requirement and modal-dialog focus pattern; no direct whole-WCAG compliance claim. Suggested bounded playbook: `$impeccable harden`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `independent-qa/webkit-results.json`, `independent-qa/webkit-trace.zip`.

### EM-A03 · P2 ISSUE · Closing time off silently discards an edited draft

**Location:** `src/TimeOffRequest.tsx:8–18; src/App.tsx:115`. **Type:** recovery/source parity.

An accidental Escape forces the employee to enter dates/note again. **Reproduce/evidence:** New request → Nov12–13 → enter note → Escape → reopen. Fields are empty in all engines. Frozen desktop time-off-signature.tsx:17–48 retains an owner-bound unsent draft.

**Correction:** Retain the own-session in-memory draft through dismissal/re-entry or offer a clear keep/discard choice; clear on explicit discard, submission and sign-out. Do not add private browser persistence. **Standard/boundary:** Source parity and error recovery; no invented automatic submission. Suggested bounded playbook: `$impeccable harden`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `independent-qa/chromium-results.json`, `independent-qa/webkit-results.json`, `independent-qa/firefox-results.json`, `independent-qa/source-contract.txt`.

### EM-A04 · P2 ISSUE · Notifications highlights More after opening from Home

**Location:** `src/App.tsx:197; source src/lib/navigation.ts:197–198`. **Type:** navigation.

The active tab disagrees with the entry point and the screen’s Home return. **Reproduce/evidence:** Home → bell. Notifications opens and More is current in all engines. Actual Employee navigation assigns Notifications to Home.

**Correction:** Keep Home current for Notifications, while preserving the alternate More entry and correct contextual returns. **Standard/boundary:** Canonical source navigation ownership and consistent wayfinding. Suggested bounded playbook: `$impeccable clarify`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `independent-qa/chromium-results.json`, `independent-qa/webkit-results.json`, `independent-qa/firefox-results.json`, `independent-qa/source-contract.txt`.

### EM-A05 · P2 ISSUE · Partial-data warning coexists with immediate review/submission success

**Location:** `src/Schedule.tsx:20–27,51–52; src/Requests.tsx:13,22; src/TimeOffRequest.tsx:39–45`. **Type:** state/content trust.

Employees cannot tell which information was verified before a consequential sample action. **Reproduce/evidence:** Supported state=partial → Schedule review/confirm or Requests New request/review/submit. All engines reach a success receipt while the refresh warning remains.

**Correction:** Make the unavailable domain explicit and recheck the action’s own current authority/source before proceeding; block only affected actions and provide truthful recovery. Keep unrelated capabilities usable. **Standard/boundary:** Visibility of system state; partial is not proof of revoked permission or a reproduced security bypass. Suggested bounded playbook: `$impeccable harden`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `independent-qa/chromium-results.json`, `independent-qa/webkit-results.json`, `independent-qa/firefox-results.json`.

### EM-A06 · P2 ISSUE · Schedule does not model the complete own-week and revision journey

**Location:** `src/Schedule.tsx:18–40; src/model.ts:57; source employee-weekly-confirmation.tsx:9`. **Type:** incomplete sample coverage.

The prototype cannot demonstrate reviewing republished/removed assignments, earlier weeks or uncertain/conflicting confirmations. **Reproduce/evidence:** Previous is disabled in the initial week; Next stops at the third sample week. Review stores a single current-week boolean. Source supports own past/future weeks and canonical revision-bound recovery.

**Correction:** Build own-week/revision/publication fixtures and contextual shift/open-shift entry points within the current list/detail system. Cover overnight/varied-duration/location data without inventing a Manager filter. **Standard/boundary:** Feature parity, not proof that current matching sample labels or production records are incorrect. Suggested bounded playbook: `$impeccable harden`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `source-audit.md`, `source-manifest.json`, `workflow-coverage.json`, `independent-qa/chromium-results.json`.

### EM-A07 · P2 ISSUE · Historical timecard decisions are unreachable and state is always Draft

**Location:** `src/Hours.tsx:46; src/Timecards.tsx:11,47; src/TimecardHistory.tsx:23`. **Type:** incomplete sample wiring.

Employees cannot review a populated own historical decision or see a canonical Approved/Finalized/Reopened state in the shipped journey. **Reproduce/evidence:** Hours → Timecards; every route supplies default empty history, and rendered state is a literal Draft. A separate tested history component is not root-app integration.

**Correction:** Supply explicit own fictional timecard state/history to the existing components; preserve read-only Employee snapshots and immutable punches. Do not expose management approval/finalization/export. **Standard/boundary:** Source feature/state parity; empty current sample history alone is not a production data-loss defect. Suggested bounded playbook: `$impeccable harden`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `source-audit.md`, `source-manifest.json`, `independent-qa/source-contract.txt`, `workflow-coverage.json`.

### EM-A08 · P2 ISSUE · Pay/device-test notices and source-week destinations are missing

**Location:** `src/notification-model.ts:3–12; src/Notifications.tsx:21; source employee-notification-list.server.ts:20,145 and destinations.ts:77`. **Type:** incomplete notification coverage.

Some authorized activity cannot be demonstrated or routed to its exact current source. **Reproduce/evidence:** The model accepts six targets only, omitting PAYROLL_STATEMENT and SELF_TEST. Every schedule target calls setWeek(0), regardless of its source identifier.

**Correction:** Add explicit source-backed own notice fixtures and exact destinations with current capability/source checks. Never invent a Pay notice merely because a document exists; queued test does not mean delivered. **Standard/boundary:** Source-specific notification parity; no generic Employee Mark read. Suggested bounded playbook: `$impeccable harden`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `source-audit.md`, `source-manifest.json`, `workflow-coverage.json`.

### EM-A09 · P3 ISSUE · Missing-receipt copy promises legal links below

**Location:** `src/DeletionResult.tsx:10`. **Type:** content.

Small wayfinding mismatch: only Open support and Done appear directly below. **Reproduce/evidence:** Open page=deletion-result without a receipt. Text says Support and legal information are available below; legal reading is reached through Support.

**Correction:** Describe the actual Support destination or expose the existing permitted legal links. No new treatment or legal claim. **Standard/boundary:** Accurate interface copy; independent UI LOW finding. Suggested bounded playbook: `$impeccable clarify`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `chromium/deletion-result-light-390-text100.png`, `chromium/deletion-result-dark-320-text200-bottom.png`.

### EM-R01 · P1 RISK · Time-off workplace feature gate is absent from the local model

**Location:** `src/Requests.tsx:22; src/Home.tsx:27; src/notification-model.ts:4–10; source requests/actions.ts:23–25`. **Type:** unmodeled authorization contract.

A future integration could expose time-off entry/actions/attention when that workplace module is off unless the source gate is explicitly carried through. **Reproduce/evidence:** Read model and Request/Home/notice projections: no timeOff capability exists, while source request routes and actions check module/session/proof. No unsupported query parameter is treated as a working off fixture.

**Correction:** Model the independent timeOff capability and its source-consistent menu/read/action/refusal behavior. Availability remains available. Verify current server authorization separately in a future authorized integration environment. **Standard/boundary:** Least privilege and actual source module contract; not a demonstrated server bypass. Suggested bounded playbook: `$impeccable harden`.

Private evidence paths relative to work/employee-mobile/evidence/full-audit-20261026: `source-audit.md`, `source-manifest.json`, `independent-qa/source-contract.txt`.

## What remains consistent

Own scheduled work and recorded time remain distinct; phone punching stays on the location Clocker. No Employee payroll execution, management approval, coworker account/device editor, broad announcement or named receipt controls appeared in inspected source/root scenes. Pay’s explicit module gates and marked sample downloads, read-only work details, own passkey/calendar/device lifecycle boundaries and local sign-out/direct-Pay refusal remain intact within their documented sample scope. This does not certify real server authority.

The source comparison also records narrower sample breadth: three Availability weeks, limited Home attention projections, pending time-off withdrawal without canonical conflict/uncertain receipts, and one eligible-location communications episode. These require coverage/integration work; a matching deliberately limited seed is not a fabricated wrong-record bug. No completion percentage is assigned to unequal workflow groups.

## Correction sequence

1. **Accessibility and shared interaction:** `$impeccable adapt` for Calendar, then `$impeccable harden` for exact-opener focus. Capture the actual interior status/title at200% for every status in Light/Dark; rerun native-dialog keyboard/focus scenarios in all engines.
2. **Permission and trust contract:** `$impeccable harden` for the independent timeOff gate and explicit partial-domain authority/refusal behavior. Preserve available Availability and unrelated tools; do not infer permission from navigation.
3. **Schedule parity:** keep the date-led design while adding own past/future/week/revision/publication state and canonical review recovery; retain original operations during uncertainty.
4. **Timecard and notification completeness:** wire read-only historical/state fixtures, exact source-week/Pay/device-test notices and current Home ownership; do not grant new management actions.
5. **Recovery and copy:** retain own unsent drafts, clarify the missing-receipt destination, then `$impeccable polish` only for the bounded changes.

Each correction needs a reproducing failing check, a minimal source change, affected regression checks, same-view recaptures and independent closure against the new artifact hash. This audit phase intentionally leaves findings open; no blanket green release or pre-approval flow is invented. The existing system remains the authority.

## Independent reports and unverified release gates

[UI report](full-audit-ui.md): **NO-GO / REQUEST_CHANGES** at its inspected source/image scope. [QA report](full-audit-qa.md): **NO-GO** for full parity/production and **GO WITH CONDITIONS** for local concept review. Reviewer claims are limited to the tests or images each report actually inspected. The UI role substitutes a clone-fidelity reviewer; no unavailable named Impeccable finish role or fabricated certification is claimed.

Live session/module/proof enforcement, real payroll/PDF/provider data, durable writes and uncertainty, actual notifications/WebAuthn/calendar behavior, physical devices and assistive technology remain outside this fictional prototype. No production credentials, native permission prompts, messages or customer data were used. This audit needs no user action to accept its findings; the next implementation should follow the correction sequence within the already approved visual direction.
