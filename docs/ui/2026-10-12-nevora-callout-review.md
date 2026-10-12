# Unable to work / Callout redesign

Owner request: redesign the existing employee callout page using NEVORA's structure, DESIGN.MD, Mobbin research, and 21st.dev options, with equal desktop/mobile priority. This is a local presentation change; no remote publication, commit, merge, production deployment, customer report, or notification is authorized or performed here.

## Change

`/app/exchange/callout` renders the shared CalloutView after its existing authenticated preflight. The view uses the portal's local Inter, Phosphor icons, orange/neutral CSS tokens, 18px panels, and 17px controls. Desktop pairs shift context and the form; mobile stacks them with full-width actions. A brief GSAP entrance affects only the heading and date context, with matchMedia reduced-motion cleanup. Fields remain stationary. All content is visible in SSR.

The canonical native SelectField retains all six reason values. Additional details remain optional except Other, retain the three-character detail validation and 300-character native limit, and now expose a conditional hint and character count. Cancel and request-status links retain their actual destinations. The assignment notice explains continuing responsibility, and the supporting copy explains management review and coverage after approval. No date picker changes the selected assignment.

The route's actor checks, ended-shift check using coherent server observation, reviewed episode/fingerprint matching, form controller, immutable operation ID, duplicate-submit guard, uncertain-outcome reconciliation, writer, policy, and server validation are unchanged. The client form preserves unsent entries across reviewed-term refresh. CSS is scoped to this page/form.

## Sources and decisions

The clean isolated source starts at central development candidate `ba5ed01716745ae4abad29fe63693a3be7f6cbfd`, on local branch `codex/nevora-callout-redesign-20261012`. The primary development checkout at discovery was older (`0516b7d`). Other active redesign checkouts were read only and remain untouched.

DESIGN.MD in the existing redesign source supplies the orange/neutral portal, local Inter, Phosphor, and compact workforce rules. The user's explicit workflow and reference rules override incompatible gpt-taste font randomization, marketing sections, carousels, and pinned scrolling. Deterministic seed 20261012 produced Artistic Asymmetry / Satoshi / inline-images, carousel, marquee / pinning, card stacking; those marketing treatments were not applied to this working form.

Mobbin screens inspected:

- [Remote request form](https://mobbin.com/screens/6408f281-7bb8-43ae-a6f0-195c4ab4fa68): grouped fields, concise guidance, separated actions.
- [Remote Global HR mobile details](https://mobbin.com/screens/27e7a839-fea8-4c52-94a1-563816ff1bc0): readable shift/request details and review progression.
- [Oyster time off](https://mobbin.com/screens/13e51021-c875-4645-9949-a08cb5429d3d): reason and optional-note hierarchy.
- [Deputy leave selection](https://mobbin.com/screens/8234a8ce-76f1-4715-a9ce-91c20a3cfa89): selected-context request hierarchy.

21st search_picker showed Segmented Tabs (26923), Segmented Control Tabs (24931), Segmented Control (35020), and Segmented Control (23552); Day Picker (10460), Calendar / React Day Picker (483), Calendar (34713), and Primitive Calendar (27371). The accessible selection and calendar presentations informed the comparison. Existing tests require the canonical native reason select, and this route already receives a selected shift, so the redesign reuses the incumbent controls. No paid component retrieval or new package was used. A later optional radio-card search timed out and was terminated.

GSAP scope and cleanup were checked against [the official React integration](https://github.com/greensock/react/blob/main/README.md) through Context7.

## Verification and custody

Executable evidence and screenshots are in the calling chat's `outputs/callout-preview`. `checks.json` records the exact test, typecheck, changed-source lint, and optimized build commands/results. The selected unit suite covers the page, action authorization/races, reason parser, shared select, view contract, and operation/reconciliation controller.

Browser QA uses the actual AppShell, CalloutView, ReviewedCalloutForm and ShiftChangeForm compiled with fictional action/navigation adapters. It proves rendered controls and presentation, not authenticated database integration. CUA exercised validation, pending, recorded, unavailable, stale-term refresh with preserved reason/note, uncertain-outcome reconciliation, keyboard focus, cancellation, and status navigation. Measurements at 320/390/768/1024/1440px include long location text, overnight context, no horizontal overflow, a one-line H1, 16px fields, 52px primary controls and at least 44px links. Native text input stops at 300 characters; programmatic fill can exceed HTML maxlength and was not mistaken for native entry. Final fresh-tab console checks contained no warnings or errors.

The QA adapter initially had a duplicate React instance and a Next image runtime import; both fixture issues were corrected. The image fixture's dynamic source was made explicit to resolve a static hook finding, and the real NEVORA logo assets loaded successfully. The final hook flagged the existing shared Inter font as overused. DESIGN.MD explicitly requires Inter and Jose requested alignment with it, so `impeccable hooks ignore-value overused-font Inter --shared --reason ...` persisted that single sanctioned value exception in `.impeccable/config.json`. The hook remains enabled with no ignored rules or files. No runtime typography change was made. Impeccable context also reported a stale design sidecar; it was left untouched because refreshing it is a separate documentation task. The build emits an existing ancestor lockfile warning; it does not fail. Offline npm installation lacked one cache entry, so a local copy of the source's existing dependencies was used.

Live authenticated PostgreSQL, physical phones, screen-reader certification, JavaScript-disabled submission, and runtime reduced-motion preference switching were not exercised. The reduced-motion branch is implemented and source/build checked; the browser interface did not expose media emulation. No independent acceptance or production readiness is claimed. Local integration/review is the next gate; production authorization remains Jose's.

Product position: focused, understandable reporting with preserved policy. Engineering position: presentation-only scoped change with incumbent mutation machinery. Governance position: GO for local review with authenticated integration as a separate condition; no exception requiring Jose was introduced. Implementation owner: this chat. Edits remain uncommitted.
