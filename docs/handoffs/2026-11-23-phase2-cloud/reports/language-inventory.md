# Signed-in language inventory (G98, gap closure)

Branch `claude-codex-collab-nevora-payroll-2`; source as of the G98 commit. Counts come from a source scan, not a render. Each count is a user-visible string literal or JSX text of two or more words (single capitalised words such as button labels count too). Class names, ids, paths and constants are excluded, and test files are skipped. Treat the counts as ±15%: they are for sizing, not a string list. The scanner is `language-inventory-scan.py` in this folder, described at the end.

## Where a signed-in page gets its language

- **The person's language:** `readPortalLanguage(proof)` (`src/lib/activation/language.server.ts`). It returns the saved choice from `user_language_preferences` (set from Profile). Without one, it falls back to `readAuthLang()`: the `nv-lang` cookie the sign-in switch sets, else the browser's Accept-Language, else English.
- **G98 (this change)** uses that same read, with English if it fails. It adds no new server read: the person, time off and pay pages already use it. Each page that follows the language now makes one small read per view.
- **Cookie only, no database:** `readAuthLang()` is used where no session proof exists yet. The Week copied page's not-found state uses it.

Signed-in routes that read a language today:

- `src/app/app/billing/page.tsx`
- `src/app/app/employees/[employeeId]/page.tsx`
- `src/app/app/employees/[employeeId]/pay/page.tsx`
- `src/app/app/employees/[employeeId]/time-off/page.tsx`
- `src/app/app/page.tsx`
- `src/app/app/payroll-export/paid-time/page.tsx`
- `src/app/app/profile/page.tsx`
- `src/app/app/schedule/copy-receipt/page.tsx`
- `src/app/app/schedule/page.tsx`
- `src/app/app/settings/time-off/page.tsx`

The new ones in this change are `payroll-export/paid-time/page.tsx` (G9) and `schedule/copy-receipt/page.tsx` (C8). The rest already read a language for parts of their own content.

## Summary

| Part | Areas | English strings | Spanish strings |
|---|---|---|---|
| Shell: nav, top bar, account menu, finder, toasts, More, loading and error frames | 1 (25 files) | 500 | 0 |
| Signed-in areas with Spanish copy | 12 | 4780 | 962 |
| Areas with Spanish copy that are mostly public or kiosk (sign-in recovery, legal, phone app access, Clocker) | 5 | 1878 | 757 |
| English-only signed-in areas | 127 | 10030 | 19 |

In an area with Spanish copy, the English count includes the English half of each pair, so English ≈ Spanish means fully paired. A larger gap is the untranslated remainder.

**The shell is English-only:** about 500 strings in 25 files, with no Spanish and no language plumbing. Translating it means:
1. Pass the person's language into `AppShell` from `src/app/app/layout.tsx` with the same `readPortalLanguage` read, once per layout render.
2. Give `navigation.ts` labels and the shell components an `en`/`es` copy table.
3. Translate about 500 strings: nav labels, tab bar, top bar, account menu, finder, toasts, loading and error frames.
This is about one session. The nav labels feed tests in `src/lib/navigation*.test.ts` and `app-shell*.test.tsx`, which are part of that work.

**English-only pages:** about 10,030 strings across 127 areas. At about 1,000–1,500 strings per session, including tests and a Spanish capture pass, that's 8–10 sessions. The six largest areas hold about half: employee-mobile, payroll, manager, employee, schedule and timecards.

**Areas that already have Spanish copy:** the largest gaps are owner-advisor (1,641 EN / 199 ES) and employee-b (890 / 34). These areas are mostly English with Spanish fragments, so they belong with the English-only work.

## Signed-in areas with Spanish copy

| Area | Files | EN | ES |
|---|---|---|---|
| `components/owner-advisor` | 27 | 1641 | 199 |
| `components/employee-b` | 18 | 890 | 34 |
| `components/payroll-import` | 10 | 429 | 207 |
| `components/owner-b` | 13 | 428 | 60 |
| `components/roster-import` | 7 | 293 | 119 |
| `components/restrictions` | 3 | 285 | 84 |
| `components/time-off-admin` | 4 | 219 | 73 |
| `components/wages` | 4 | 175 | 48 |
| `components/review-details` | 2 | 144 | 48 |
| `components/reminders` | 8 | 101 | 32 |
| `components/copy` | 2 | 88 | 27 |
| `components/workforce` | 6 | 87 | 31 |

Mostly public or kiosk, for reference:

| Area | Files | EN | ES |
|---|---|---|---|
| `components/clocker` | 25 | 1273 | 448 |
| `components/mobile-access` | 12 | 270 | 159 |
| `components/access-recovery` | 9 | 166 | 90 |
| `components/commerce-recovery` | 6 | 123 | 48 |
| `components/legal` | 6 | 46 | 12 |

## Shell files

| File | EN | ES |
|---|---|---|
| `src/lib/finder.ts` | 118 | 0 |
| `src/lib/navigation.ts` | 60 | 0 |
| `src/components/app-shell.tsx` | 57 | 0 |
| `src/components/owner-b/b-loading.tsx` | 45 | 0 |
| `src/app/app/more/page.tsx` | 39 | 0 |
| `src/components/portal-device-setup.tsx` | 38 | 0 |
| `src/components/employee-account-panel.tsx` | 32 | 0 |
| `src/components/command-finder.tsx` | 25 | 0 |
| `src/app/app/root-loading.tsx` | 23 | 0 |
| `src/components/form-validation.tsx` | 15 | 0 |
| `src/components/action-menu.tsx` | 11 | 0 |
| `src/components/employee-mobile/device-owner.tsx` | 9 | 0 |
| `src/app/app/not-found.tsx` | 6 | 0 |
| `src/components/notification-bell.tsx` | 5 | 0 |
| `src/app/app/error.tsx` | 5 | 0 |
| `src/components/toaster.tsx` | 4 | 0 |
| `src/components/sheet-gestures.tsx` | 3 | 0 |
| `src/components/portal-account-menu.tsx` | 2 | 0 |
| `src/app/app/layout.tsx` | 2 | 0 |
| `src/components/section-tabs.tsx` | 1 | 0 |
| `src/components/app-navigation.tsx` | 0 | 0 |
| `src/components/portal-signout.tsx` | 0 | 0 |
| `src/components/navigation-link.tsx` | 0 | 0 |
| `src/components/nav-icon.tsx` | 0 | 0 |
| `src/components/owner-b/b-offline.tsx` | 0 | 0 |

## English-only signed-in areas (all)

| Area | Files | EN |
|---|---|---|
| `components/employee-mobile` | 44 | 1443 |
| `components/payroll` | 31 | 1238 |
| `components/manager` | 17 | 833 |
| `components/employee` | 25 | 830 |
| `route: /app/schedule` | 26 | 464 |
| `components/ui-preview` | 4 | 386 |
| `components/timecards` | 3 | 362 |
| `components/company-access` | 15 | 308 |
| `components/premium` | 10 | 307 |
| `components/communication` | 2 | 288 |
| `route: /app/settings` | 51 | 252 |
| `components/reports` | 2 | 216 |
| `route: /app/exchange` | 11 | 179 |
| `components/company` | 1 | 175 |
| `components/notification` | 2 | 164 |
| `route: /app/employees` | 25 | 153 |
| `components/owner` | 4 | 126 |
| `components/clocker-photo` | 5 | 122 |
| `components/schedule` | 10 | 121 |
| `components/availability` | 6 | 85 |
| `components/shift` | 9 | 84 |
| `components/manager-profile` | 3 | 84 |
| `route: /app/requests` | 9 | 83 |
| `components/time` | 8 | 77 |
| `components/coverage` | 5 | 72 |
| `components/brand` | 4 | 72 |
| `components/generation` | 1 | 72 |
| `components/calendar` | 1 | 61 |
| `components/activity` | 1 | 58 |
| `components/leave-staffing` | 5 | 57 |
| `components/native-shell` | 2 | 56 |
| `route: /app/availability` | 6 | 47 |
| `components/team` | 6 | 44 |
| `components/christmas` | 2 | 43 |
| `components/corp` | 4 | 43 |
| `route: /app/help` | 1 | 42 |
| `components/publish` | 1 | 40 |
| `components/management` | 1 | 38 |
| `components/wave-a` | 11 | 38 |
| `components/wave` | 1 | 36 |
| `components/operational` | 1 | 35 |
| `components/reviewed` | 2 | 35 |
| `components/delegated` | 1 | 34 |
| `components/edit` | 1 | 33 |
| `components/whos` | 1 | 32 |
| `components/notifications` | 1 | 31 |
| `components/assisted` | 1 | 30 |
| `components/clean` | 6 | 30 |
| `components/period` | 1 | 29 |
| `components/new` | 1 | 28 |
| `route: /app/reports` | 5 | 25 |
| `components/create` | 1 | 22 |
| `components/mobile` | 2 | 20 |
| `components/configured` | 1 | 20 |
| `components/swap` | 2 | 19 |
| `components/signature` | 7 | 19 |
| `components/auth-premium` | 12 | 18 |
| `route: /app/profile` | 6 | 18 |
| `route: /app/payroll` | 10 | 18 |
| `components/messages` | 1 | 17 |
| `components/features` | 1 | 17 |
| `components/coverage-minutes` | 1 | 17 |
| `components/employment` | 1 | 16 |
| `components/action` | 2 | 16 |
| `components/kit` | 10 | 14 |
| `route: /app/(root)` | 2 | 14 |
| `route: /app/timecards` | 4 | 14 |
| `components/first` | 1 | 13 |
| `components/rules` | 1 | 12 |
| `route: /app/my-time` | 2 | 11 |
| `components/account` | 2 | 10 |
| `components/app` | 1 | 10 |
| `route: /app/payroll-export` | 4 | 10 |
| `route: /app/billing` | 1 | 10 |
| `components/correction` | 1 | 9 |
| `components/quiet` | 2 | 9 |
| `route: /app/ai-manager` | 4 | 8 |
| `route: /app/updates` | 6 | 7 |
| `components/location` | 1 | 6 |
| `components/policy` | 1 | 6 |
| `route: /app/account` | 2 | 6 |
| `components/module` | 1 | 5 |
| `components/recovery` | 3 | 5 |
| `components/exchange` | 2 | 5 |
| `components/sidebar` | 1 | 5 |
| `components/configuration` | 1 | 5 |
| `components/blocked` | 1 | 5 |
| `route: /app/notifications` | 3 | 5 |
| `components/update` | 1 | 4 |
| `components/theme` | 1 | 4 |
| `components/passkeys` | 3 | 4 |
| `route: /app/restricted` | 1 | 4 |
| `components/position` | 1 | 3 |
| `components/public` | 1 | 3 |
| `route: /app/my-pay` | 3 | 3 |
| `route: /app/clocker-recovery` | 2 | 3 |
| `route: /app/account-recovery` | 2 | 3 |
| `components/profile` | 2 | 2 |
| `components/callout` | 1 | 2 |
| `components/finder` | 1 | 2 |
| `route: /app/inbox` | 2 | 2 |
| `components/unconfirmed` | 1 | 1 |
| `components/status` | 1 | 1 |
| `components/print` | 1 | 1 |
| `components/skeleton` | 1 | 1 |
| `components/celebration` | 1 | 1 |
| `components/illustrations` | 1 | 1 |
| `components/onboarding` | 1 | 1 |
| `route: /app/@sheet` | 6 | 1 |
| `route: /app/[...missing]` | 1 | 1 |
| `components/auth` | 3 | 0 |
| `components/web` | 1 | 0 |
| `components/page` | 1 | 0 |
| `components/empty` | 1 | 0 |
| `components/use` | 1 | 0 |
| `components/select` | 1 | 0 |
| `components/root` | 1 | 0 |
| `components/b` | 1 | 0 |
| `components/phone` | 1 | 0 |
| `components/private` | 1 | 0 |
| `components/request` | 1 | 0 |
| `components/route` | 1 | 0 |
| `components/presentation` | 1 | 0 |
| `route: /app/employee-hours` | 1 | 0 |
| `route: /app/dev-inspect` | 1 | 0 |
| `route: /app/api` | 3 | 0 |
| `route: /app/employee-planning` | 1 | 0 |

## Method

`language-inventory-scan.py` (run it with `python3 language-inventory-scan.py <repo root>`) walks `src/app/app/**`, `src/components/**`, `src/lib/navigation.ts` and `src/lib/finder.ts`, skipping tests and CSS. It strips comments, then collects string literals and JSX text and keeps the user-visible ones as defined above. A string counts as Spanish when it has á, é, í, ó, ú, ñ, ¿ or ¡, or two or more common Spanish words and no common English word. Areas are `/app/<route>` for route files and `components/<folder or file prefix>` for components. A component can serve both signed-in and public pages; the public and kiosk split above is by area name.

## G98 check
- Pages: Paid time export (G9) and Week copied (C8) now follow the person's language. The code is `ce0e0da9`, in `paid-time/page.tsx` and `copy-receipt/page.tsx`, using the existing `readPortalLanguage` with English if it fails. Week copied's not-found state reads the cookie only.
- Tests: new `paid-time/page.test.tsx`, plus a G98 test in `copy-receipt/page.test.tsx` for Spanish, English when the read fails, and the Spanish not-found state. tsc is clean.
- Full `src` suite: 15,829 pass and 63 fail in six files. All six are environmental or pre-existing:
  - Four tenancy files failed for lack of commit `7c628e37`. After fetching it, all four pass.
  - `managed-runtime` passes when re-run. It's the load-sensitive test sweep-1 owns.
  - `src/test/manual-publication.test.ts` fails the same way on origin `552ceed3`. `scripts/manuals/bundle.mjs` needs a publication source commit this shallow clone doesn't have.
- Captures: production build, fictional data, Owner. Spanish was chosen the real way, with the `nv-lang=es` cookie the sign-in switch sets; there's no capture-only code. The person has no saved language, so the cookie decides.
  - `lang-G9-es-*`: "Primero elige quién está incluido … Revisar quién está incluido".
  - `lang-C8-es-*`: a real fictional copy of this week into next, via the same request the Copy button makes. It shows "Semana copiada / 4 turnos / 30 nov – 6 dic / Revisar horario / Con advertencias …".
  - At 390 and 1440: 0 axe violations, nothing clipped or overlapping.
  - The tab bar and nav stay English: that's the shell gap above.
