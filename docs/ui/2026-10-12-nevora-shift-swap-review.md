# NEVORA shift swap / Choose a shift

Implemented locally on `codex/nevora-shift-swap-20261012`, based on single-company source `8950786c898fcb137ff6bbb8c58bf3508f4146f3`. Owner: this Codex chat. No production deployment or external sending occurred.

## Changes

`/app/exchange/swap` now shows the eligible shifts as native radio rows, sorted by date, time and employee. No assignment is preselected. Each row retains employee, location, position, designated-lead responsibility and time zone. Overnight and 24:00 end times explicitly identify the following date.

Desktop keeps the offered shift beside the available choices. Mobile uses a native source-shift disclosure so choices appear sooner. Optional trade guidance uses the same plus/minus disclosure treatment. Selecting a shift reveals the complete You give / You receive review and binds the reviewed target episode and fingerprint to the existing form. Sending the request is explicit consent; a saved request links to Shift requests for its current status. The empty state offers the existing coverage route.

The visual system matches the approved orange treatment in the chat “Redesign shift exchange review” (`01a12fdd-f21e-7b93-919d-351f47fa70d3`). Its `src/app/typeface-theme.css` and rendered employee review supplied the reference: #ED724C actions, #D8613C hover, #9F3821 accent ink, #111827 charcoal rail and text, #FAFAFA canvas, white surfaces, pale orange navigation and 18px panels. Local Inter, JetBrains Mono and Phosphor icons remain. Actions now use the reference's pill geometry. The official logo assets remain.

The theme is scoped to the shell containing `.swap-page`, so it also colors the navigation, mobile role badge, focus states and profile avatar while this route is visible. The swap controls use those shared design tokens. At 900px and below, the source summary becomes a compact disclosure to preserve readable choices beside the desktop rail and on mobile. Brief GSAP review entrances honor reduced motion and clean up when selection changes.

## Research

- [Blue Apron mobile selection](https://mobbin.com/screens/84b950f3-5ad2-42cc-bf2b-a2767fc11c0d): labelled selection rows and a clear next action.
- [Calendly selection and review](https://mobbin.com/screens/f0fcefe2-a06a-4214-8fe2-7b0cbfa8a6bc): persistent context beside the next action.
- [21st Choicebox](https://21st.dev/@halaska-studio/components/choicebox): selectable rows with supporting detail.
- [21st Radio Group](https://21st.dev/@originui/components/radio-group): compact native selection structure.
- [21st Segmented Progress Pill Stepper](https://21st.dev/@shadcnspace/components/stepper-04): an option shown during research; the implemented flow keeps selection, review and send on one page.

Mobbin images were inspected. 21st options were shown using its search picker. No paid component retrieval, hosted generation, or marketplace implementation was used.

## Controls and evidence

The server still enforces current session permissions, source ownership, published status, business date, displayed-term equality, target eligibility and current fingerprints. The existing operation identity, duplicate-submit prevention, uncertain-outcome reconciliation, offline guard, conflicts and stale-term refresh remain in ShiftChangeForm. Its optional resolved destination affects the swap receipt only; other callers retain their existing feedback.

Product/experience position: keep the trade understandable on one page, with details available before consent. Engineering/security position: retain the existing readers and mutation controller. Governance position: local evidence supports this bounded redesign; integration and production approval remain separate gates. No policy exception was introduced and no independent audit closure is claimed.

Checks actually run:

- 42 tests passed across swap page, overnight summary, form state, exchange actions and command parsing.
- Type checking passed.
- ESLint passed on every changed TypeScript/TSX file.
- Next.js production build passed.
- 29 browser checks passed on the final orange candidate across Chromium and WebKit at 1440, 1024, 768, 390 and 320px. These cover the reference palette on canvas, navigation and mobile role badge; orange selected rows and pill actions; no default consent, touch targets, overflow, keyboard focus and radio arrows, target fingerprint updates, native source/help disclosures, reduced motion, offline rejection, empty-state coverage navigation, and a real request saved once with a status link.
- Browser runtime errors: zero in the final run.
- DESIGN.MD font findings were fixed by using the approved font-family names. No design warning was suppressed.

The browser environment runs the actual Next.js route and actual login/actions against ownership-marked disposable PostgreSQL through the repository's existing test DB adapter. Push delivery is disabled. It does not certify production Neon transport, physical iOS/Android devices or hosted release behavior.

Earlier test runs exposed a navigation cancellation while leaving Home and a multiple-element test selector. The final harness uses the allowed Shift requests login destination, then opens the swap route; it retains strict runtime-error assertions. No application authorization or assertion was weakened.

## Handoff

The implementation remains on its isolated local branch. Integrate both the initial redesign and orange alignment commits with the other single-company UI branches before deployment; rerun the integration candidate's checks if shared files change. Preserve any independently active work. Rollback is a revert of those commits; no database migration was added.

User-facing preview, screenshots and browser evidence are saved in this chat's `outputs/shift-swap` directory. The temporary local preview uses fictional employees. Its database and server are owned by `work/swap-browser-qa.mts`; stopping that process calls the repository teardown and stops its owned PostgreSQL cluster.
