# Phase 5 Mobile QA Handoff

Baseline: `dash-refine` at `d8adaf9b2b6972887eafacc09c05873093db3e46`.

## Environment and scope

- Tested the production build locally against a disposable PGlite database with synthetic employees, shifts, requests, availability, and templates. No production credentials or customer data were used.
- Authenticated routes: `/app`, `/app/schedule`, `/app/availability`, `/app/requests`, `/app/exchange`, `/app/employees`, `/app/employees/new`, `/app/schedule/templates`, `/app/schedule/settings`, and `/app/settings`.
- Browser matrix: Chromium and WebKit at 320, 360, 375, 390, 393, 414, and 430px portrait; 568×320, 667×375, and 844×390 landscape; 768, 820, and 1024px tablet; and 1280, 1440, and 1600px desktop. The 320 route/viewport/engine checks included page errors, horizontal overflow, rendered input size, nav and sticky-bar geometry, and final page scroll clearance.
- Focus checks covered Availability, Time Off, Employees, Add Employee, Scheduling Rules, Templates, Login, and Activate in both engines at 320, 390, 430, and 844px. The 168 checks covered first and last visible fields, font size, horizontal overflow, and simulated visual-viewport keyboard transitions where a sticky bar is present.

## Defects corrected

1. On iOS Simulator Safari, opening the keyboard left fixed navigation and sticky actions in the reduced visual viewport. The AppShell now detects a focused field plus a substantial visual-viewport reduction and temporarily hides those controls. They return when the keyboard closes, including when the field retains focus. A unit test covers keyboard, browser-chrome movement, and desktop cases.
2. At 844×390, phone landscape reached the desktop shell and some controls rendered below 16px. Short coarse-pointer landscape viewports now use the mobile shell and 16px form controls.
3. At 568×320, sticky actions obscured most of the usable viewport. They now sit in document flow in short phone landscape, with the approved mobile navigation retained.
4. The Time Off count badge protruded beyond its tab at 320px. The count and gap now fit inside the tab.
5. Small touch targets in the menu, schedule controls, exchange actions, rules, availability switches, and dashboard links were enlarged without changing their visual treatment. The remaining small checkbox inputs sit inside larger clickable labels.

## Interaction evidence

- The mobile Menu was checked at 320, 390, and 430px in both engines for keyboard opening, Escape focus return, outside tap dismissal, destination navigation, and active state. At 568×320 landscape all four management destinations fit above the bottom nav.
- Time Off tabs fit at 320–430px. Shift Exchange History remains fully visible when active or keyboard focused, within its own horizontal scroller.
- Chromium and WebKit accepted date and time values on Time Off, Availability, and Add Shift forms. Browser back navigation returned to Home with the correct active nav state.
- Reduced-motion emulation reduced transition and animation durations. No mobile rendering failure, page-level horizontal overflow, or fixed-control overlap appeared in the checked matrix.
- iPhone 17 Pro Simulator Safari was used to observe the actual iOS software keyboard, field switching, keyboard dismissal, safe-area positioning, and browser chrome. With the keyboard open, the layout viewport measured 714px and visual viewport 377px; the fixed controls disappeared and focused fields stayed visible. This is simulator evidence, not physical device testing.
- `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test` passed. The test suite has 79 passing tests in 17 files.

## Evidence and limits

Fresh screenshots and the manifest are local, outside the repository, at:

`/Users/josek0514/.codex/visualizations/2026/09/29/01a0ed31-2051-73c3-8d1e-7754f142a7e2/phase5-device-qa/`

The manifest includes 390×844, 320×568, and three landscape sizes, plus five screenshots at the end of long pages. The end screenshots show final content above the fixed nav.

No physical iOS or Android device was connected. Android Chrome was tested through Chromium mobile emulation only. Native Safari picker presentation, physical keyboard behavior, Android hardware back behavior, and on-device performance remain for a physical-device pass. No production deployment was performed.
