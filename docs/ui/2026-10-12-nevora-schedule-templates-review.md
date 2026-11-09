# Schedule templates redesign and handoff

October 12, 2026. Jose approved the list-first schedule/shift templates layout. The separate weekly-roster redesign is outside this change.

## Implementation

`src/app/app/schedule/templates/page.tsx` now presents the selected week above a save panel and a semantic saved-template list. Names wrap completely, shift counts stay visible, and Apply and Archive have contextual accessible labels. Desktop uses two columns; mobile stacks panels and places row actions below the template identity. The page uses existing Inter, orange/neutral tokens, Phosphor icons and the NEVORA shell.

`templates.css` owns the page's scoped presentation. `src/components/schedule-template-controls.tsx` adds pending submit states, feedback focus, empty-state input focus and a restrained GSAP entrance with a reduced-motion media guard. Tests cover selected-week form data, authorization order, workspace-local week fallback, escaping, zero/partial results, empty/error presentation, pending submits and the empty-state focus regression.

The existing template server actions, data access, shift validation, guarded writes and archival behavior are unchanged. No dependencies or database migrations were added.

## Source and branch

- Isolated branch: `codex/nevora-schedule-templates-20261012`.
- Integrated design base: `ba5ed01`, from the reset-access design branch. The saved project's `development` checkout was still at `0516b7d`; the integrated branch was the established source for current NEVORA designs.
- Implementation: `838a2621d37437dfd45868bbe14c56c80e535396`.
- Browser-discovered input focus fix: `65cb28b6d694b6594e349b49cbf9d3e0fe4faf46`.
- Checkout: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-8/work/checkout`.

Other reset-access and weekly-schedule work was preserved. Nothing was pushed, merged into main or deployed. Integrate these bounded commits into the combined NEVORA development branch after reconciling its current state; do not replace another chat's checkout. The final documentation commit contains no application changes beyond the browser-tested checkpoint.

## Automated verification

All checks below passed against the final application source:

```sh
npm test -- src/app/app/schedule/templates/page.test.tsx src/components/schedule-template-controls.test.tsx src/lib/data/schedule-templates.test.ts src/app/app/schedule/actions.test.ts src/lib/date-utils.test.ts
npm run typecheck
npx --no-install eslint src/app/app/schedule/templates/page.tsx src/app/app/schedule/templates/page.test.tsx src/components/schedule-template-controls.tsx src/components/schedule-template-controls.test.tsx
env -u DATABASE_URL npm run build
git diff --check
```

The selected suite passed 49 tests in five files. The optimized Next.js build succeeded. Tests and build used an owned `TMPDIR` after the resumed read-only sandbox denied writes to the system temporary directory; this was an environment failure before tests ran, not an assertion failure. TypeScript/Biome language servers were unavailable and were not installed; `tsc` and ESLint supplied the checks.

## Browser and data verification

Real UI interactions ran through the Codex in-app browser against an exact committed source mirror and owned local PostgreSQL with fictional accounts. Production database credentials were explicitly excluded. The owned database adapter was the only application substitution, as defined by the repository's existing test harness. Notifications and push delivery were disabled.

| Check | Observed result |
| --- | --- |
| Widths 320, 390, 430, 768, 1024 and 1440 | Zero horizontal overflow; all 12 visible page controls inside the viewport and at least 44px high/wide; three readable rows. |
| Mobile 390 x 844 | Existing mobile navigation, complete long names, labelled actions, normal scrolling and stacked panels. |
| Keyboard | Week navigation, input, Save, Apply and Archive follow DOM order with solid visible focus outlines. |
| Native validation | Empty submit focuses the required name field; 3-50 character constraints remain present. |
| Pending save | Disabled Saving template... button with `aria-busy=true`; success returns an active control. |
| Save on mobile and desktop | Selected week saves a pattern containing three shifts. |
| Duplicate name | Existing explanatory alert appears and feedback receives focus. |
| Apply to October 19 | Three shifts inserted; manager warning count and selected-week Review schedule destination shown. |
| Reapply | Zero added, three skipped; target week stays at three shifts. |
| Archive | Pattern disappears from the active library; target week still contains three shifts. |
| Copied shift details | 08:00-16:00, 09:00-17:00 and overnight 22:00-06:00 preserved, including notes, positions and designated lead. |
| Empty library | Clear first-template guidance; its action focuses the input at approximately y=397-446 within the mobile viewport. |
| Empty pattern | Zero applied is displayed with Review schedule. |
| Roles | Manager and Owner can open templates; Employee and Lead are redirected to `/app` without rendering the private template page. |
| Browser diagnostics | No captured error or warning entries in the final test tab. |

The pending/duplicate/mobile save checks initially ran at `838a262`; the focus fix changed only the empty-state link and added its regression test. The final checkpoint was retested for all six widths, keyboard traversal, empty-state focus, desktop save/apply/reapply/archive, manager/Owner access and Employee/Lead rejection.

The final app mirror and source passed the harness's integrity check during teardown. Both local servers were closed, the owned test database was removed, PostgreSQL was stopped and the temporary browser viewport was reset. No real employee/customer records were used.

## Evidence and limits

User-facing artifacts are in `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-8/outputs`: `desktop.jpg`, `mobile.jpg`, `mobile-empty.jpg`, `desktop-applied.jpg`, `workflow-sql-receipts.json` and `review.md`. The SQL receipt records the archived pattern, unchanged three-shift source/target counts and copied shift details. Source manifests and Next.js logs remain under `work/browser-evidence/owned-next-JYgs8C` in the same chat directory.

This is local browser viewport verification, not physical iOS/Android or production certification. Reduced-motion behavior was checked in source; the browser's motion preference was not changed. A JavaScript-disabled session, a live unavailable-database state and every possible shift-validation warning were not exercised. Existing server behavior remains covered by the selected data/schedule suite. No full unrelated suite was run.

## References

Mobbin: [Klaviyo](https://mobbin.com/screens/378629d3-62e9-4bf2-b39a-544afaf0acb7), [Dropbox Dash](https://mobbin.com/screens/c305aa1a-7656-4d21-b6e6-3ba6ba2cd9d8), [Square](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724), [Public](https://mobbin.com/screens/e44ca9c4-52c9-4504-9b6d-90513b4aa9b2).

21st.dev options shown before approval: [Calendar Scheduler](https://21st.dev/@ruixen.ui/components/calendar-scheduler), [Availability Slot Card](https://21st.dev/@ravikatiyar162/components/card-13), [Event Scheduler Card](https://21st.dev/@ravikatiyar162/components/card-14), [Coach Scheduling Card](https://21st.dev/@isaiahbjork/components/coach-scheduling-card). These informed presentation; their appointment workflows were not imported. DESIGN.MD and the approved operational layout took precedence over gpt-taste's marketing/randomized-font defaults.
