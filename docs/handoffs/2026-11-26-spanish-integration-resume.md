# Spanish integration: where we stopped (Nov 26, 2026, about 2:20 AM AST)

Jose paused for the night. Nothing is lost: all code is on `claude-codex-collab-nevora`, and QA's partial results go to
`claude-codex-collab-nevora-qa` with their own `RESUME.md` (docs/handoffs/2026-11-23-phase2-cloud/qa/es-rc/RESUME.md).

## Done and pushed (Collab)

| Commit | What |
|---|---|
| abe50031 … 0f61b708 | Codex's Spanish patch, applied unchanged in 7 area commits on 6983360d. Patch sha256 fb134e86… matched; the tree matched 22b2f4ac exactly. |
| 6f9b4e72 | Manuals rebuilt from 0f61b708 (application hash ed2498ce…, the same digest Codex reported). check-manuals OK, 57/57. |
| d6238e07, 2c17c68a | English UI flags work list, `docs/handoffs/2026-11-26-english-ui-flags.md` (A1–A6, B1–B20, C1–C10, D1–D6, E). |
| 4c5235c5 | Spanish glossary fixes: "puñetazo"/"golpe" become "marcación", "hoja de tiempo" becomes "tarjeta de tiempo", and two others. Guard test `src/test/spanish-glossary.test.ts`. |
| d06a33c3 | Try again has a real loading state on all three error screens (`useRetry`, `RetryLabel`, `BButton keepFocus`). |
| f0c2edbd | QA's copy-slip batch: glossary words, usted becomes tú, wrong-sense lines ("shift" had been "cambio"). |
| 447e6afe | The portal's top-level error screen (AppErrorScreen) reads the person's language (it was English only). |
| e9d92a7b | Spanish sheet headers stack at enlarged text on phones (Cancelar overlapped "Puede marcar en…"). |

Checks on e9d92a7b: tsc clean, lint 0 errors (4 old warnings), and 16,960 tests pass.

**Known failure:** `src/test/manual-publication.test.ts` fails on the tip because app code changed after the 6f9b4e72
build. That's expected; the last step below clears it.

The English wording was checked: every English phrase the patch moved, including payroll, tax, legal and billing,
sits word for word in the copy tables.

## QA so far (on 0f61b708)

- The readiness-ui production gate and the concurrency run passed: Chromium 7, WebKit 7, 20 and 20, 0 errors.
- QA paused cleanly at 06:31 UTC and pushed everything to `claude-codex-collab-nevora-qa` at **49362f53**: the partial
  sweep, 2,000 shots, probes and RESUME.md. Nothing is running. The sweep reached **2,000 of 2,148 views**: Chromium is
  complete, and WebKit still needs Employee ES at 390 at 200% and 1440, the public pages and the kiosk (148 views).
- Before the pause, the full sweep in both languages had reached about 1,572 of 2,200 views. It found no hydration errors, raw keys, html
  lang mismatches, overflow or HTTP errors. Its two findings are fixed: the copy slips (f0c2edbd) and the header
  collision (e9d92a7b).

## To do tomorrow, in order

1. QA resumes from its RESUME.md:
   - the rest of the sweep;
   - item 3, the English compare with the 6801e035 baseline, and the commerce build for the Plan y facturación switch;
   - the Try again check on the newest tip, including first-paint sampling of the Spanish AppErrorScreen;
   - the Spanish delta sweep, which covers every FormHead sheet at 390 and 390 at 200%, plus English spot checks.
2. Fix anything it finds in one batch, then run tsc, lint and the whole `src` suite.
3. Final manual rebuild from the actual application commit (screens-final session; it hands the build back as a git
   bundle on its branch, because screens-final's own Spanish is superseded, so don't reconcile it). Fast-forward Collab
   to the build, then run `node scripts/manuals/check-manuals.mjs` and the 57 manual tests.
4. Report the final Collab SHA and all results to Jose.

Estimate if nothing new turns up: about 2 hours. Running the Try again check and the delta sweep in a second session
saves 30–45 minutes; Jose hasn't decided on that.

## Decisions waiting for Jose

1. "Ponche/ponchar" for a clock punch. The glossary says "marcación", but Jose approved "Sin ponchar" as a compact label
   and "reloj de ponche" is everyday PR Spanish. Use "marcación" everywhere, or keep "ponche" where it reads naturally?
2. "Espacio de trabajo" on sign-up and account deletion (onboarding and privacy wording). The glossary says "empresa".
   Change it or keep it?
3. Merging into `development`: the go is still pending, now with the Spanish included.
4. Sending the "View paused" change to Codex for the next round: pause only when the tab is hidden or closed, and keep
   typed choices on Try again.
5. The English UI flags list: when to start, P1s first (B4, B18, D1, D3, D4). A6 is the in-card Try again buttons.

## Sessions

- QA: session_01N2UNZCWA6MJyjA2upDwUp8 (branch claude-codex-collab-nevora-qa).
- Guides: screens-final, session_01N2UNZE3yYrspDPY2ekAhm5.
- `development` was unchanged at 12263073 when this started. Check again before resuming.
