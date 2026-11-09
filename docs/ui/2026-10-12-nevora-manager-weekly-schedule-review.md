# NEVORA manager weekly schedule review

Reviewed application checkpoint: `97ea8f2ff7e72b24d0da0e4080077a8d8222dd28`.
Branch: `codex/nevora-manager-weekly-schedule-20261012`.
Checkout: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation/work/checkout`.
Base: `ba5ed01`, the integrated development-derived source identified by the Find redesigned NEVORA pages chat. The older primary development checkout did not contain the accepted UI system. Existing Reset Access work was preserved in its original checkout.

## Design and behavior

The manager schedule now uses employee rows and seven aligned days on desktop. Mobile opens the current day, or Monday when viewing another week, with explicit day and Full week controls. Search filters by team member name or role. Location and week changes use the existing server routes. Counts and assigned hours come from displayed real assignments, excluding approved callouts as before. Published historical positions still use their captured names. Shift cards retain edit links and show status, lead designation, and overnight ending dates.

Add shift stays prominent. Templates, copy previous week, scheduling rules, team updates, the availability deadline, automatic generation, and publication remain available. On mobile, Templates and This week are in More to keep the week controls compact. Build and publish follows the roster on mobile and has a More shortcut; publication warnings open it near the top for review. Existing guarded server actions and data access were retained. Employee/Lead schedule rendering was preserved.

DESIGN.MD authority was read from `/Users/josek0514/Documents/Codex/2026-10-11/d/work/reset-access/checkout/DESIGN.MD`, the integrated checkout used by the page tracker. The implementation uses the established orange portal palette, Inter, Phosphor, card/control tokens, and a brief GSAP row entrance with reduced-motion support. Jose's operational layout and existing design system took precedence over generic marketing and randomized-font instructions in gpt-taste.

## Research

Mobbin examples examined: [Square](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724), [Fresha](https://mobbin.com/screens/bf52a492-844f-4a22-93a8-695af4fc75d1), [7shifts](https://mobbin.com/screens/9dd5d8fc-bea7-4e65-819c-825b66abfda6), [Deputy](https://mobbin.com/screens/23d271ca-558f-4769-982d-f0ed0e0f8f8f), [DoorDash](https://mobbin.com/screens/de3bd81c-98b2-4074-899a-f16ceb8e26e8), [Outlook](https://mobbin.com/screens/e3289667-7a6c-4c80-bffe-291561fe1ff2), and [Toggl](https://mobbin.com/screens/9524e697-5c57-41f0-b5d8-f38702577790). Square's roster and DoorDash's mobile date strip informed the layout.

21st MCP search_picker options were shown: [Day Picker](https://21st.dev/@0xUrvish/components/day-picker), [Date Picker with Presets](https://21st.dev/@cnippet-dev/components/date-picker-with-presets), and [Segmented Control](https://21st.dev/@halaska-studio/components/segmented-control). Their patterns informed NEVORA's existing controls. No component source retrieval, paid generation, new dependencies, or external component code was used.

## Verification

- 88 targeted tests across 7 files passed: roster presentation, schedule page, generation controls/state, action menu, shift actions, and generation actions. Five meaningful roster regressions cover hours, search, status/position/overnight labels, review-day focus, and empty-team recovery.
- ESLint passed for the four changed/new TypeScript files.
- Optimized Next build passed, including TypeScript checks and all 39 static pages.
- Final browser evidence: **40** checks passed in actual Next with fictional, ownership-marked local PostgreSQL. Chromium and WebKit were exercised at 320, 390, 430, 768, 1024, and 1440px. Checks covered overflow, touch targets, search, date selection, overnight shifts, location/week navigation, empty assignments, More tools, publication warning/error/success/pending states, real local publication and Fill Gaps Only, unavailable generation review, long names/12 locations, motion preferences, Employee/Lead continuity, and zero browser JavaScript errors.
- Mobile captures use 390 x 844px; the first shift's time clears the actual bottom-navigation bounds. Desktop capture uses 1440px. Captures come from the implemented application, with fictional data.

The harness is `../verify-schedule.mjs` from the checkout. Run with `env -u DATABASE_URL node --import tsx ../verify-schedule.mjs`; it requires the existing shared engineering-toolkit Playwright runtime and the explicit local PostgreSQL binary recorded in the script. It refuses an application DATABASE_URL, allocates disposable data, and verifies its source/mirror on closure. An interrupted run's own processes were checked against ownership metadata and stopped; unrelated application processes were left alone.

## Limits and next action

Browser emulation covers Chromium and WebKit, not physical devices or production. WebKit's macOS Tab preference skips buttons in headless testing, so Chromium's Tab sequence and WebKit's explicit keyboard focus/Enter activation were both exercised. The full repository suite and production services were not run. No real communications, subscriptions, bookings, or customer records were used.

Product/Experience: weekly scanning and mobile access improved within the existing policy. Engineering: existing server/domain boundaries and mutation contracts retained. Governance: observed local evidence is separate from independent release approval. Jose owns visual acceptance.

Local implementation commits are saved; no push, PR, merge, or deployment was performed. The only untracked checkout item is the generated `.impeccable/hook.cache.json`. Next action: review desktop/mobile captures, then integrate this branch through NEVORA's normal reviewed development workflow.

Deliverables directory: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation/outputs`: `review.html`, `desktop.png`, `mobile.png`, `mobile-full.png`, `verification.json`, and `manager-schedule.patch`. The patch applies the five application files relative to `ba5ed01`; it does not include this handoff document.
