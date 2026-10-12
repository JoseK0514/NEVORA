# Request Hub redesign receipt

Delivered locally on October 12, 2026. Route: `/app/requests/hub`. Audience: Employee and Lead.

The gateway now presents Time Off and Shift Requests as two readable choices. The existing time-off history and shift-request URLs are preserved. A direct new-time-off action and My Schedule links use existing workflows. Native progressive help explains the distinction. No counts, request status, approval promises or new data reads are invented.

The server still calls `requireSessionMutationProof` before rendering. Manager and Owner still redirect to `/app`; anonymous visitors redirect to login. Request forms, mutations, contracts, business rules, database source and delivery behavior are unchanged.

DESIGN.MD remains authoritative: local Inter, orange portal actions with charcoal labels, neutral surfaces, existing 18px/17px geometry, the original NEVORA shell, and Phosphor icons. The two-column desktop composition stacks on mobile. Motion uses the installed GSAP/useGSAP dependencies, limited to a short staggered lift, with preference matching and cleanup. All content is visible before JavaScript. No paid component retrieval or hosted AI generation was used.

## References

- Mobbin Lemni: https://mobbin.com/screens/31c9c03a-dff3-4ab4-9710-b2990d13adbe
- Mobbin Aboard: https://mobbin.com/screens/85ce51ec-f838-4c9f-ac24-98cc4c3db552
- Mobbin Workable: https://mobbin.com/screens/add47441-f675-466f-b418-dbc5ec07af14
- Mobbin Gusto Mobile: https://mobbin.com/screens/64a5c79e-88e7-447f-a911-5dc282824b59
- Mobbin Remote Global HR: https://mobbin.com/screens/6f7ddbc3-3a49-492b-8de8-5f7c791cdf28
- 21st Nav List Card: https://21st.dev/@arihantcodes_1f7b8c4d/components/nav-list-card
- 21st List Group Links: https://21st.dev/@uiable/components/list-group-links
- 21st Quick Links Card: https://21st.dev/@kavikatiyar/components/card-2

21st search-picker options were shown before implementation. Their navigation patterns were adapted with native Next links rather than adding a component dependency. The initial segmented-control options were rejected after source inspection established that this page has destinations rather than filterable content views. Manager approval interfaces informed research only; no manager workflow was added to this employee gateway.

## Evidence

- Focused ESLint: passed.
- `npm run typecheck`: passed.
- `npm test -- src/app/app/requests/hub/page.test.tsx src/lib/navigation.test.ts`: 8 tests passed in 2 files.
- `npm run build`: optimized Next 16.3.8 build passed, including `/app/requests/hub`.
- `git diff --check`: passed.
- Browser QA: 33 checks passed in Chromium and WebKit using the actual Next application and a new ownership-marked loopback PostgreSQL fixture. Tested 320, 375, 390, 430, 768, 1024 and 1440px widths, column stacking, no page overflow, Inter, heading, 44px touch targets, keyboard disclosure/focus, reduced motion and live preference changes, actual navigation to new time off/history/shift requests/schedule, Employee/Lead access, Manager/Owner redirects, anonymous redirect and no-JavaScript operation. No page runtime errors were recorded.
- Personally inspected the desktop Chromium and mobile WebKit screenshots. The screenshot surfaces preserve the existing shell. The fixed mobile navigation appears partway down a full-page capture because it is pinned to the viewport; it remains the existing shell behavior.

An undersized inline schedule link in help was found during QA, replaced with a separate 44px action, and all checks were rerun successfully. Initial dependency-symlink/build-root and cold webpack compilation problems were resolved by using real local dependency copies and the normal Turbopack runtime. The final successful source has not changed since validation.

Source/evidence custody: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-10/outputs/request-hub/`. Browser report and source hashes are retained there. The sole application substitution in the browser mirror is the repository's existing approved scratch database adapter. All external notification/email delivery was disabled, and no existing credentials or databases were used.

## Handoff

Source checkout: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-10/work/request-hub`.
Branch: `codex/nevora-request-hub-20261012`.
Baseline: `ba5ed01716745ae4abad29fe63693a3be7f6cbfd`, the existing development-derived visual candidate. Current origin/development does not contain this route. The original occupied checkout was preserved.
Changes are uncommitted. No push, merge, production data change or deployment occurred. This is local redesign evidence, not independent release certification.

Owner: current Request Hub Codex chat. Product position: keep a simple request gateway. Engineering position: isolate route CSS and use installed dependencies. Experience position: clear destinations and optional help, equal mobile priority. Governance recommendation: GO for local design review; canonical integration and release remain separate conditions. No material policy exception or risk acceptance is requested. Next required owner action: visual acceptance; then integrate the bounded patch into the selected canonical source through its normal review process.
