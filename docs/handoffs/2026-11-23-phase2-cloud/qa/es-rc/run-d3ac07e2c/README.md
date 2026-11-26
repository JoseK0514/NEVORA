# Queue on d3ac07e2c (2026-11-26), interim

Production build at the owned https origin, fictional data, throwaway Postgres, Chromium and WebKit (Playwright 1.62.1).

| Step | Result |
|---|---|
| 1. The 148 WebKit views left from the pause, plus a full WebKit Employee pass (216 views) | Clean: 0 overflow, clipping, axe, hydration, lang mismatch, raw keys or wrong-language words |
| 2. The three overlaps to confirm, the two LOW fixes and the spot checks (96 views) | All three overlaps are false positives (text hidden or wrapped). Both LOW fixes verified in both engines. Editar turno "Guardando…" passes; the Equipo return-focus probe timed out (a probe issue, rerun on 445ab237c) |
| 3. English regression against 6801e035 | PASS. Clocker step 1 and step 2 are identical apart from F3 (fixed) and the generated ids; the scan6 name flow's 44 records are identical; Payroll settings, Timecards, the person page, Clock in at and the Clocker settings are identical, and 16 of 20 shots are pixel-identical (the other 4 differ only in a live minute counter) |
| 3. Billing | Both states are correct in EN and ES. The switch probe missed the button (its name is "Language: Español"); fixed, rerun on 445ab237c |
| 4. Try again | R1 MEDIUM: no busy state at 80 ms, and a second press refreshes again (the screen remounts). R2 MEDIUM: AppErrorScreen is English for a Spanish signed-in person (it trusts `<html lang>`, which is "en"). Both fixed at 50acd264; recheck queued |

Intended change recorded: on the kiosk at ES 390-200 the company chip now sits on one line below the brand (from the Spanish
layout work).

Data is in `data/` (JSON and gzipped JSONL, one line per view). Shots are in `img/`.
