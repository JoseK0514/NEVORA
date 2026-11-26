# Spanish integration release check: draft (paused)

Tested `0f61b7085` (application code identical to `d6238e07`). Production build at the owned https origin, fictional data,
throwaway Postgres, Chromium and WebKit from Playwright 1.62.1. "Open billing in Velani" was never pressed.

| # | Item | Result so far |
|---|---|---|
| 1 | readiness-ui production ×1 and concurrency ×1 | **PASS**: Chromium 7 and WebKit 7, 0 errors; concurrency 20 and 20, 0 errors |
| 2 | Both-language sweep | **In progress**, 2,000 of 2,148 views (Chromium complete). One HIGH Spanish-only finding, now fixed but unverified. The rest are pre-existing or to verify; see RESUME.md. |
| 3 | English regression against 6801e035 | **Not run yet** (queued) |
| 4 | Spot checks: Equipo return focus, Editar turno saving, Plan y facturación language switch | **Not run yet** (queued; the probes are ready) |
| — | Try again loading state (lead's request) | **Not run yet** (queued; probe ready, with first-paint sampling) |
| — | Spanish delta sweep of every FormHead sheet on the newest tip | **Not run yet** (queued) |

Findings with severity, file:line and shots are in `RESUME.md`. The copy slips are in `copy-slips.md`.
