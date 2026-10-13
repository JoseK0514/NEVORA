# NEVORA Home and shared portal refinement — 2026-10-12

Branch: `codex/nevora-login-refinement-20261012`. Previous checkpoint: `f4cdba75c32e59cb9c5c82eb85c3e7d19b514668` (approved reset refinement). Local isolated checkout; original development checkout unchanged. This is a presentation change on the existing disposable preview, not a production deployment or a merge to main.

## User direction and implemented presentation

Use the approved original NEVORA wordmark with centered Workforce across authenticated headers and the device setup surface. Remove flame tiles and signed-in role badges from chrome. Actor names remain. Authorization and operational employee role data remain meaningful and unchanged.

The management mobile header has one matching regular Phosphor BellSimple icon and one List menu, both neutral at rest and blue on focus/selection. Updates remains in desktop navigation and is now in the native mobile menu. Device settings stay reachable through profile and menu when their existing feature is enabled. Noninteractive profiles do not show a dropdown chevron.

The portal palette extends the approved authentication blue through an explicit `.app-shell.nevora-portal` override: #0756D9 brand actions/links, #003AAE hover, #EDF4FF selection, white sidebar/panels, #F7F8FA canvas, #F4F6F9 inset and #E3E7EE dividers. Blue fills use white text. Functional warning, danger and success colors retain their meaning.

Manager/Owner Home keeps the selected-week controls and all six existing views. Three factual weekly planning measures precede the compact Needs attention queue. Recorded clock activity and the real seven-day schedule chart sit beside that queue on wide screens and follow it on mobile. No synthetic trend data, new animation, dependencies or imported template workflows. Recovery tools use an optional native Plus/Minus disclosure. The same grouping, category filters, bounded preview, Show all, exact review destinations and explanations remain.

## Boundaries and regression protection

`ManagerActionCenter` controller bytes are identical to the previous checkpoint; only its surface changed. No source files under `src/lib` or `src/app/api` changed. Notification count readers and authority semantics, shell session sign-out, sidebar cookie persistence, native popover focus/lifetime and role-dependent route ownership remain.

Planning metrics are selected-week server-authorized data, not live clock totals. Planned shifts include drafts. Published locations count only explicit PUBLISHED schedule status, not readiness. Tests cover these distinctions and prevent initial unverified request names/counts from appearing in the queue.

Refined login/recovery/activation/reset presentation remains outside the portal override. AuthBrand has only a documentation-comment change; its auth markup is unchanged.

## Browser verification

Used the existing marked fictional PostgreSQL preview and its demo accounts, with delivery disabled. No real customer records, credential reset, SMTP/SMS/push delivery, publishing, attendance decisions or schedule mutations were performed.

- Owner Home rendered without page overflow at 320, 390, 768, 800, 1024 and 1440px. The six mobile view links scroll locally without widening the page.
- Owner and manager Home rendered the factual weekly measures, current protected queue, recorded clock empty state and weekly chart. Employee and lead retained their own Home and More destinations, with shared wordmark, one bell and no role badge.
- Keyboard menu Enter moved focus to Updates; Escape closed it and restored focus to More navigation. Updates and Notifications destinations opened. Sign-out and existing fictional sign-in worked for all four roles.
- Sidebar collapse survived reload and expanded again by keyboard. All six dashboard views opened. Next/previous week changed the planning figures (21 to 0 planned shifts; 1/2 to 0/2 published locations) while live activity remained separately labelled.
- Requests filter showed the one checked request; Timekeeping showed a truthful confirmed empty category. All actions, group Enter expansion, Show all (20/40 to 40/40), Refresh and Recovery tools expansion worked.
- Loading and empty states were observed in browser. Unavailable/denied/paused/protected-count lifecycle states remain covered by the existing rendering/controller tests; no real network outage or feature-enabled device enrollment was created for visual QA.
- Candidate browser error/warning log was empty. Push-disabled fixture cannot demonstrate an actual device enrollment; enabled affordance contracts are covered by rendering tests.

## Checks and evidence

Full suite with loopback/process permissions and `--maxWorkers=2`: 404 files passed, 27 intentionally skipped; 7,034 tests passed and 801 skipped. Assertions and timeouts were not weakened. The initial sandbox run hit 40 process/socket-permission failures, which passed with required permissions. An unrestricted high-concurrency run timed out five unchanged fictional migration-transport tests; all 68 tests in that file passed independently and the bounded full run passed.

Final focused UI suite, TypeScript, ESLint and isolated Next build are recorded in the companion preview report. ESLint retains the pre-existing `employee-weekly-confirmation.tsx:18` cleanup-ref warning; zero errors. No test assertions were removed or suppressed.

Intermediate logs, runtime ownership metadata, code-boundary hash, responsive measurements, dashboard-view evidence and role-header evidence are under the chat's `work/` directory. Reviewable screenshots and the final preview report are under its `outputs/` directory. `.impeccable/design.json` includes actual DOM specimens and source CSS; DESIGN.MD records the current portal direction.

## References and tool availability

Inspected Mobbin references: [Square availability](https://mobbin.com/screens/f754f017-d74c-40f2-a016-e2eabaf6b518), [Gumloop tasks](https://mobbin.com/screens/83b1ece5-39fa-4fbc-8b3c-e80425192ad5), [Gusto documents](https://mobbin.com/screens/f97bf816-0c98-4b01-9ce3-fb1455e2c1b4). Applied their quiet navigation and content hierarchy to existing NEVORA workflows. No reference screenshot became an application asset.

The 21st.dev MCP was unavailable; its public [App Dashboard Layout](https://21st.dev/@shadcnstore/components/app-1) was inspected. No component package or new service was installed. Applied gpt-taste and the repository's design/governance instructions within the user's restrained workforce direction.

## Preview and rollback

Same public temporary link: https://counted-staffing-solutions-sticker.trycloudflare.com/app. Source commit and final verified runtime identity are recorded in the companion report and `work/home-preview-runtime.json` after the swap. Runtime mirror is `work/home-runtime-v4`; only this mirror uses the approved loopback fixture database adapter. Private preview environment remains mode 0600 outside Git.

Rollback: stop only the verified owned Next child listening on 127.0.0.1:56316, after checking its PID, command and listener against current metadata, and launch the retained `work/reset-runtime-v3` with the same existing private preview environment on port 56316. Keep the original tunnel and disposable PostgreSQL supervisor running. Do not alter production, main, any unrelated process, or the original shared checkout.
