# NEVORA employee directory implementation

Jose approved the compact directory with the recommended table and segmented control on 2026-10-12. This implements `/app/employees` on the single-company development checkpoint `191fbc38e68d70c2dfe0809dffbdb63eb962b1b7` in isolated branch `codex/nevora-employee-directory-20261012`.

## Behavior

The initial view retains active and inactive employees in the existing source order. Name/employee-ID search combines with access-role, primary-location and All/Active/Inactive filters. Counts, explicit no-match feedback and Clear filters explain the result. Add Employee and the encoded View Profile destinations remain unchanged. Phone formatting, role labels, inactive employee status and inactive primary-location labels use existing data and helpers.

`requireRoles(MANAGER_ROLES)` still runs before employee/location reads. No employee or location mutation, database contract, login contract, notification delivery or production configuration was changed.

The native GET form is enhanced with `FormData(form, submitter)` and Next router transitions. This retains the clicked status value, applies pending input values together and keeps URLs/Back useful. The installed Next 16.3.8 enhanced Form helper omits submitter values, so the small form wrapper performs serialization explicitly. Inline pending feedback covers delayed reads. No route-level loading boundary is used because the tested streaming fallback hid resolved rows without JavaScript.

The route error boundary calls the installed Next 16.3.8 `retry` prop to refetch the failed server data. Failure feedback remains generic. Desktop uses a semantic table with aligned columns. Mobile uses stacked rows, visible actions, long-content wrapping and 44px targets. WebKit native selects have an explicit 48px height because its menu controls ignored `min-height`.

## Design

Authority: the retained `/Users/josek0514/Documents/Codex/2026-10-11/d/work/reset-access/checkout/DESIGN.MD`, found through the chat **Find redesigned NEVORA pages**. Its approved portal system overrides unrelated marketing layouts/font suggestions in the inspiration skills.

Use Inter and JetBrains Mono from the existing locally bundled font assets with their SIL licenses, regular Phosphor task icons, 18px panels, 17px controls, white panels, `#FAFAFA` canvas, `#111827` ink, `#4B5563` supporting text, `#D1D5DB` borders, `#ED724C` primary actions with charcoal labels and `#9F3821` small action links. The scoped stylesheet applies the approved dark rail and neutral presentation while the directory is present. Shared navigation structure and official brand assets remain intact.

GSAP uses a brief 6px entrance with content initially visible. The status thumb and controls have short transitions. Reduced motion removes travel and transitions. Navigation and native filtering remain available without JavaScript.

References inspected:

- [Square team directory](https://mobbin.com/screens/42858659-a933-4138-8494-a62a18d078d3)
- [Calendly organization directory](https://mobbin.com/screens/4be5c2e5-5478-4b3d-97af-b4e0fbd288d7)
- [LinkedIn mobile member list](https://mobbin.com/screens/78fbbff0-db36-47f6-a6b8-fe7731dbfeae)
- [21st Table with Filters](https://21st.dev/@felipemenezes098/components/table-12)
- [21st Segmented Control](https://21st.dev/@halaska-studio/components/segmented-control)

These informed the local implementation. No paid 21st component source or generation was retrieved. Added dependencies use the existing approved NEVORA pins: `@phosphor-icons/react` 2.1.10, `gsap` 3.15.0 and `@gsap/react` 2.1.2.

Impeccable's two `overused-font` findings for Inter at lines 2 and 28 are sanctioned exceptions to its generic typography preference. The approved DESIGN.MD requires Inter. The hook CLI recorded `overused-font=inter` in `.impeccable/config.json`, scoped only to `src/components/employee-directory.module.css`, with Jose's approved direction as evidence. No entire file or rule was ignored. The subsequent detector run on this stylesheet returned `[]`. No UI code changed during this triage.

## Evidence and limits

Evidence directory: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-22/outputs`.

- 32 targeted tests passed across directory filters/page, existing employee actions, profile, new-employee page and display helpers.
- ESLint, TypeScript and Next production build passed.
- 35 actual application browser checks passed in Chromium and WebKit. Each engine covered 320/390/430/768/1024/1440px, native filtering, combined filters, keyboard/focus, Back, no matches, profile/add-employee navigation, reduced motion and no JavaScript. Additional checks exercised long names, narrow desktop reflow, normal GSAP, delayed reads, a real injected SQL read failure with retry and Manager/Employee access boundaries.
- The fictional, ownership-marked local PostgreSQL fixture ran the checked-in schema sequence. The application mirror substituted only `src/lib/db.ts` with the existing owned local transport. Its manifest records hashes for application source and assets. External sending was disabled. The original production DB module was unchanged.
- The final directory flow had zero unexpected runtime errors. The deliberate read-failure test recorded its expected development error separately.
- The broader login-to-dashboard flow recorded two WebKit request diagnostics for the existing Action Center/Clock Monitor during navigation. Those observations are retained in `dashboard-navigation-observations.md`; their source was not changed. The final fixture signs in through the existing allowlisted schedule return path, then tests the directory.
- npm audit reports five high-severity development-tool dependency entries. Every affected installed version is identical to the baseline lockfile. The new icon/motion dependencies are not among those entries. Details are in `dependency-audit-summary.json`. No force upgrade or audit suppression was performed.
- Verification used desktop browser engines and emulated viewports. Physical iOS/Android devices and production data were not tested. The full repository suite was not rerun; the targeted suite and build cover this bounded change.

## Handoff

Product: the approved workflow and existing employee actions are retained. Engineering: the directory is separated into server data orchestration, pure filter logic, presentation, form enhancement and motion. Security: management authorization still precedes private reads, and no new external data collection was added. Governance: local evidence supports this change; deployment/integration and independent release acceptance remain separate.

Implementation owner: this chat. Customer data was not modified. Edits are local and uncommitted; no push, merge or deployment occurred. Apply the scoped files and pinned dependencies to the approved development integration source. Preserve other page redesigns and active worktrees. The source archive contains this change relative to the inspected checkpoint.
