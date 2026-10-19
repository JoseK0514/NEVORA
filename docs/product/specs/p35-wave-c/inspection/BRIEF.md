# Wave C inspection brief (Phase 3.5)

October 19, 2026. Wave C rebuilt the Owner's Settings hub, every Settings page, Account recovery and Clocker recovery on the kit, phone and desktop together (320–1440), with one shared form pattern. Your job: find every defect in your area before Jose does. Measure; "looks fine" is not a result.

Read first, in this order:
1. `/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/phase-7-inspection-2026-10-18/PARALLEL.md` (the bar, the matrix, the form pattern)
2. `/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/phase-7-inspection-2026-10-18/BRIEF.md` (report format, severities, rules). Its preview URL and password path are out of date: use the ones below.

## Pages

| Key | Route | Roles that can open it | Notes |
|---|---|---|---|
| hub | `/app/settings` | Owner | Manager, Lead, Employee are refused (check what they see) |
| profile | `/app/settings/workspace` | Owner | Timezone is protected on this data |
| locations | `/app/settings/locations` | Owner | `?q=`, `?status=setup|ready|inactive`; no-match: `?q=zzz` |
| location | `/app/settings/locations/<id>` | Owner | Open from a location card's "Edit location"; unknown id → not found |
| new-location | `/app/settings/locations/new` | Owner | |
| branding | `/app/settings/branding` | Owner | Preview tabs Phone / Desktop / Clocker. The preview stage is a scaled, aria-hidden, inert miniature of the app: its 11–14px text is exempt from the 15px floor |
| features | `/app/settings/features` | Owner | Time off is locked on this data (a request is waiting) |
| policies | `/app/settings/company-policies` | Owner | Choose "Custom threshold" to reveal a rule's fields; switch Policy scope |
| breaks | `/app/settings/breaks` | Owner | Add break type / Edit / Archive open a dialog (bottom sheet under 600px) |
| positions | `/app/settings/positions` | Owner | Rows open an inline editor |
| devices | `/app/settings/clocker` | Owner | Add device / Rename / Replace tablet / Revoke open a dialog |
| account-recovery | `/app/account-recovery` | Owner, Manager | Also `?employee=AUDIT-E` (Back = Employee) and `?from=settings` (Back = Settings) |
| clocker-recovery | `/app/clocker-recovery` | Owner, Manager | Also `?from=settings`; try a malformed reference and a well-formed unknown one, e.g. `4a9c7ed1-9b42-4dc0-8847-324d7ade7832` |

Loading placeholders: every route has its own `loading.tsx` that draws the page's real band. Check band height and title position from loading to ready.

## Preview and accounts

- Preview: `http://127.0.0.1:49855` (Wave C's own; local Next dev server on a throwaway Postgres, fictional data). Don't stop or restart it.
- Signed-in browser states: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-c-93e13c/75458b9c-fbac-4a0a-b5f7-fa683890e520/scratchpad/preview/state/<account>.json` for `QAOWNER` (Owner), `AUDIT-M` (Manager), `AUDIT-LEAD` (Lead), `AUDIT-E` (Employee), `AUDIT-LONG`.
- The password is in `.../scratchpad/preview/evidence-*/access.json`. Read it from the file only if you must sign in fresh. Never print it, write it in a report, or put it in a URL.
- Playwright: `/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs` (Chromium, Firefox, WebKit). axe: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/node_modules/axe-core/axe.min.js`.
- Source under inspection: `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/p35-wave-c-93e13c`. Key files:
  - `src/app/app/premium-wave-c.css` (all Wave C styles), `src/app/app/settings/wave-c-kit.tsx`, `wave-c-form.tsx`, `wave-c-loading.tsx`
  - pages under `src/app/app/settings/**`, `src/app/app/account-recovery`, `src/app/app/clocker-recovery`
  - components: `brand-editor`, `features-editor`, `company-policy-editor`, `clocker-break-types`, `clocker-device-manager`, `new-location-form`, `edit-location-form`, `assisted-recovery`, `clocker-recovery-review` in `src/components/`
  - shared (not Wave C's, report against them if they cause a defect here): `src/components/kit/*`, `src/app/app/portal-premium.css`

## Matrix (PARALLEL.md)

Every role that can open the page (and what the others see); widths 320, 360, 390, 430, 844×390, 768, 1024, 1440; text 100, 125, 150, 200%; Chromium, Firefox, WebKit; states: loading, ready, empty, partial, offline, failed read (block the request), no access, signed out mid-use (force a 401), decided, large data (only where it applies). Motion: normal and reduced. Dark mode: not applicable.

**Submitting, UI side only:** you may submit forms on this local fictional data, but block the request in the browser (`page.route(..., r => r.abort())`) so nothing is saved, except where your area needs a real success state; then say so in the report. Check before, pending (throttle), failure (blocked), double tap (exactly one request leaves the browser).

Out of scope here: on-screen keyboard (the coordinator schedules the simulators), real server outcomes (`CODEX.md`), Spanish.

## Rules

- Read only. Never edit code, CSS, tests or data. No Sign out.
- Put your scripts and screenshots under `.../scratchpad/inspect/<area>/`.
- Write only your report: `docs/product/specs/p35-wave-c/inspection/<area>.md` in the worktree above.
- Report format: as `BRIEF.md` (verdict, findings table worst first with ID, screen/role/width, element, measured problem, screenshot, cause `file:line`, fix, severity P0/P1/P2; then what you checked and found correct). End with one line: zero open P0–P2 in your area, yes or no.
- Known capture artifact: full-page screenshots draw sticky bars mid-image. Check sticky bars with viewport screenshots while scrolled.

## Decided, don't refile

| Item | Why |
|---|---|
| Search fields are white with a border at 48px (not grey, not 52px) | The shared field style (portal-premium WR-49), the same as Team's search |
| "These rules do not determine pay, discipline, or legal entitlements." on Company policies | Legal wording, kept exactly; moved to the guide card |
| Server-written sentences (listed in `CODEX.md` §3) | Server code; Codex and Jose decide |
| The desktop shell's breadcrumb text | Shell (Phase 4 session) |
