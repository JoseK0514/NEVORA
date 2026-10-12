# Create Shift and Review Replacement

Implemented and locally verified on 2026-10-12. Owner: Codex, for Jose.

## Scope and source

Route: `/app/schedule/new`, including the current coverage replacement review mode. The isolated branch is `codex/nevora-shift-review-20261012`, based on development-derived integrated commit `ba5ed01`. The saved primary development checkout was older and lacked the approved Typeface styling and current replacement flow. No other chat's uncommitted changes were incorporated.

Application checkpoint verified by the browser fixture: `52ecfefba7419f1c658cb0f472f8eceb1b5aa8e3`. Implementation commits: `2bb8506`, `ca12e7e`, `52ecfef`. This handoff changes documentation only after application verification.

## Design decisions

The current `DESIGN.MD` and existing NEVORA portal establish Inter, JetBrains Mono metadata, Phosphor icons, white/neutral surfaces, orange actions with charcoal labels, and darker orange links. These explicit references govern the page. The gpt-taste skill informed spacing, typography restraint, contrast and GSAP motion; its marketing layouts and randomized fonts were adapted to the authorized operational task. Mobbin informed grouped event details, familiar native date/time inputs and clear mobile save hierarchy.

Research references:

- [Calendly event details](https://mobbin.com/screens/9ae87a91-8cdd-470f-990d-a04ecbafd55d)
- [Square date/time selection](https://mobbin.com/screens/241c60f9-e2fa-4e9a-a422-01aeffb99f58)
- [Google Health mobile timing](https://mobbin.com/screens/38f30c53-d4f4-4541-8202-ec2d25943fe2)
- [21st.dev Origin UI calendar](https://21st.dev/@originui/components/calendar)
- [21st.dev time picker](https://21st.dev/@preetsuthar17/components/time-picker)
- [21st.dev Origin UI dialog](https://21st.dev/@originui/components/dialog)

The 21st server's free catalog options were shown. No paid component source or new dependencies were retrieved. Native controls and existing NEVORA form/server boundaries remain in use.

Creation groups assignment and timing, retains optional positions, and adds a live draft preview with explicit overnight context. Replacement review shows the selected employee and labelled assignment terms, explains that saving addresses one requirement, and preserves current coverage refresh/recovery. Layout stacks on mobile; controls remain visible before JavaScript. GSAP adds a brief six-pixel detail entrance, with scoped cleanup and reduced-motion support.

## Preserved behavior and controls

Existing server authorization, session proof, qualified position choices, employee/Lead reset, trusted replacement token and terms, concurrency guards, revalidation and return destinations remain available. The optional assignment callback is additive. No database/schema, API, publication, notification or shared navigation changes were made.

The existing configuration form handles pending, domain errors and network errors, retaining mounted drafts. Native input requirements still apply. Existing backend handling of malformed or invalid time boundaries is retained; this redesign does not alter domain error routing.

## Verification obtained

- Baseline: 27 targeted tests and five browser observations before editing.
- Final: 37 tests in seven files, changed-file ESLint, TypeScript and optimized Next build passed.
- Final browser fixture: 52 checks, zero errors, using Chromium and WebKit at 320, 375, 390, 430, 768, 1024 and 1440 pixels. Both route modes fit without document overflow. Changed-page control sizes and Save action clearance were checked.
- Actual fictional ordinary and replacement saves each persisted one assignment with expected terms. Ineligible-location validation preserved the draft and wrote nothing. Stale replacement submission wrote nothing; reloading removed Save and exposed recovery. Pending disabled all fields; interrupted submission retained inputs. Empty selections, missing-location setup, keyboard focus and reduced motion passed.
- The owned loopback Next/PostgreSQL fixture closed its processes/database, verified immutable application source and verified mirror contents. External HTTP requests were blocked, sending features were disabled, and production credentials were not used.

Initial attempts are retained: cold navigation exceeded the original 15-second navigation window; a broad touch-target selector included inherited navigation; stale feedback assertions initially selected Next's empty route announcer. Navigation now has a 90-second bound, interaction assertions retain their 15-second limit, and selectors target the actual changed route/form feedback. No product assertions were removed to obtain the final pass.

Evidence lives in the task's `outputs/`: `review.html`, `component-options.html`, `final-browser-report.json`, per-surface geometry, final check/build logs, baseline captures and attempt reports. Full-content screenshots use taller viewports at each tested width so fixed navigation appears at the image edges; interaction/geometry checks use 1000px height and save/error scenarios use 844px. Only the Next development badge is hidden for capture.

## Delivery and next gate

Product/Experience: workflow grouping and visible next actions are implemented. Engineering: existing business and form boundaries remain intact. Program: implementation and local verification are complete. Governance recommendation: GO for design/code review; release impact CONDITION for the existing integration and release gates. No policy exception or risk acceptance is requested. This is executor evidence, not independent QA/UI certification.

No push, merge or deployment occurred. Visual acceptance belongs to Jose. Next gate: review these screens, integrate the isolated change with the concurrent schedule/coverage work, and rerun affected integration/release checks on the combined source. Rollback is to revert the three presentation commits in reverse order. Physical-device, screen-reader and production verification remain outside this local evidence.
