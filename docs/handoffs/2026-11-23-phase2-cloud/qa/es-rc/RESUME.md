# Spanish integration release check: DONE

**Done 2026-11-26.** The check finished on `95e390851`. The verdicts, every finding with how it closed, and the open items
are in `report.md`. Nothing is queued and nothing is running. The checkout `/home/user/NEVORA` is back to a clean
detached tip, and the throwaway Postgres instances are stopped by each run.

The note below is the pause from Nov 25, kept for the record.

---

# Spanish integration release check: paused, how to resume

Paused 2026-11-26 06:31 UTC at the lead's request (Jose stopping for the night). Nothing is running: the probe, the app
servers, the browsers and the throwaway Postgres are all stopped, and the checkout `/home/user/NEVORA` is clean at
`0f61b7085`. All scratch tools are in `../probes/`. Code files there end in `.txt` so the repository's typecheck and lint
skip them; remove `.txt` to use them.

## What was swept

The sweep ran on commit **`0f61b7085`**, a production build at the owned https origin, with fictional data on a throwaway
Postgres. The results apply to `d6238e07`, which has the same application code. Probe:
`../probes/es/zz-probe/es-sweep.integration.ts.txt`.
- **Views:** 2,000 of 2,148 done.
  - **Chromium:** complete, 1,080 views. That's every role in EN and ES at 390, 390 at 200% and 1440:

    | Role | Routes |
    |---|---|
    | Owner | 69 |
    | Manager | 29 |
    | Scoped Manager | 29 |
    | Lead | 17 |
    | Employee | 17 |
    | Public | 16 |
    | Clocker kiosk | 3 |

  - **WebKit:** 920 done.
    - Complete: Owner, Manager, Scoped Manager and Lead in EN and ES; Employee in EN at all three sizes and ES at 390.
    - Not done (148 views): Employee in ES at 390 at 200% and 1440 (34), all public pages (96) and the Clocker kiosk (18).
    - The last 12 Employee ES rows in `views.jsonl` are "browser has been closed": the stop, not a defect.
- **Raw results:** `data/sweep-0f61b7085-partial.jsonl.gz`, one JSON line per view.
  - A known probe bug: each line's `lang` field holds the language-check result and overwrites the requested language.
    `../probes/es-analyze.py.txt` rebuilds the language from the run order (role, then EN before ES, then view, then
    route).
  - The analysis is in `data/sweep-0f61b7085-partial-analysis.txt`. All 2,000 screenshots are in `shots-0f61b7085/`.

**Item 1 PASS** on `0f61b7085`:
- readiness-ui production ×1: Chromium 7 and WebKit 7 checks, 0 errors.
- Concurrency dev ×1: 20 and 20 checks, 0 errors.

## Findings so far

**HIGH, Spanish only: header collision, fix on the shared branch.**
- **Screen:** Persona → Puede marcar en (`/app/employees/<id>?edit=clocker`) at 390 with 200% text, Chromium and WebKit.
- **What happens:** "Cancelar" overlaps the title "Puede marcar en", and the title is cut off. English ("Cancel" / "Clock
  in at") fits.
- **Where:** FormHead in `src/components/team/team-forms.tsx:16-24`, band rules in `src/app/app/owner-b-pages.css:114`.
- **Fix:** the lead made the stacked header general for Spanish phones with enlarged text, in the commit after
  `447e6afe` (`src/app/app/b-thirty-day.css`, end). It needs the delta recheck below.
- **Shots:** `img/chromium-owner-es-390-200-app-employees-SWEEP-A-edit-clocker.jpg` and the matching `-en-` and `webkit-`
  files.

**HIGH, copy: fixed on the shared branch at `f0c2edbd`.**
- "Puñetazo" for a punch, and the other machine-translation slips.
- Full list with file:line in `copy-slips.md`.
- Left as Jose's call: "ponche/ponchar" and "espacio de trabajo".

**MEDIUM, fixed at the newest tip (unverified): AppErrorScreen was English only.**
- `src/components/app-error-screen.tsx:47-60` had its words hard-coded in English.
- The lead's fix reads `<html lang>`, then the `nv-lang` cookie, then the browser.
- Verify with the Try again check, including the first-paint English → Spanish swap.

**LOW, both languages, so not from the Spanish integration: Clocker invalid-key page overflows.**
- `/clocker/not-a-real-key` scrolls sideways at 390 with 200% text: by 41px in English and 28px in Spanish (Chromium;
  WebKit not reached).
- Shot: `img/chromium-clocker-es-390-200-clocker-not-a-real-key.jpg`.

**LOW, both languages: signed-out footer overlap.** On `/privacy` and `/support` at 390 with 200% text, the footer's "Terms"
and "Account deletion" links (Spanish: "Términos" and "Eliminar cuenta") overlap by about 62px tall. Shot:
`img/chromium-public-es-390-200-privacy.jpg`.

**To verify on resume** (flagged by the overlap check, not yet confirmed visually):
- **Mi tiempo** (`/app/my-time`), Employee and Lead, ES only, 390 at 200%: "Esta semana ·" overlaps "23–29 nov". Compare
  the `-es-` and `-en-` shots of `chromium-employee-*-390-200-app-my-time.jpg`.
- **Horario** (`/app/schedule`), ES at 390 (EN only at 200%): "Pendiente" overlaps "Turnos disponibles y cambios". A first
  crop showed nothing visible, so it's probably the band's status badge.
- **Horario at 1440,** both languages: "Staffing 30%" overlaps "Mon" (EN; Spanish "Personal 30%"). Seen in earlier QA
  passes too, probably the coverage bar over the day labels.

**Pre-existing, both languages, unchanged by this integration:**
- **axe:** `label-content-name-mismatch` on `/app/schedule` (1 node; 2 with `?week=`) and `/app/schedule/coverage` (1).
- **Console:** a 404 resource on `/app` and `/app/notifications`, and a 403 on `/app/inbox` and
  `/app/timecards/corrections` (Manager and Scoped Manager). Both engines. The same 404 shows on 6801e035.
- **404 pages:** `/welcome`, `/access-help`, `/access-help/id` and `/clocker/access/paused?…` are 404 in this owned build.
  The pages exist in source on every commit checked, so this is probably a feature flag off in the fixture. Confirm on the
  `6801e035` baseline.

**Clean across all 2,000 views:**
- 0 hydration errors (#418, #423, #425, "Hydration").
- 0 `<html lang>` mismatches.
- 0 raw copy keys, `undefined`, `NaN` or unreplaced `{placeholders}`.
- 0 English left inside Spanish screens and 0 Spanish inside English screens by the word-list check. People data and brand
  names are excluded.
- 0 HTTP errors on signed-in routes.

## Resume: the queue, in order

Run everything as root from `/home/user/NEVORA`. The scripts are in `/home/user/qa-tools/`, which may not survive a new
container. In that case, copy them back from `../probes/` and remove the `.txt` from the `zz-probe` files and the
vitest configs. Each script needs the checkout at the right commit and a clean tree.

1. **Rest of the sweep.** On `0f61b7085`, WebKit only, the parts not done. Then append the new `views.jsonl` to the
   partial one and analyze. The language order differs per run, so analyze per run.
   ```bash
   git checkout --detach 0f61b7085
   ES_ENGINES=webkit ES_ROLES=employee ES_LANGS=es ES_VIEWS=390-200,1440 ES_SPOT=0 /home/user/qa-tools/es.sh rest1-0f61
   ES_ENGINES=webkit ES_ROLES=public,clocker ES_SPOT=1 /home/user/qa-tools/es.sh rest2-0f61
   ```
   The second line also runs the item 4 spot checks (Equipo return focus, Editar turno saving label) at its end. They
   need the owner sign-in, so add `owner` with `ES_ROUTES=/app` to keep it short.
2. **Item 3, English regression against `6801e035`.**
   ```bash
   CLK_ONLY=views,step2 /home/user/qa-tools/clk.sh new-0f61          # compare with /home/qa-evidence/clk-r6801-all (or ../clocker-rc)
   /home/user/qa-tools/scan6.sh cr-names-0f61 chromium "NEVORA_SCAN_CLOCKER_FLOW=names NEVORA_SCAN_PUNCH=1 NEVORA_SCAN_PINKEY=1"
   /home/user/qa-tools/bill.sh new-0f61                                # also item 4's Plan y facturación language switch
   git checkout --detach 6801e035a
   ES_ROLES=owner ES_VIEWS=390,1440 ES_LANGS=en ES_SPOT=0 ES_ROUTES=/app/settings/payroll,/app/timecards,/app/employees/SWEEP-A,/app/employees/SWEEP-A?edit=clocker,/app/settings/clocker /home/user/qa-tools/es.sh base-6801
   /home/user/qa-tools/bill.sh base-6801
   ```
   `es-after.sh` chains exactly these. The `scan6` baseline is `scan6-cr-names` from the 6801e035 run (in `../clocker-rc`).
   Compare the English text (`text` in each view) and the screenshots pixel by pixel, at 390 and 1440.
3. **Try again check on the newest shared tip,** with the first-paint sampling (the AppErrorScreen language swap):
   ```bash
   git fetch origin claude-codex-collab-nevora && git checkout --detach origin/claude-codex-collab-nevora
   /home/user/qa-tools/retry.sh tip-$(git rev-parse --short=9 HEAD)
   ```
   - **How it works:** errors are forced by renaming one table on the throwaway DB. The probe tries candidates and logs
     which one yields each screen.
   - **Records:** idle, busy at 80 ms, a second press, failed again with focus, recovered with focus, reduced motion and
     390 at 200%, in EN and ES, both engines.
   - `es-after2.sh` chains it.
4. **Spanish delta sweep on the same newest tip,** including every FormHead sheet, then an English spot-check of the
   sheets:
   ```bash
   ES_ROLES=owner,manager,scoped,employee,lead,clocker ES_VIEWS=390,390-200 ES_LANGS=es ES_SPOT=0 ES_ENGINES=chromium,webkit /home/user/qa-tools/es.sh delta-<tip>
   ES_ROLES=owner ES_VIEWS=390,390-200,1440 ES_LANGS=en ES_SPOT=0 ES_ENGINES=chromium,webkit ES_ROUTES=/app/employees/SWEEP-A?edit=clocker,/app/employees/SWEEP-A?edit=1,/app/employees/SWEEP-A?edit=positions,/app/employees/SWEEP-A?edit=rules,/app/employees/new,/app/employees/import,/app/payroll/import,/app/ai-manager/business,/app/ai-manager/knowledge,/app/schedule/edit?shiftId=es-shift-1,/app/schedule/new,/app/updates/compose,/app/settings/locations/new /home/user/qa-tools/es.sh delta-en-<tip>
   ```
   - The Owner route list in the probe already includes `?edit=1`, `?edit=positions` and `?edit=rules`, so the analyzer's
     Owner count is 72 for these runs.
   - Before/after shots of Puede marcar en: before is
     `img/chromium-owner-es-390-200-app-employees-SWEEP-A-edit-clocker.jpg`; after comes from this run.
   - `es-after3.sh` chains both commands.

Approximate times: 1 is 15 min, 2 is 45 min (four builds), 3 is 15 min and 4 is 40 min.
