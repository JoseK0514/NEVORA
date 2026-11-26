# Spanish integration release check: final report

**Status: done (2026-11-26).** Every item passes, and every finding from this check is fixed and verified on a later commit.
Open items are low or pre-existing; see the last section.

## Setup

- Production build (`next build`, `next start`) at the owned https test origin, behind the loopback TLS proxy.
- A throwaway local PostgreSQL with fictional people and tablets.
- Chromium and WebKit from Playwright 1.62.1.
- "Open billing in Velani" was never pressed.

## Commits tested

| Commit | What ran on it |
|---|---|
| `0f61b7085` | Item 1, and the first 2,000 sweep views (the pause on Nov 25) |
| `d3ac07e2c` | The two LOW layout fixes; the 148 remaining WebKit views; the three overlaps to confirm; item 3; Try again, first pass |
| `6801e035a` | The English baselines for item 3 |
| `445ab237c` | Jose's wording: "ponche/ponchar" and "empresa". The Spanish delta sweep; the kiosk in Spanish; English sheets; billing |
| `50acd2647` | Try again, R1 and R2 fixes; D1 evidence |
| `190866dd0` | D1 fix (the Hours and rules sheet); English sheets stacking at large text; one rule save |
| `d245a5c5a` | Try again: recovery focus (O1) and the prefetch count (O2) |
| `95e390851` | Try again: O1 at 1440 (first visible heading). **Final tip checked.** |

## Verdict per item

| # | Item | Result |
|---|---|---|
| 1 | readiness-ui production ×1 and concurrency ×1 (`0f61b7085`) | **PASS**: Chromium 7 and WebKit 7, 0 errors; concurrency 20 and 20, 0 errors |
| 2 | Both-language sweep: every role in EN and ES at 390, 390-200 and 1440, both engines (2,148 views on `0f61b7085` and `d3ac07e2c`) | **PASS** after fixes: the header collision (HIGH), the copy slips and both LOW layout items are fixed and verified |
| 3 | English regression against `6801e035`: Clocker, the iPad name flow, Payroll settings, Timecards, the person page, Clock in at, Clocker settings | **PASS**: no English regression. Identical records apart from F3 (fixed) and generated ids. Pixel differences are only live clocks and dates |
| 4 | Spot checks: Editar turno saving label; Plan y facturación language switch; Equipo return focus | **PASS** for the first two. Equipo return focus is A1 on the English list: pre-existing and out of this release |
| — | Try again on AppErrorScreen and BRouteError, EN and ES, both engines, reduced motion, first paint | **PASS on `95e390851`** |
| — | Spanish delta sweep on the wording tip (`445ab237c`): every role, ES 390 and 390-200, both engines (744 views), plus the kiosk and English sheets | **PASS** after D1 (fixed on `190866dd0`) |

## Findings and how each closed

| ID | Severity | Finding | Closed on |
|---|---|---|---|
| ES-H1 | HIGH | "Cancelar" collided with "Puede marcar en" at ES 390-200 (`team-forms.tsx` FormHead) | `445ab237c`: stacked; "Puede ponchar en" verified in both engines |
| ES-C | HIGH | Machine-translation slips ("Puñetazo" and others; see `copy-slips.md`) | `f0c2edbd`, then Jose's wording in `445ab237c` |
| L1 | LOW | `/clocker/not-a-real-key` scrolled sideways at 390-200 (41px EN, 28px ES) | `d3ac07e2c`: 0 overflow in both engines |
| L2 | LOW | The signed-out footer links overlapped on `/privacy` and `/support` at 390-200 | `d3ac07e2c`: 0 overlap in both engines |
| R1 | MEDIUM | AppErrorScreen showed no busy state, and a second press refreshed again: the screen remounted and lost `busy` | `50acd2647`: "Trying again…", `aria-busy` and `aria-disabled` at 80 ms; exactly 1 refresh after a second press |
| R2 | MEDIUM | AppErrorScreen was English for a Spanish signed-in person: it trusted `<html lang>`, which is "en" for a session | `50acd2647`: Spanish from first paint (300 ms), no swap |
| D1 | LOW–MEDIUM | Hours and rules (`?edit=rules`): on phones, the back link was white on a white band (about 1:1) and invisible; the title was cut at 390-200 in EN and ES; the back link overlapped the title at 1440 | `190866dd0`: teal band, back link at 6.8:1 (390) and 7.3:1 (1440), title whole, 0 overlap in 144 views; one rule save sends exactly 1 POST and the revision goes +1 |
| O1 | LOW | Focus after recovery went to `<body>`: AppErrorScreen everywhere; BRouteError at 1440 (it focused a hidden phone h1) | `d245a5c5a` (AppErrorScreen) and `95e390851` (BRouteError): the h1 in all 16 runs |
| O2 | — | A second round of RSC requests in WebKit | Not a defect: one press gives 1 page request plus 4 prefetches in both engines |

**Not defects, confirmed on screen:**
- The Horario band "Pendiente" overlap and Horario at 1440 "Staffing 30%": the overlapping text is visually hidden.
- Mi tiempo at ES 390-200 wraps to "Esta semana ·" / "23–29 nov". The no-break space in `26ea2631` keeps the dot with the first part.
- The kiosk company chip at ES 390-200 now sits on one line below the brand: an intended improvement from the Spanish layout work.
- The Timecards sr-only live line reads as clipped.

## Spanish delta details (`445ab237c`)

- **Sweep (744 views):** 0 overflow, hydration, lang mismatch, raw keys and wrong-language words.
- **"Ponchar" and "empresa":** they read correctly across the sweep text.
- **Kiosk in Spanish, both engines, at 768, 1024, 390 and 390-200:**
  - Ready screen: "Ponchar entrada", and after the punch "Ponchar salida". Success: "Entrada registrada".
  - Picker, PIN, Use Employee ID and roster failure are all clean.
  - "Ponchar entrada" wraps inside its pill at 200%.
- **English sheets (13), both engines:** 12 were clean; the 13th was D1, now fixed.
- **Billing language switch, both directions, both engines:** words and `<html lang>` follow, and a reload keeps the choice.

## Open items

| Item | Severity | Note |
|---|---|---|
| PublicErrorScreen not reached in a browser | Coverage gap | 11 signed-out route and table pairs render their own states. Covered by unit tests, and it shares `useRetry` with AppErrorScreen. Accepted by the lead |
| Sign-up `/onboarding` and `/onboarding/verify` are 404 in the owned build | Coverage gap | Onboarding is off in the fixture. `/onboarding/activate`, `/account-deletion` and `/app/account/delete` are clean in ES |
| axe `label-content-name-mismatch` on `/app/schedule` (1, or 2 with `?week`) and `/app/schedule/coverage` (1) | LOW, pre-existing | Both languages; the same on `6801e035` |
| Console: a 404 resource on `/app` and `/app/notifications`; a 403 on `/app/inbox` and `/app/timecards/corrections` (Manager and Scoped Manager) | LOW, pre-existing | Both engines and languages; the 404 is the same on `6801e035` |
| `/welcome`, `/access-help`, `/access-help/id` and `/clocker/access/paused` are 404 in the owned build | Info | Probably a feature flag off in the fixture |
| Equipo return focus: after Back from a person to Team, focus is on `<body>`, not the row | LOW, pre-existing | A1 on the English UI list (restore filter, scroll and focus). Not in this release |
| Transient label crossfade samples on Try again | Cosmetic | At 80–120 ms the button sometimes reads both labels ("Try againTrying again…") or has zero width mid-swap. `aria-busy` holds, and nothing shows in shots |
| WebKit "Load failed" / "access control checks" pageerrors on aborted prefetches | LOW, known | The same family as G69 and F4; no visible effect |

## Evidence

- **Folders:** each run folder (`run-d3ac07e2c`, `run-445ab237c`, `run-190866dd0`, `run-d245a5c5a`, `run-95e390851`) holds the JSON or gzipped JSONL results and the shots. `data/` and `shots-0f61b7085/` hold the first sweep.
- **Probes and queue scripts:** in `../probes/`, ending in `.txt`.
- **Copy:** see `copy-slips.md`.
