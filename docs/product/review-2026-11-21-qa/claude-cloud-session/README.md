# Evidence from Claude's cloud session (Nov 21–22, 2026)

Everything this session produced or was shown, so the desktop session and Codex have it. The plan, decisions and
audit write-ups are in [docs/handoffs/2026-11-22-qa1121-fix-plan.md](../../../handoffs/2026-11-22-qa1121-fix-plan.md).
All data is fictional.

## employee-scan-390/

Employee phone screens at 390px from `tools/ui-scan/desk.sh` (fictional rich data, throwaway Postgres), taken on
`57e58b92` before any QA fix. `-fold` files show the first screen; the others are full pages. Basis for the Employee
text audit (Home is about 2.3 screens; Schedule, Time and Requests about one each).

Command used:

```bash
SCAN_USER=postgres W=390 tools/ui-scan/desk.sh /tmp/nevora-scan/emp \
  /app,/app/schedule,/app/my-time,/app/my-pay,/app/requests \
  "NEVORA_SCAN_AS=emp NEVORA_SCAN_ACTOR=1 NEVORA_SCAN_EMPROLE=EMPLOYEE NEVORA_SCAN_RICH=1"
```

## reading-size/

The 15.5px vs 16px vs 17px reading-text comparison: a mock built from the Direction B tokens and the self-hosted Inter,
not a live screen. `compare.html?w=390` opens it in a browser from this folder; `measure.cjs` re-renders it with
Playwright and prints the line counts (`node measure.cjs <this folder>`).

Measured (Chromium, Inter loaded):

| Width | Today (15.5px, notes 14px) | 16px | 17px |
|---|---|---|---|
| 390 | page 1078px; assistant answer 3 lines | 1118px (+40); 4 lines | 1130px (+52); 4 lines |
| 320 | page 1122px; request note 6 lines | 1187px (+65); 7 lines | 1226px (+104); 7 lines, assistant 5 |

At 17px the note (regular) outweighs the person's name (15.5px semibold); 16px keeps the name leading.

## jose-screenshots/

The screenshots Jose shared during the session, with the audits based on them:

- `owner-phone-five-screens.webp`: Owner phone Home, Schedule, Payroll, person and Rondo AI (density audit).
- `timecards-bulk-bar-desktop.png`: Timecards with the "Selected action" select and "Review selected timecards"
  (options A and B).
- `rondo-coverage-draft-desktop.png`: Rondo's coverage and attendance forms and the draft card (buttons and the green
  success mark on a draft).

## premium-kit/

- `nevora-premium-components.zip`: the kit from the draft release `handoff-premium-components-2026-11-21`, SHA-256
  `e3361bb8cca45c727309d1d7db945ab4025448b9a38382eb8990931bd59852f3`. Extract it outside the repository before applying
  its patch (see its `START-HERE.md`).
- `gallery-1440.png`, `gallery-390.png`: the gallery opened in Chromium (0 network requests, 0 errors).

Verification results are in the handoff note under "Premium component kit".
