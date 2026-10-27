# Employee mobile teal — Phase 1

Jose selected the new Owner concept's clean teal direction for Employee mobile, then authorized Phase 1 of `docs/execution/employee-mobile-phase1/plan.md`. This is an Operate surface: employees find their next shift, distinguish scheduled time from recorded punches, and review their own published week. This scoped decision supersedes older blue/Quiet presentation only for the implemented Employee/Lead mobile surfaces; it does not replace global DESIGN.MD or authorize management capabilities.

## Implementation boundary

`src/components/employee-mobile/mobile.css` owns the semantic palette, typography, spacing, radii, target sizes and focus. The actual `#employee-mobile` root is present only for Employee/Lead. Media rules share `useEmployeeMobile`'s767px breakpoint and coarse short-landscape query. A responsive active marker fences the legacy E5/Quiet shell chrome; desktop and other roles retain their existing CSS. Home and Schedule have explicit page markers. Other Employee pages retain their incumbent content until their Phase 2 batch. Their shared navigation receives the new foundation.

Use system typography from the approved mobile prototype and the existing original NEVORA wordmark and regular Phosphor icons. Do not add a second icon library, ornamental imagery, gradients, fabricated facts or screenshot assets. The global local-font/Signature system remains the desktop authority.

## Semantic choices

- Canvas `#f4f7f6`, surface white, ink `#172622`, supporting ink `#5f6d68`, action teal `#0b6e69`, selected wash `#eaf4f1`. Dark canvas `#0c1817`, surface `#172725`, ink `#f5f2eb`, supporting ink `#b8b7b0`, action `#a9e2da`. Foreground/background pairs travel together.
- Shared type roles: title32px, section19px, body/action16px, supporting14px, nav12px, shift22px at the default root size. Leading and weights are tokens. Text uses rem so the implemented surfaces respond to root text enlargement.
- Spacing uses4/8/12/16/20/24/28/32px tokens. Standard content inset24px,20px on narrow phones; section gap28px. Cards16px, controls12px, small surfaces8px. Primary actions48px; interactive controls at least44px. Seven-day strips bleed to6px edges on320px phones to preserve44px day targets.
- Selected days use teal text on a wash, without an inherited dark disc. Status never depends on color alone. Navigation grows to three columns at125% and two at150/200%; ResizeObserver reserves its measured height. Full-page task sheets keep their existing navigation dismissal behavior.

## Component and data ownership

The adapter reuses AppShell, QuietHeader/Section/List/Row/Segments, EmployeeHomeActions and its private release controller, EmployeeTimePanel, EmployeeMySchedule, ShiftSheetRow and EmployeeWeeklyConfirmation. No parallel mock data tree or new server contract is introduced. Home's current/next shift comes from the published-assignment reader; clock status is an independent actual-punch read and remains useful with no planned shift. The location Clocker continues to record punches.

Schedule presents the page title, week chooser, view segments, day strip, canonical review state and own shifts. The native date field resolves an actual Monday week and selected day; Calendar sync retains its existing destination in the chooser. The heading is first in DOM order; a small presentation wrapper preserves the prior desktop bar position. Confirmation keeps its original operation ID, displayed revision and server authority. Only a fresh canonical read displays success; a lost response retries the original operation.

The Calendar fragment targets the disclosure itself, with a separate accessible panel-heading ID. This avoids the browser opening a closed ancestor before React hydrates and preserves the existing fragment URL and focus return.

## Reference and supply provenance

Approved prototype: `outputs/employee-mobile/index.html` in the design task workspace, SHA256 `06c548a89f01e46c687c1d7e0a961da01c74952d6b7bfff34a1f7459e2396469`. Screens are a composition reference; actual service states and policy remain authoritative. Existing Gusto/Homebase/Mobbin research is retained in the prototype and incumbent design records. This phase does not claim a new competitor audit or exact clone.

21st free metadata search informed compact native week controls (Date Picker7499, React Day Picker470, Compact Date Picker29180). Existing project/native primitives fit this task; no retrieved code, paid retrieval, package or hosted generation was added. CLI review availability and actual checks are recorded in the execution handoff. Independent review reports own their acceptance findings; this design record is not certification.


## Phase 2 response/detail continuation

Incoming swaps and own shift requests continue this scoped mobile system. One full-page detail presents status, the original reviewed shift(s), explicit response consequences, current permitted controls and native history disclosure. Unavailable immutable report terms remain unknown; never replace them with a changed live assignment. Swap withdrawal explains that both employees keep their current assignments; pickup withdrawal explains one unchanged assignment. The shared mobile navigation stays opaque in both themes so underlying task copy cannot bleed through.

No new design library or business engine. See `docs/execution/employee-mobile-responses/HANDOFF.md` for exact tested candidate, independent findings/closure, supply provenance and remaining gates. This continuation does not certify the remaining Phase 2 workflows.
