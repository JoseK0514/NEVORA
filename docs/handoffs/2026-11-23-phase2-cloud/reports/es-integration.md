# (Draft: browser pass and checks pending) Signed-in Spanish: integration on `claude-codex-collab-nevora-staff`, Nov 23, 2026

All the Spanish branches are combined here, for the second release. The lead merges this branch after the first
release. Nothing went to `claude-codex-collab-nevora`.

Rules followed: README "Signed-in Spanish". English is unchanged, Spanish uses tú (Puerto Rico Spanish), each area has
one `{en, es}` copy table with a key test, the server reads `readPageLang()` and the client calls `usePortalLang()`.
All data is fictional, and nothing was sent or published.

## What is merged

| Source | Taken | How |
|---|---|---|
| es-payroll 27b7b5c7, es-mobile 9e327da0, es-owner ff08df11, es-rest 6f470726 (without bdc9ea84's reports files), es-rondo 0fd0e537 | code | first merges (d2485a35) |
| shared branch `claude-codex-collab-nevora` 32732335 (includes 505d2b1e and 1e06ede4) | all | 73d941d2 |
| es-rest 00f7ac71 (b03450da, cc60de9b, the shared-tip merge, report b401bc95) | all | 2f3a42ff |
| es-employee 3d56fb1f (c72a2b5b … e6e613fd, f198f7f2, 06606316 whole, report 0ee44941) | all | 5e873760 |
| es-owner 53e70934 (eb750176, report) | all | 060ef054 |
| screens-final 23474a05 (b32b3193 356cf38c d16ecfb9 b21c6601, report) | all | dfbbe518 |
| payroll-2 d9282e71 (`<html lang>` only; the rest of that branch is payroll work) | cherry-pick | a7fff9e8 |
| timecards-final 093f5ca0 (8347506a plus its shared-tip merge) | all | e09b9b06 |

### How the conflicts were settled

- **Insights and Christmas bonus:** es-rondo's files win: `reports.tsx`, `christmas-bonus-report`,
  `christmas-bonus-copy.ts` and the year menu. es-rest's `christmas-bonus-copy.test.tsx` checked es-rest's own copy, so
  it is dropped. "Informes" stays.
- **Team directory:** es-employee's `employee-team-copy` and `employee-directory.tsx` are taken. The location Manager's
  Team (`scoped-team.tsx`) takes screens-final's `access-copy`. My own `team-list-copy.ts` duplicated both, so it is
  removed.
- **Closed and unavailable notices, the scoped person page, Refresh:** screens-final's `access-copy` versions are taken.
  On top of them, the read frame keeps the shared branch's 505d2b1e (a lapsed page stays in place under the state
  screen), the scoped person page reads its own language, and the band trims the plural "no disponibles" too.
- **Scheduling rules** (`/app/schedule/settings`): screens-final's fully translated page is taken.
- **Exchange:** screens-final's page copy is taken; `shiftPlace` and `shiftChangeFeedback` get `lang`. The tab titles
  keep `generateMetadata` (route-titles.ts), so they follow the person; screens-final's static English titles are not
  used.
- **Employee parts** (`employee-b/parts.tsx`): es-employee's `wallTime`, `BDay` and `Dotted` with `lang` are taken. The
  weekday drops the "." that es-PR writes ("sáb", not "sáb.").
- **Close open punch:** timecards-final's Spanish kit card is taken over the older Spanish form already on staff. When
  the English kit card reaches the shared branch, keep this file's Spanish wiring on top of that layout.
- **Imports:** after each merge I checked every file in `src` for an import name brought in twice (the problem
  e6e613fd fixed). None remain, and the merges left three unused `readPortalLanguage` imports, which are removed.

## Cross-area gaps closed on this branch

| Commit | Gap |
|---|---|
| 09191803 | Things to do (manager-inbox-corp): new `manager-inbox-copy.ts` (group and card titles, status lines, pay-period and timecard lines, empty and error states, More card); `UnsupportedNativeRole` and Home's `actionCenterNavigation` get `lang`; repair title and line (`time-off-staffing/present`) in Spanish |
| e2ff1294 | `shiftPlace`/`shiftChangeFeedback` callers (exchange, phone requests and creation), `CorrectionComparison` (phone, delegated form), `PositionQuotaFields`; kit `CorpTime`/`timeParts` write "a. m./p. m." with `lang="es"` (the roster passes it) |
| c7ff2810 | Owner and Manager Home date label and greeting in the person's language; the corporate Home status sentence; preset Spanish "Localidad/Localidades" |
| daa9718d | Spoken "Loading…" and the slow-loading card; the access notices' callers pass `lang` (superseded in part by screens-final's copy) |
| 04b18b77 | Owner advisor attention titles and the server's known sentences in Spanish; the period review's issue lines use tú and "localidades"; 16 route tab titles from `route-titles.ts` |
| f9e1db81 | `presentItem` writes its own words in Spanish (request kinds, "enviada el …", planning titles, coverage titles, correction kinds) |
| 88531f9a | `Dotted` gets `lang` in own-leave-note and manager-profile-live; Messages uses `messageTime(…, lang)` instead of rewriting English |
| 54b3e394 | One spelling: "período" (224 uses) replaces the 30 "periodo" |
| 4d261595 | More: `availabilitySummary` never got the language (`.then(availabilitySummary)`), so the summary read "6 days a week" in Spanish |
| 6a873b26 | Phone Profile: the hint "Sign-in pages only. The rest of NEVORA is in English for now." is no longer true and is removed, as es-employee removed it elsewhere |

## Still English or open (to assign)

- **Week grid** (`manager-weekly-roster.tsx`, about 42 strings, and `components/schedule`): only the times follow the
  language, through CorpTime. The live words ("Clocked in", "On break") come from `ATTENDANCE_WORDS` there.
- **Shift form, Find cover, Review replacement, ManagerShiftRequests** (screens-final's list).
- **Time corrections queue** (`manager-time-corrections.tsx`, about 17 strings; `employee-time-corrections.tsx`, about
  22 strings). The comparison inside follows the language; the lists around it don't.
- **Employee Time screen** (`employee-b/time-b.tsx`): correct Spanish, but through the older English-to-Spanish
  rewriting (`esDate`, `esTime`, `timeWord`). Switching to the language-aware hours-model helpers is a refactor that is
  still to do.
- **TeamB's band, QuietPage's `lang` prop, "What changed in your schedule", the Time, Profile and Availability page
  titles** (employee-mobile): from the session reports, not yet checked here.
- **Server action messages** (Settings, breaks, clocker, photos, matching, employees, requests, scheduling, policies) and
  shared library sentences (`lib/reports`, notification titles, `time-zone-label`, `sinceLabel`, `formatBusinessDateTime`,
  `durationRow`): es-rest's list. The server's own sentences inside Things to do rows (dates, "N open") stay English too.
- **`clocker-owner-copy.ts`** uses formal "usted" and "ubicación" (about 15 lines).
- **momentsCopy and reminders "usted":** es-owner says eb750176 fixes moments; reminders are still to check.
- **The old ManagerActionCenter surface** stays English; it renders only on `/ui-preview`.

## Words for Jose to settle (seen across sessions)

- "Fecha de terminación" (3, es-rest part B) or "fecha de baja" (1, screens-final) for the termination date.
- "Informes" for Insights (es-rest, es-rondo); the shell nav should say the same.
- "Dueño/Gerente" (capitalised as roles) or "dueños/gerentes" in running text: both are used in role sentences.

BROWSER_PASS_PLACEHOLDER

## Checks

CHECKS_PLACEHOLDER

## For Jose to review (every session's list, collected)

COLLECTED_PLACEHOLDER
