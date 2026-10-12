# NEVORA time off: employee submission and manager review

Implemented locally on `codex/nevora-time-off-20261012`. Base: consolidated development-derived NEVORA candidate `ba5ed01716745ae4abad29fe63693a3be7f6cbfd`. Changes are uncommitted, unpushed and undeployed. The primary checkout and other active redesigns were preserved. This branch is an isolated local clone of the consolidated candidate, not an adoption onto the separate single-company branch.

## Scope and source of truth

`DESIGN.MD` in this candidate governs the shared portal: bundled Inter, orange `#ED724C`, charcoal labels, white panels, `#FAFAFA` canvas, 18px panel corners, the dark navigation rail, Phosphor icons, and restrained motion. Its workforce-specific instructions take precedence over the marketing layouts, random font substitutions, marathons of scroll effects, and photographic filler in gpt-taste. Mobbin's gallery-white surfaces, neutral hierarchy and pill controls were adapted to NEVORA's approved orange palette.

Product position: clarify when an employee needs to be away, what will be sent, and where the decision appears. Manager review keeps request facts and the decision together. Engineering position: scoped presentation components and CSS reuse the existing server actions, role checks and data access. Governance position: local verification only; no policy, schema, production data, notification delivery, credentials or release gate was changed. Owner for implementation: this time-off redesign chat. Release impact: CONDITION; adopt onto the chosen current integration branch and run its gates before release. No independent certification is claimed.

## Implemented behavior

- Employee submission: full/partial-day segmented controls, paired native dates, a single date for partial-day requests, time validation, optional note and character count, live date/day/time summary, clear manager-review explanation, cancellation and submission with pending feedback.
- Employee history: existing statuses and notes, request count, confirmed pending-request withdrawal inside a native disclosure, and a useful empty-state action. Approval remains green; pending stays neutral; cancelled requests read Withdrawn.
- Manager review: Pending/Approved/Declined navigation, readable employee initials and name, dated request facts and notes, direct Approve/Decline actions, disabled decision controls and live pending feedback while saving, and compact mobile rows.
- Accessibility: native labels and fieldsets, 16px input text, visible focus, status/error semantics, 44px or larger action targets, date constraints, and reduced-motion support. Full-day server-form submission continues to work without JavaScript.
- Motion: a scoped 8px GSAP heading entrance lasting 0.45 seconds; controls remain immediately available. Context cleanup and reduced-motion changes are handled with useGSAP and matchMedia. No looping motion or scroll pinning was added to the workflow.

Existing server actions, authorization/session proofs, ownership, request identity, transactional notification recording, idempotency, withdrawal identity/retry behavior, history reads and targeted request focus are retained.

## References inspected

- [Square time off](https://mobbin.com/screens/66b2cecc-ada6-4722-8721-774d2e4fa6c8): clear time-off page hierarchy and an explicit empty state.
- [DoorDash Merchant date range](https://mobbin.com/screens/ec339b80-6f35-4d98-93d9-f73fd2ebe64b): date selection alongside an understandable preview and a dedicated footer action.
- [Mindtrip mobile dates](https://mobbin.com/screens/8de1b07b-b2b0-42d2-97bd-2b2c8290e2fb): selected range above a compact date surface and a clear action.
- [Plain request inbox](https://mobbin.com/screens/fa888f77-f234-4694-9eba-9e64af24ac83): restrained rows, status hierarchy and readable request facts.
- [Toggl Track approvals](https://mobbin.com/screens/a5f75e44-7424-4951-9adb-12939c3b27bb): compact operational approval structure.

The 21st MCP server rendered the date and segmented-control options with search_picker:

- [Date Range Picker](https://21st.dev/@kuratlielia/components/date-range-picker), demo 35052.
- [Date Range Picker Card](https://21st.dev/@bidyut10/components/date-range-picker-card), demo 34578.
- [Calendar](https://21st.dev/@coss.com/components/calendar), demo 11389.
- [Calendar by Origin UI](https://21st.dev/@originui/components/calendar), demo 483.
- [Segmented Tabs](https://21st.dev/@micka_design/components/tabs-base), demo 26923.
- [Segmented Control Tabs](https://21st.dev/@cnippet-dev/components/segmented-control-tabs), demo 24931.
- [Segmented Control](https://21st.dev/@kuratlielia/components/segmented-control), demo 35020.

These are visual options, not imported code. No paid component retrieval, subscription or new dependency was used. Native date inputs preserve platform pickers and keyboard behavior. React's [official useFormStatus documentation](https://react.dev/reference/react-dom/hooks/useFormStatus) was checked through Context7 for the decision-button pending state.

## Evidence

- Before implementation: 20 focused tests passed across actions, page status/withdrawal grouping, withdrawal UI and withdrawal command validation.
- Updated implementation: 42 focused tests passed in 9 files; 12 PostgreSQL tests were skipped by their existing prerequisite guards in the no-database unit run. No assertions were weakened, tests removed, or snapshots updated.
- Browser verification: 41 checks passed, no browser errors. Chromium and WebKit checked employee and manager geometry at 320, 390, 430, 768, 1024 and 1440px. Real login/session/server actions used a new ownership-marked, fictional local PostgreSQL database.
- Observed actions: full and partial submission, persisted request details, pending submission feedback, confirmed withdrawal, approval and decline persistence, protected decision pending state, approved/declined history, targeted request focus, keyboard toggle/focus, invalid date/time feedback, error and empty views, long names, reduced motion and settled entrance. Native full-day submission was also exercised with JavaScript disabled.
- Typecheck and targeted ESLint passed. Next production build passed. The build emitted a non-blocking warning that a package lock outside this Git repository was ignored.
- The browser runtime captured file hashes before running and verified source bytes afterward. It substituted only the local PostgreSQL transport and generated development type-reference paths in a scratch mirror. This is working-tree evidence, not an exact-commit or production certification.
- PostgreSQL and the local Next app were stopped after verification. External requests and delivery were disabled. The sandbox's initial shared-memory denial was resolved by running the disposable test with approved execution permissions. Early harness failures were corrected before the successful run.

## Handoff

Changed files: `src/app/app/requests/page.tsx`, `time-off-form.tsx`, `time-off.css`, and `src/components/manager-time-off.tsx`, `time-off-review-actions.tsx`, `time-off-motion.tsx`.

The task's outputs directory contains desktop/mobile captures for both roles, partial-day/pending/error/history/empty captures, `browser-report.json`, this review and `nevora-time-off.patch`. Apply the patch onto a compatible consolidated candidate, resolve any overlap with the Requests Hub or other redesigns, and verify the resulting integration. The patch does not authorize merging to main or deployment.

Browser reproduction on this Mac: run `env -u DATABASE_URL node --import tsx ../verify-time-off.mjs` from this task's `work/time-off` clone. The harness is in the sibling `work` directory and uses the existing Engineering Toolkit Playwright package and the local PostgreSQL runtime. It creates and tears down only its marked local test data.

Physical iOS/Android devices, hosted environments, production delivery and the newer single-company integration were not verified. The next required action is review and selection of the integration destination; no production action was taken.
