# Desktop at 200% text sweep (Nov 23, 2026)

Branch `claude-codex-collab-nevora-kit-final`, on `4549d037` (merged as `acc3682e`). Production scan harness, fictional
data, `NEVORA_SCAN_ADVISOR=1`, Chromium. Every row marked ✓ (Jose, Nov 23) in `docs/product/page-inventory.md`, one role
per row: Owner where the row opens; Manager (Elena) for B10; Employee for the rows only Leads and Employees open (B5,
C11, C14, C15, D4, I3); signed out for A1–A14 (English). Each at 1024 and 1440 with the root text at 200%, plus the
default size for before/after. Each 200% shot was audited for clipped, overlapping and offscreen text, page overflow,
and text that didn't grow (a "fixed px" probe: font size at 200% under 1.6× the size at 100%). Shots:
`shots/sweep-desk200/img/<page>-<role>-<1024|1440>-200pct.webp`.

Not reached with fictional data: B7 Update detail and C3 Review replacement (need a specific update or replacement),
C4 Edit shift (needs a shift id) and I2 Policy document (needs a document key).

## Commits
| Commit | What |
|---|---|
| `af09aadb` | Kit buttons (`.b-btn`): 14px → 0.875rem, and they wrap between words, centred, instead of `nowrap` |
| `4538b712` | Shell in rem: sidebar group label ("More"), desktop band back link, row values (`.c-row__value`, `.q-rv`), quiet nav (`.q-nav__l`, `.q-nav__r`) |
| `2e6e3b5a` | Profile band (phone rule): name 1.75rem/2.125rem, role line 0.875rem/1.1875rem; tests |
| `e1d8d8fa` | Kit buttons get `max-width: 100%`, so a `flex: none` button wraps inside its container instead of running off it; the desktop Profile name in rem (2rem/2.375rem) |
All at the same pixel sizes at 100%. Tests: `src/app/app/kit-text-rem.test.ts`. The whole `src/components` suite passes
(3227 tests, 0 failures).

## Default size, before and after
At 1024 and 1440, across the 60 Owner, 2 Manager and 6 Employee captures, every page matches before except live
data: the bell's unread dot, "x min ago", clock minutes, and shift times and greetings that follow the wall clock (the
fixture schedules relative to now). Those diffs were each checked by eye. A follow-up check at 390 (Owner Home, Team,
Schedule, Timecards, Payroll, Settings, Profile, Time off; Employee Home, Pay, Time, Requests) is identical apart from
the same live data. Profile and Settings are pixel-identical at 390, 1024 and 1440.

## What 200% text looked like, and what changed
Fixed here (kit or shell):
- **Home (1024):** "Prepare Nov 9–15" ran off the payroll card (`.b-btn` was `nowrap` and `flex: none`). It now wraps
  to two lines inside the card (`img/home-owner-1024-200pct-before/after`).
- **Sidebar:** the "More" group label stayed 12px; now 24px at 200%.
- **Desktop back link** ("‹ Things to do", "‹ Team"…) stayed 14px on 28 pages; now it grows.
- **Row values** on Profile, Team person pages, Settings and others stayed 14px; now they grow.
- **Profile, device alerts, passkeys (desktop):** the name stayed 32px while the role line grew under it (overlap); both
  in rem now.
- Fixed-px instances (text that didn't grow), all captured pages: 788 → about 650; the remainder is below.

Fixed earlier today, confirmed here: band titles, segment labels (Insights uncapped), CorpPill, chips, the band
subtitle, Rondo's date fields, the 320px title/button row.

## Left (page-level or a decision), proposed ledger rows
| Row | Where | What | Owner |
|---|---|---|---|
| DS-1 | Sign in, Forgot, Reset, Activate (1024, 1440) | The footer (`.q-auth__foot`, absolute at the bottom) collides with the card's last link ("Forgot password?", "Need a reset link?") when 200% text makes the card taller | Public / auth shell |
| DS-2 | Sign in (1440) | The form's field text, placeholder and "Sign in" button stay small (fixed px in the auth form) | Public |
| DS-3 | Home (1024) | The Scheduled payday ink card's header ("Scheduled payday · In 11 days") is clipped at the card's right edge | Home |
| DS-4 | Settings (1024) | Row titles truncate ("Clocke… · 1 not set up", "Features and tea…"): `.c-row__title` is one line with an ellipsis by design; decide whether it should wrap at large text | Kit decision |
| DS-5 | Team (1024, 1440) | Row details truncate ("Front counter · Calle Loíza…"), same one-line design | Kit decision |
| DS-6 | Schedule, Find cover (1024, 1440) | Grid text stays small: day hours, corner count, location menu, week state (`cm-grid__*`, `c-sched-*` in px) | Schedule |
| DS-7 | Add shift, Build and publish | Sheet title and several buttons (`c-shift__title`, `c-shift__submit`, `schedule-generation-action`, `c-btn--secondary`) stay fixed | Schedule |
| DS-8 | Time corrections | Comparison text (`time`, `correction-comparison__chg`, reasons) stays fixed | Time |
| DS-9 | Swap, Call out (Employee) | Card meta (`b-card__meta.es-wide`) and shift lines stay fixed | Employee screens |
| DS-10 | Shell, every page | The sidebar wordmark ("WORKFORCE", `login-brand-module`), "Powered by VELANI LLC" (`small`), and the hidden skip link stay fixed: logo lock-up and footer, left as is unless Jose wants them to scale | Decision |
| DS-11 | Profile, device alerts, passkeys | The band's "Edit" (`q-nav__r`, a Profile rule) stays 15px; at 390 the Profile row values (`q-rv--l`, `pmp-part`) stay 15px (a phone rule in the Profile CSS). The desktop name is fixed (`e1d8d8fa`) | Profile |
| DS-12 | Home, Requests hub (1024, 1440) | The live figures (`b-live__v`, "7/8", "0", "2") stay 28px: a desktop rule sets them in px | Home / Employee screens |
| DS-13 | Home (390) | "Prepare Nov 9–15" stays 16px: Home's own button rule (`owner-b-home.css`, `.b-home-paygo > .b-btn`) sets px | Home |

Overlaps the audit reported but that aren't on screen (checked by eye): the "What this measures" explanations
(`b-explain__tx`) and Help/Support answers inside closed disclosures are measured while hidden; the Sign in
headline halves ("Your week," / "in one place.") touch but don't overlap.

## Fixed px text still reported at 200% (after), by element and pages
| Element | Pages | Examples |
|---|---|---|
| `a.portal-skip-link` | 57 | /app, /app/account/delete, /app/availability, /app/availability/agreement … |
| `span.` | 57 | /app, /app/account/delete, /app/availability, /app/availability/agreement … |
| `span.login-brand-module` | 57 | /app, /app/account/delete, /app/availability, /app/availability/agreement … |
| `small.` | 57 | /app, /app/account/delete, /app/availability, /app/availability/agreement … |
| `button.` | 4 | /app/availability, /app/employees, /app/inbox, /app/notifications |
| `b.` | 3 | /app/schedule, /app/schedule/coverage, /app/schedule/publish |
| `strong.` | 3 | /app/exchange/callout, /app/exchange/swap, /app/timecards/corrections |
| `a.q-nav__l` | 3 | /app/clocker-recovery, /app/employees/QA-SCAN-A/clocker-pin, /app/requests |
| `a.q-nav__r` | 3 | /app/profile, /app/profile/device-alerts, /app/profile/passkeys |
| `h1.` | 3 | /app/profile, /app/profile/device-alerts, /app/profile/passkeys |
| `span.b-live__v` | 2 | /app, /app/requests/hub |
| `button.c-select-btn.c-sched-loc` | 2 | /app/schedule, /app/schedule/coverage |
| `span.c-meta.c-sched-weekstate` | 2 | /app/schedule, /app/schedule/coverage |
| `th.cm-grid__corner` | 2 | /app/schedule, /app/schedule/coverage |
| `span.cm-grid__dayhours.c-num` | 2 | /app/schedule, /app/schedule/coverage |
| `h1.c-shift__title` | 2 | /app/schedule/new, /app/schedule/publish |
| `a.` | 2 | /app/exchange, /app/requests |
| `span.c-count.c-num` | 2 | /app/exchange, /app/requests |
| `span.b-card__meta.es-wide` | 2 | /app/exchange/callout, /app/exchange/swap |
| `legend.nv-sr` | 1 | /app/updates/compose |
| `button.c-btn.c-shift__submit` | 1 | /app/schedule/new |
| `p.c-pub__lead` | 1 | /app/schedule/publish |
| `button.schedule-generation-action.primary` | 1 | /app/schedule/publish |
| `button.schedule-generation-action.secondary` | 1 | /app/schedule/publish |
| `button.c-btn.c-btn--secondary.c-btn--full` | 1 | /app/schedule/publish |
| `a.c-btn.c-btn--secondary.c-btn--full` | 1 | /app/schedule/publish |
| `button.c-btn.c-btn--secondary` | 1 | /app/schedule/settings |
| `span.b-segs__i` | 1 | /app/timecards/corrections |
| `time.` | 1 | /app/timecards/corrections |
| `span.correction-comparison__chg` | 1 | /app/timecards/corrections |
| `span.manager-correction-reason__k` | 1 | /app/timecards/corrections |
| `q.` | 1 | /app/timecards/corrections |
| `span.b-busy__idle` | 1 | /app/timecards/corrections/new/QA-SCAN-A |
| `a.c-link` | 1 | /app/employees |
| `p.` | 1 | /app/account/delete |
| `a.em-delete-link` | 1 | /app/account/delete |
| `span.c-empty__title` | 1 | /app/settings/time-off |
| `span.c-empty__body` | 1 | /app/settings/time-off |
| `dt.` | 1 | /app/settings/company-policies |
| `dd.` | 1 | /app/settings/company-policies |
