# Positions redesign handoff

Owner: this Positions redesign chat. Date: October 12, 2026.

The Owner's Positions catalog now uses searchable, status-filtered rows and expandable editors. Jose selected the expandable editor direction after Mobbin research and the 21st.dev options were shown. Desktop uses aligned rows; mobile stacks position names and statuses with full-width actions. The approved coral portal palette, locally bundled Inter, Phosphor icons and restrained GSAP motion are applied only while this route is present.

## Source and scope

- Branch: `codex/nevora-positions-20261012`.
- Base: `six-findings/single-company-setup`, commit `191fbc38e68d70c2dfe0809dffbdb63eb962b1b7`.
- Source: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-33/work/checkout`.
- Approved design recovered from the "Find redesigned NEVORA pages" chat: `/Users/josek0514/Documents/Codex/2026-10-11/d/work/reset-access/checkout/DESIGN.MD`.
- Changes: `src/app/app/settings/positions/{page.tsx,position-catalog.tsx,positions.css,page.test.tsx}`, pinned GSAP/Phosphor dependencies, and the existing Inter font with its OFL license.

The page remains Owner-only. Existing create/update actions, session mutation proofs, validation, revalidation, SQL, assignment restrictions and retained history are unchanged. The UI clears search/status filters after confirmed saves so the saved row and its feedback remain visible. Filtering retains mounted drafts; Cancel restores the saved name and active state and returns focus to the row.

Full server rendering preserves catalog reading without JavaScript. Forms are disabled before hydration and without JavaScript, with explicit guidance. A streaming loading boundary was removed after a real no-JavaScript check demonstrated that its fallback prevented the catalog from appearing. Pending saves retain a live loading status. Failed catalog reads display an unavailable state and retry action, rather than an empty catalog or editable forms.

## Verification

- Full default unit suite: 204 files, 2,135 tests passed. Its deterministic scheduling benchmark takes about four minutes. The first sandboxed run had a Clocker fixture subprocess failure; the isolated fixture test and full suite passed with normal local process permissions.
- Final focused suite: 6 files, 38 tests passed, including authorization order, unavailable/empty separation, field contracts and existing position/action/data checks.
- Final `npm run build`, `npm run lint`, `npm run typecheck` and `git diff --check` passed.
- Real browser fixture: 38 checks passed in Chromium and WebKit. Widths 320, 375, 390, 430, 768, 1024 and 1440 were checked with both collapsed rows and expanded editors.
- Browser checks exercised native Owner login; search/status filtering; keyboard/focus; draft retention and Cancel; native required validation; create, rename, deactivate and reactivate through real server actions; retained employee qualification membership; pending and aborted saves; no-JavaScript reading and disabled forms; database read failure and retry; related navigation; non-Owner denial; actual GSAP motion, reduced motion and an empty catalog.
- Recorded browser runtime errors and external HTTP requests: zero in the passing run. Login setup uses an existing allowed return destination. The earlier fixture setup visited Dashboard, whose canceled polling requests produced WebKit errors; no assertion was disabled or filtered.
- Primary action contrast: 6.01:1 at rest and 4.81:1 on hover. Page targets meet 44px minimums; the 22px checkbox is within a larger clickable label.

The browser fixture uses a new ownership-marked local PostgreSQL database and a copied Next runtime. Only that runtime's DB transport is substituted. No production credentials, customer records, real messages, orders or bookings are used. This is local validation; physical devices and production deployment were not verified, and independent audit closure is not claimed.

## Evidence and reproduction

Deliverables: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-33/outputs`.

That directory contains `README.md`, `design-options.md`, `browser-report.json`, `browser-qa.log`, `full-suite.json`, `full-suite.log`, final build/lint/typecheck/focused logs, screenshots, `preview.json` and the runtime source manifest.

Browser runner: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-33/work/positions-browser-qa.mjs`. Run it from the source checkout with `node --import tsx ../positions-browser-qa.mjs`. It refuses an application `DATABASE_URL`; it creates and closes its own fictional database and Next runtime. `KEEP_POSITIONS_PREVIEW=yes` retains that local preview. It uses the existing shared engineering toolkit's Playwright installation and the existing local PostgreSQL runtime.

Product position: approved presentation changes, with existing business behavior preserved. Engineering position: a route-local change that reuses established form/actions. Governance position: GO for local review, with production authorization separate. No policy exception or new external instrumentation is introduced. Next action: review the retained local preview and integrate this branch through the existing NEVORA process. Revert this commit to roll back the presentation change.
