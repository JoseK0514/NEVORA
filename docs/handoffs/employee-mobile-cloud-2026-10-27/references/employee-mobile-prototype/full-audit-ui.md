# Employee mobile — independent UI/UX audit

UI recommendation: **NO-GO** for declaring this artifact fully UI-ready across the requested responsive/text-size scope. Clone-fidelity recommendation: **REQUEST_CHANGES**. The ordinary-size design is coherent and follows the approved Owner-derived system; one HIGH enlarged-text collision remains. This is an audit, not implementation, deployment approval, or complete Employee feature certification.

## Reviewed artifact and method

- Artifact: `outputs/employee-mobile/index.html`. Independently computed SHA-256: `68aad106fa42dd4bcdf7dafb2e521561e15868e4cf607d810906244c7f9ff0ab`.
- Scope: all 20 root scenes, including public legal/support, signed-out, missing-receipt, and optional Pay screens; existing approved teal system, no proposed redesign.
- Read `work/employee-mobile/AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, package configuration, frozen Owner reference manifest and stylesheet, current shared UI/layout/token source, Calendar/More/DeletionResult source, and the independent UI oversight skill.
- Visually inspected all **20 contact boards** plus **47 individual original Chromium images**: 390px Light/100% top and 320px Dark/200% top for every scene (40), Dark/320/200% bottom for Calendar, More, missing receipt, Notifications and Requests (5), and Calendar/More interior captures (2). The appendix identifies every image unambiguously.
- Boards provide comparative breadth, not full-resolution certification of all 238 manifest originals. 200% images are viewport segments, not full-page screenshots. Wider 884px captures are review-frame/app crops, not 884px-wide app layouts.
- Inspected supplied Chromium 200-case and WebKit/Firefox 60-case-per-engine measurement JSON only after independent visual review. All three supplied matrices report zero document/scroll-container overflow, small targets, and contrast entries; that did **not** catch the visible Calendar collision. These are supplied measurement results, not tests executed by this reviewer.
- Compared current `src` bytes with corresponding supplied `before/src` files: no changed existing source files found. No patch/full implementation diff was supplied for this audit. The workspace root is not a Git repository; no branch, commit, or deployment state is certified. No notepad path was supplied.
- No browser, detector, context collector, build, test, API, native-device, keyboard, or screen-reader execution was performed by this reviewer. No source, fixture, reference, or metadata changes were made.

## Findings by severity

### CRITICAL

None established in the inspected evidence. No screenshot or raster image substitutes for the UI in the inspected component tree.

### HIGH — ISSUE / BLOCKER UI-01: Calendar link status obscures the heading at enlarged text

**Visible result:** at 320px, Dark, 200% text, the `Not created` status is painted over the middle of `Your calendar link`. The word `calendar` is visibly obscured. This is an actual text collision, not merely a narrow intrinsic box, a top-of-viewport crop, or expected scrolling.

**Primary evidence:** `work/employee-mobile/evidence/full-audit-20261026/chromium/calendar-inner-text200.png`. Compare the intact standard layout in `chromium/calendar-light-390-text100.png`. The original top and bottom 200% captures do not expose this interior heading; they alone could not establish its correctness.

**Code:** `work/employee-mobile/src/Calendar.tsx:38` places icon, heading, and Status in the same header; `work/employee-mobile/src/Calendar.css:3` allows wrapping, but `:5` gives the heading `flex: 1; min-width: 0` without a sufficient readable minimum or a separate status row. The result shrinks its layout box below the unbroken word width while the status remains alongside it. `src/components.css:31` supplies the badge treatment.

**Corroboration:** `chromium/inner-layout.json` reports the title box at x75–124.83, title text extending to x212.86, and the status at x136.83–279 with vertical overlap. The screenshot independently confirms that geometry manifests as obscured text.

**Required closure:** preserve the existing tokens and components while allowing the heading and status to occupy nonoverlapping space at 320px/200%. Capture the header after scrolling it into view; verify all link status labels (including longer pending/revoked labels) in Light and Dark. Recheck the normal 320/390/430 layouts. A clean outer-overflow count alone is not closure. This report does not prescribe a new aesthetic or implement the fix.

### MEDIUM

No additional material defect established from this bounded visual sample. This does not certify all transitions, overlays, dynamic content, or mid-scroll regions.

### LOW — ISSUE UI-02: Missing-receipt copy promises legal information “below” that is not directly present

`work/employee-mobile/src/DeletionResult.tsx:10` says, “Support and legal information are available below.” The missing-receipt screen renders only `Open support` and `Done`; it has no direct legal links below the text. Support can lead onward to legal information, so this is a small wayfinding mismatch rather than a blocked task.

**Evidence:** `chromium/deletion-result-light-390-text100.png` and `chromium/deletion-result-dark-320-text200-bottom.png`. Adjust that sentence to reflect the actual support destination, or expose the intended existing legal destinations. No new visual treatment is needed.

## Verified design-system and information strengths

**VERIFIED — Real component structure.** `src/ui.tsx:3–42` defines live Icon, Button, Heading, Section, Row, Status, ViewSwitcher, Field, Select and Receipt primitives. Current Calendar, More and DeletionResult import and compose them. `src/App.tsx:194` uses an image for the official wordmark only; the source scan found no UI screenshot/background-image/canvas substitute. This is a real React interface, not a pasted reference picture.

**VERIFIED — Shared visual foundation.** `src/tokens.css:2–50` centralizes the 23 Light color roles, spacing, typography, radii and control dimensions; `src/Appearance.css:1–25` scopes the 20-role Dark adaptation. The reviewed source consumes these roles for cards, rows, buttons, headings and statuses. Frozen Owner stylesheet values match the principal teal, canvas, ink, type and radius values. Shared CSS retains optical/structural numeric dimensions, including icon sizes and approved 18px button padding; their mere presence is not evidence of an independently hardcoded replacement design system. Exact pixel identity to an unprovided Owner screenshot is not claimed.

**VERIFIED — Hierarchy and consistency.** The 390px originals keep the same wordmark/header hierarchy, page and section roles, pale canvas/white card relationship, rounded control family and regular line icons. Dark retains the hierarchy and layout with centralized color substitution. Tasks are grouped under plain headings rather than decorative hero content or dashboard metrics.

**VERIFIED — Employee-facing meaning in reviewed states.** Home distinguishes scheduled work from recorded clock status and points to the location Clocker. Hours labels punches/breaks and after-break durations. Requests uses textual Approved/Declined statuses and sends correction work to Hours. Notifications directs users to current records; Updates distinguishes review/read status. Calendar explicitly says a sample link is not a working feed. Device alerts distinguishes sample setup from real browser permission. Passkeys labels records as fictional. Signed-out explains that ending the sample does not clock out or change a real session. Pay document content is explicitly fictional and not proof of payment. No coworker approval/admin/payout controls appear in the reviewed root scenes.

**VERIFIED — More intrinsic-width flag is not a visible collision.** `chromium/more-inner-text200.png` shows a fully readable Notifications label and separate chevron. Its measured text extends about 5px outside its own copy box, but not into the chevron at the same vertical position. Do not promote this measurement to a defect without contrary visual evidence.

**VERIFIED — Expected enlarged-text reflow.** The 200% originals show stacked navigation, wrapped buttons, split page titles and vertical scrolling. Requests' visible bottom statuses stay separate from their text. Long page words such as Notifications and subscription break across lines rather than disappear. These wraps, the large navigation footprint, and text cut at a viewport scroll boundary are not independently classified as failures. Bottom captures support reachability of the captured final regions; they do not establish every intervening region.

## Scene coverage

| Scene | Independent visual assessment |
| --- | --- |
| home | Own shift and recorded status have clear priority; planned and recorded facts remain distinct. |
| schedule | Date-led grouped rows and week control are consistent; schedule-review action is visible on board bottom view. |
| requests | New request, work tools and history are distinct; enlarged status rows remain readable in inspected bottom original. |
| hours | Recorded/timecard/correction selector is coherent and stacks at 200%; entries label after-break time. |
| more | Account/work/help grouping is consistent; interior Notifications flag is not a visible failure. |
| notifications | Search/filter/action rows stay distinct; long enlarged heading wraps; bottom explanatory copy and refresh remain readable. |
| updates | Team/publication context and textual read states are clear in the displayed list. |
| profile | Identity, local preferences, work details and help/legal grouping remain consistent. |
| calendar | Ordinary view is coherent; **HIGH interior heading/status overlap at 200% blocks approval**. |
| device-alerts | Primary setup, secondary defer action and permission/setup distinctions are legible. |
| passkeys | Account sign-in context, own saved item and sample add action are explicit. |
| delete-account | Identity/consequences/confirmation order is understandable; no false completed-deletion state in reviewed view. |
| support | Contact, help topics, mailing address and public links use the same system. |
| privacy | Versioned public document with topic disclosures; expanded legal content not visually inspected. |
| terms | Versioned public document with topic disclosures; expanded legal content not visually inspected. |
| account-deletion | Public information clearly states that the preview cannot submit a real request. |
| signed-out | Explicit sample-session end, restart and public links; no false real logout claim. |
| deletion-result | Honest missing-receipt state; **LOW “legal information below” wording mismatch**. |
| pay | Published statement grouping, time access and sample PDF warning are clear; no real earnings amounts. |
| pay-document | Readable own sample metadata/text preview and deliberate sample-download action. |

## Risks and exact unresolved scope

**RISK:** these root captures do not cover every loading/error/empty/recovery state, expanded disclosure, modal, focus transition, real-device safe-area/keyboard situation, or data variation. Source intent and supplied machine reports cannot certify these visually. Public legal facts were reviewed for presentation and consistency only, not for legal correctness. Other independent QA may provide additional evidence; it must remain separately attributed.

**RISK:** WebKit and Firefox matrix data were read, but their screenshot pixels were not visually reviewed by this reviewer. No claim of their visual equivalence is made. The reported 238 original manifest captures were not all individually inspected.

**BLOCKER:** UI-01 must be corrected and directly reverified before full UI readiness or clone-fidelity approval. UI-02 is a nonblocking clarity issue. No user permission or redesign decision is required to make a bounded correction within the approved system, but this auditor made no correction.

## Evidence appendix

All image paths below are relative to `work/employee-mobile/evidence/full-audit-20261026/`.

All 20 boards inspected: `boards/{scene}.png`, where scene is each of: `home`, `schedule`, `requests`, `hours`, `more`, `notifications`, `updates`, `profile`, `calendar`, `device-alerts`, `passkeys`, `delete-account`, `support`, `privacy`, `terms`, `account-deletion`, `signed-out`, `deletion-result`, `pay`, `pay-document`.

For **each of those same 20 scenes**, these two individual original paths were inspected: `chromium/{scene}-light-390-text100.png` and `chromium/{scene}-dark-320-text200.png` (40 originals).

Five additional originals: `chromium/calendar-dark-320-text200-bottom.png`, `chromium/more-dark-320-text200-bottom.png`, `chromium/deletion-result-dark-320-text200-bottom.png`, `chromium/notifications-dark-320-text200-bottom.png`, `chromium/requests-dark-320-text200-bottom.png`.

Two interior originals: `chromium/calendar-inner-text200.png`, `chromium/more-inner-text200.png`.

Data inspected: `captures.json`, `chromium/inner-layout.json`, `chromium/matrix.json`, `webkit/matrix.json`, `firefox/matrix.json`. No detector result or prior approval report was used as visual authority.

Reference/source files inspected are named throughout the report. Frozen provenance: `work/employee-mobile/references/manifest.json` and `references/work--owner-mobile--styles.css`. Independent review instructions: `/Users/josek0514/.codex/skills/nevora-independent-ui-oversight/SKILL.md`.
