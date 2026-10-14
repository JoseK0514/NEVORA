# Database-free Home preview

Open `/ui-preview/home` in `next dev`, including the v0 development preview.
The selector switches between Owner, Manager and Employee. No sign-in is needed.

This is a Home-only visual fixture, separate from authenticated `/app` routes.
It uses the existing Home renderers and styles. The preview shell mounts no
session, notification, device, signout or database controllers. Manager Home
accepts two optional display slots; native Home still mounts its original private
readers when those slots are absent. Refresh shows a sample-data message, and
navigation remains on Home instead of opening authenticated workflows.

The display records were copied from the already owned fictional Northside QA
Workforce preview on October 14, 2026: 10 people, 2 locations and 21 shifts for
October 12–18. The observation is frozen at October 13, 4:49:10 PM Puerto Rico
time. Availability actions, publication status and empty clock sections are
prepared fixture states for visual editing, not fresh protected observations.
No phone, email, password, PIN, token, session, device or payroll data is included.

Files:

- `src/app/ui-preview/home/page.tsx`: isolated route and production guard.
- `src/components/ui-preview/home-records.json`: fictional display records.
- `src/components/ui-preview/home-fixtures.ts`: prepared display projections.
- `src/components/ui-preview/home-preview.tsx`: role selector and preview shell.
- `src/app/ui-preview/home/preview.css`: preview toolbar only.

Production defaults to a 404 for this route. A dedicated hosted preview may
explicitly set `NEVORA_UI_PREVIEW_ENABLED=1`; do not enable it in production.
No environment variable was added to a live application for this change.

The sample route is for layout work. Real sign-in, schedule edits, approvals,
time punches, corrections and payroll still require the application's protected
backend. No authentication or database fallback was added.

Validation: typecheck, scoped ESLint, 64 focused tests, and browser checks of
Owner/Manager/Employee Home, task filters, refresh, navigation and mobile layout.
