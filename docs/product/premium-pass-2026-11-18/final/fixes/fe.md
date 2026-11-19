# FE: the Clocker kiosk, final premium pass (Nov 18, 2026)

Fix builder FE. Input: final review E (`p9/fin-review-e.md`: 0 blockers, 11 visible, 16 polish). Worktree `U/wt/fe`,
detached temporary commits on base `9841ca526` (last: `1225685b4`; the final pictures are from `983968e0b`, which differs
from it only in one test's typing). Patch: `p9/fe.patch`. Evidence: `p9/fe-evidence/`
(`before-*` from `cap/fin30-clocker-en`, `fin30-clocker-es`, `fin30-kiosk`; `after-*` from my final runs). Nothing pushed, no
branch created or moved, nothing committed in the main checkout.

**Release sequence and environment (unchanged).** Fictional data on the local harness only (owned loopback PostgreSQL,
Next dev built from the committed tree, Playwright Chromium; no real email, SMS, provider or paid call). Codex integrates
and verifies the combined backend and UI on Development; the exact verified release goes to main and production only after
Jose approves. This patch authorizes no merge, activation or production step.

Presentation only: markup, client state that only chooses what to draw, copy, styles and tests. No punch, PIN, lockout,
journal, offline queue, photo or enrolment logic changed, and no request, route, server module or contract. The kiosk's
media queries are its own established orientation and em-height queries (the file's pattern; the B8 alias guard does not
list the kiosk sheets) plus `forced-colors`; no new `!important`; new colours are tokens except the glass veil's band colour (no token exists; see the coordinator note).

## Rows (27)

| # | Sev | Status | What changed | Evidence (`p9/fe-evidence/`) |
|---|---|---|---|---|
| 1 | visible | fixed | Decision 2 built. `clocker-icon.tsx` gains `unknown` (Question). Amber Question on Check your last punch (before and after the check), "Your earlier punch wasn't recorded", "Someone else's punch is waiting", Setup not confirmed, and the photo path's punch and photo "not confirmed" states. The circular arrow is now only Refresh and Try again (it also left "Check connection" on the error screen and the "Check setup" link). Built as the brief says for "Your earlier punch wasn't recorded" (the reviewer offered Warning): the server's receipt for that punch is still `unknown` and the tablet keeps it for review. | `*-en-28-check-last-punch-1024`, `*-en-34-review-current-768` |
| 2 | visible | fixed | The map: `stop` is WarningCircle (was XCircle), amber `warning` is the Warning triangle (was WarningCircle). Every red message that drew the amber glyph now asks for `stop` (wrong PIN, the identity alert, setup refusals), so red is always the circle and amber the triangle: "This will also end your current break.", the photo receipt note, punches off and the setup punch note show the triangle. The storage card is red WarningCircle (it stops the person). | `*-en-24-unavailable-1024`, `*-en-56-storage-1024`, `*-en-40-photo-receipt-note-1024` |
| 3 | visible | fixed | One tone per outage. The band has a stop tone (coral `--b-coral` dot, 3px halo) for no connection, NEVORA not reached, a tablet to set up again and punches that can't be saved; a pause stays amber. Setup with no connection reports "No connection" in red to the band (new `offline` status). Offline is red everywhere: the cards, the clock screen's note and the "checks again" line on Check your last punch. | `*-en-44-not-reached-768`, `*-en-42-ready-offline-1024`, `*-en-56-storage-1024` |
| 4 | visible | fixed | "Can't reach NEVORA" draws the red WarningCircle; WifiSlash only when the browser reports the network gone. The reconnect card also moves from the red tablet to WarningCircle (one glyph per meaning; listed for Jose). | `*-en-44-not-reached-768` |
| 5 | visible | fixed | One anatomy: the ring above the title, then message, hint, one button and the "clears" line, all on the white card (no grey inset, no 18px corner). The ready screen's "another location" block takes the field radius (14). | `*-en-44-not-reached-768` |
| 6 | visible | fixed | While offline the actions are drawn as secondary rows and Done is the one filled button; the actions still work as before (punch behaviour unchanged; see For Codex). | `*-en-42-ready-offline-1024` |
| 7 | visible | fixed | "Return to PIN" is gone: "Done" / "Listo" (the kiosk's word for leaving a private screen) beside a state's actions and as the only way on (storage, someone else's punch, the photo path), and "Start over" / "Empezar de nuevo" on "Enter your PIN again", where the person must sign in again. | `*-en-28-check-last-punch-1024`, `*-en-34-review-current-768`, `*-en-56-storage-1024` |
| 8 | visible | fixed | Title names the fact: "Your punch is kept on this tablet" (plural when the tablet keeps several of the person's). Body: "Your Owner can check it. You can leave this screen." Once the request is saved the button is gone and its result stands in its place, a teal information line with no done mark: "Request sent. Your Owner will see it under Clocker recovery." Focus moves to Back if the button had it. "We couldn't confirm the request…" is amber with the Question; "Ask again" stays. The button stays the quiet one (Jose's open question unchanged). | `*-es-30-request-sent-1024`, `*-en-30-help-reference-1024` |
| 9 | visible | fixed | References (receipt and help) are Inter 500 at the meta size (13.5/18), ink2, one per line with 4px between, in the 14px field tint, still selectable. Proportional, not tabular: Inter's tabular forms space the hyphens and read as monospace again (checked side by side). The setup code field is Inter too, so the kiosk has one face. | `*-en-30-help-reference-1024` |
| 10 | visible | fixed | The Owner's pages show the place as "Clocker recovery" (its Settings row, page title and tab render English; the page is called without a language), so both Spanish lines say "Clocker recovery". | `*-es-30-request-sent-1024` |
| 11 | visible | fixed | Portrait keys follow the space the rest of the step leaves: `clamp(56px, (100dvh - 12.8vw - 670px) / 4, 96px)`, 64px at 768x1024 (were 72, the minimum of the old formula). The card ends at y 991 like every other portrait state; about 84px at 834x1112. | `*-en-09-pin-768` |
| 12 | polish | not changed, for Jose | The lockout keeps its amber Pause (NV-171) and Recording and loading keep the teal hourglass. | `*-en-27-sending-1024`; `cap/fe2-clocker-en/ck-59-pin-paused-person-*` |
| 13 | polish | fixed | Every pending setup primary keeps its teal fill with the spinner (`data-busy` while pending, not only while connecting). | `*-en-02-setup-checking-1024` |
| 14 | polish | fixed differently | The two-line reserve under the PIN field stays (NV-177, NV-180: a wrong PIN never moves the keypad). The field's help ("Your PIN is not your NEVORA password.") now holds that place and the refusal replaces it, so the band is no longer empty. The ID step's help sits under its field too; the footer holds only the language switch, at the right on both steps. The default 1024x768 PIN step measures as before (keypad 236 to 576, Continue 592 to 648). | `*-en-09-pin-1024`, `*-en-09-pin-768` |
| 15 | polish | fixed | At 800x600 a clock screen, a state card and the setup states keep 24px over the avatar or ring (only the ID and PIN steps keep 12 to fit). `.detail` wraps with `text-wrap: pretty` ("clock in." stays together). | `*-en-49-small-ready-800` |
| 16 | polish | partly | `text-wrap: pretty` on `.detail`; the state chip's dot and the band's map pin grow with the text (`max(8px, .53em)`, `max(16px, 1.07em)`; unchanged at the default size). Not changed: the band pills and the date still wrap at 200% in landscape (the workspace name and the location are the Owner's words; dropping padding would not bring them to one line in a 297px band). | `*-text200-pin-768` |
| 17 | polish | fixed | Forced colours: the band's edge is its right side as the left panel and its foot across the top (no rule down the window's edge); the card's edge is an outline, so the PIN step at 1024x768 no longer scrolls (document 768, was 770). | `*-en-55-hc-ready-768` |
| 18 | polish | fixed | "We couldn't load your time" is followed by "Nothing was recorded. Tell a manager if you need your time recorded now." Recording's title is the approved recording line ("Clocking out James…", "Registrando la salida de James…"); the duplicate line under it is gone ("Recording…" remains only when no first name is known). | `*-en-24-unavailable-1024`, `*-en-27-sending-1024` |
| 19 | polish | fixed | A break row drops its kind when the Owner's name already says it, in either language ("Meal break" over "Suggested: 30 min"); a name without it keeps "Meal · …". | `*-en-19-choose-break-1024` |
| 20 | polish | fixed | `.stack + .clears` takes the stack's 12px under a button (was 4). | `*-en-19-choose-break-1024` |
| 21 | polish | fixed | "This shift was started at another location. Use the connected tablet at that location." / "Este turno comenzó en otra ubicación. Usa la tableta conectada de esa ubicación." Spanish lines of two server sentences say "conectada"; their English keys are the server's (For Codex). | `*-es-37-other-location-1024` |
| 22 | polish | fixed | Not found: the product's red callout (red tint, 1px red edge, WarningCircle, ink title, ink2 body), "Time clock" over the title instead of "Error 404", and a full-width Try again. The kiosk's own notes follow the same callout anatomy by tone (spec 3.2): teal information, amber check, red stop, each with its 1px edge and an ink2 body (amber body text was amber-brown). | `*-en-01-not-found-1024`, `*-es-01-not-found-768` |
| 23 | polish | fixed | "El enlace de este registro de tiempo no funciona". | `*-es-01-not-found-768` |
| 24 | polish | fixed | Step 1's menu path is bound with no-break spaces in both languages, as in the alerts ("Settings → Clocker tablets." stays one piece). | `*-en-02-setup-checking-1024` |
| 25 | polish | fixed | "Tu personal ya puede marcar." | `cap/fe2-clocker-es/ck-06-setup-connected-768x1024.png` |
| 26 | polish | fixed | On Check your last punch (before and after the check), "Your earlier punch wasn't recorded" and "We couldn't load your time", Done and "Something didn't save?" share one row under the actions, as Refresh does on the clock screen. | `*-en-28-check-last-punch-1024`, `*-en-34-review-current-768` |
| 27 | polish | fixed in source, not captured | "Use this photo", "Check if the photo saved", "Send the photo again"; after a check Send it again is the filled button and Check if it saved the quiet one, with the main path's sentence ("Your last punch still isn't confirmed. Tap Send it again. It won't record twice."; the photo session resends the same command). Rings: Question for not confirmed, WarningCircle for a stop. The harness does not reach these photo states. | none (source; unit tests check the words) |

Totals: 24 fixed, 1 fixed differently (#14), 1 partly (#16), 1 left for Jose (#12). #27 is fixed in source but not seen in a
browser.

### Coordinator note: white words on the band's glass

Measured on the lightest fill pixel inside each pill (top and bottom padding rows, away from the 1px edge), against white
text. The glow is lightest at the band's top right, where the portrait band puts the workspace pill; the bare band there
already measures under 4.5:1. Fix in `clocker.module.css` only: the kiosk's glass keeps its white tint and edge over a 32%
veil of the band's own deep teal (`rgb(5 48 46)`, the band gradient's dark stop, which has no token).

| Pill (white words) | Size | Before: lightest fill, ratio | After: lightest fill, ratio |
|---|---|---|---|
| Workspace name (14px 600) | 1024x768 | #2B8782, 4.29:1 (fails) | #29736F, 5.56:1 |
| Location (15px 600) | 1024x768 | #287D78, 4.89:1 | #286C69, 6.11:1 |
| Tablet status (14px 600, 13px) | 1024x768 | #266763, 6.56:1 | #265D5A, 7.51:1 |
| Workspace name, under the glow | 768x1024 | #36938C, 3.68:1 (fails) | #327B77, 4.96:1 |
| Location | 768x1024 | #287D79, 4.88:1 | #286D6A, 6.02:1 |
| Tablet status | 768x1024 | #2D7874, 5.18:1 | #2A6966, 6.34:1 |
| Workspace name at 200% text | 768x1024 | #37938D, 3.67:1 (fails) | #327B77, 4.96:1 |

Pictures: before `cap/fin30-clocker-en/ck-09-pin-empty-*`, `fin30-kiosk/ck-02-r30-text200-pin-768x1024.png`; after
`cap/fe2-clocker-en/ck-09-pin-empty-*`, `fe-kiosk/ck-02-r30-text200-pin-768x1024.png`. Sampler (pure Python, read only):
`p9/fe-evidence/fe-glass.py <png> name=x0,y0,x1,y1 …`.

The language switch on the kiosk is teal on the white card (not glass); the not-found and paused pages draw it as a white
pill with ink text.

## Every changed word (English / Spanish)

| Where | Before | After |
|---|---|---|
| Leaving a state screen (Check your last punch, after the check, earlier punch not recorded, couldn't load your time, storage, someone else's punch; photo path exit) | Return to PIN / Volver al PIN | Done / Listo (existing words) |
| Leaving "Enter your PIN again" | Return to PIN / Volver al PIN | Start over / Empezar de nuevo |
| Saved-punch help, title | Ask your Owner to check / Pide al dueño que lo revise | Your punch is kept on this tablet / Tu marcación está guardada en esta tableta; several: Your punches are kept on this tablet / Tus marcaciones están guardadas en esta tableta |
| Saved-punch help, body | Something of yours is saved on this tablet for checking. You can leave this screen; it stays saved. / Hay algo tuyo guardado en esta tableta para revisión. Puedes salir de esta pantalla; queda guardado. | Your Owner can check it. You can leave this screen. / El dueño puede revisarla. Puedes salir de esta pantalla. (them / revisarlas when several) |
| Saved-punch help, after sending | button "Request sent" / "Solicitud enviada" over "Your Owner will see it under Clocker recovery." / "El dueño la verá en Recuperación de Clocker." | one line: Request sent. Your Owner will see it under Clocker recovery. / Solicitud enviada. El dueño la verá en Clocker recovery. |
| Copy line for the Owner's place | El dueño puede encontrarla en Recuperación de Clocker. | El dueño puede encontrarla en Clocker recovery. (English unchanged) |
| We couldn't load your time, body | We couldn't load your time, so nothing was recorded. Tell a manager if you need your time recorded now. / No pudimos cargar tu tiempo, así que no se registró nada. … | Nothing was recorded. Tell a manager if you need your time recorded now. / No se registró nada. Avísale a un gerente si necesitas que registre tu tiempo ahora. |
| Recording title | Recording… / Registrando… (over "Clocking out James…") | Clocking out James… / Registrando la salida de James… (the approved lines, now the title; "Recording…" only without a name) |
| Another location | This shift was started at another location. Use that location's registered Clocker to continue. / Este turno comenzó en otra ubicación. Usa su tableta Clocker registrada para continuar. | This shift was started at another location. Use the connected tablet at that location. / Este turno comenzó en otra ubicación. Usa la tableta conectada de esa ubicación. |
| Server line (Spanish only) | Verifica tu PIN de nuevo en esta tableta registrada. | … en esta tableta conectada. |
| Server line (Spanish only) | … Usa una tableta registrada en esa ubicación. | … Usa una tableta conectada en esa ubicación. |
| Not found, band | Error 404 / Error 404 (under the title) | Time clock / Registro de tiempo (over the title; existing words) |
| Not found, title (Spanish) | El enlace de este reloj de asistencia no funciona | El enlace de este registro de tiempo no funciona |
| Setup connected (Spanish) | Tu equipo ya puede marcar. | Tu personal ya puede marcar. |
| Setup step 1 | Settings → Clocker tablets (breakable) | same words, bound with no-break spaces (both languages) |
| Photo review button | Use photo & continue / Usar foto y continuar | Use this photo / Usar esta foto |
| Photo not confirmed button | Check photo status / Verificar estado de la foto | Check if the photo saved / Revisar si se guardó la foto |
| Photo retry button | Retry saving same photo / Reintentar guardar la misma foto | Send the photo again / Enviar la foto de nuevo |
| Photo path after a check, sentence | Your punch is not confirmed yet. Tap Check if it saved before doing anything else. | Your last punch still isn't confirmed. Tap Send it again. It won't record twice. / Tu última marcación aún no está confirmada. Toca Enviar de nuevo. No se registrará dos veces. (the main path's existing line) |
| Choose a break, row line | Meal · Suggested: 30 min (under "Meal break") | Suggested: 30 min / Sugerido: 30 min (the kind stays when the name doesn't say it) |
| Moved, not reworded | "Your PIN is not your NEVORA password." and "Don't know your Employee ID? Ask your manager." | now under their fields |

No payroll or legal sentence changed.

## Files

- `src/components/clocker-icon.tsx`: Question (`unknown`), WarningCircle for `stop`, Warning for `warning`; XCircle gone.
- `src/components/clocker-shell.tsx`: band tone per health (`stop` for outages), `offline` status for setup.
- `src/components/clocker-punch-panel.tsx`: rings, offline note tone, offline actions and Done, Done / Start over, the
  foot row, Recording title, said-once line, break rows.
- `src/components/clocker-pin-gate.tsx`: ring above the title, glyphs, the field help in the reserved slot, ID help under the
  field, language switch alone in the footer.
- `src/components/clocker-recovery.tsx`: the help's title, body and result line; focus to Back.
- `src/components/clocker-setup.tsx`: Question ring, offline band status, red stop glyph, busy fill, bound menu path, no
  arrow on "Check setup".
- `src/components/clocker-fallback.tsx`: no arrow on "Check connection".
- `src/components/clocker-photo/punch-photo-flow.tsx`: words, order, rings.
- `src/components/clocker.module.css`: band stop dot, glass veil, callout anatomy for notes, blocked anatomy, field help and
  slot, portrait keys, `.stack + .clears`, `.detail` wrap, em-sized chip dot and map pin, references and setup field in
  Inter, 800x600 inset, forced-colours band edge and card outline; removed the unused recording line and small face.
- `src/components/clocker-copy.ts`: the words above.
- `src/app/clocker/[location]/not-found-body.tsx`, `not-found.module.css`: the callout, the eyebrow, full-width Try again.
- Tests: `src/components/clocker-premium.test.tsx` (new), `clocker-punch-panel.test.tsx`, `clocker-phase8.test.tsx`,
  `clocker-phase6.test.tsx`.
- Harness copy only (untracked, not in the patch): `zz-scan/clocker-flow.ts` presses "Done" and "Start over" where it pressed
  "Return to PIN" and waits for the help's result line instead of a "Request sent" button.

## Checks

All on fictional data in `U/wt/fe`, one capture at a time.

| Check | Result |
|---|---|
| English journey, `cap/fe2-clocker-en` (`983968e0b`; flow 1, punch, PIN key, 1024x768 and 768x1024, extras) | exit 0, 131 pictures, 48 of 48 steps, 24 axe runs, 0 violations; source verified at start and end. No horizontal or vertical overflow logged anywhere (High Contrast PIN `overY` 0, was 2). |
| Spanish journey, `cap/fe2-clocker-es` (same) | exit 0, 130 pictures, 47 of 47 steps, 24 axe runs, 0 violations; source verified. |
| 200% text and High Contrast, `cap/fe-kiosk` (`R30_CK=1`, English) | exit 0, 3 of 3 steps, 3 axe runs, 0 violations; no employment date on the kiosk. D34: clock scroll 297 of 297 (1024x768) and 696 of 696. D35: no scrolling at 200% (document 768 and 1024); Continue at 544 to 610 (1024x768) and 848 to 914 (768x1024), the field's help taking a second line at 200% (they were 530 to 597 and 828 to 894). D36: PIN input colour and caret transparent under forced colours. Default size unchanged: keypad 236 to 576, Continue 592 to 648 at 1024x768. |
| Punches-off preview, `cap/fe-clocker-preview` | exit 0, 2 of 2 steps, 3 axe runs, 0 violations. |
| Paused page, `cap/fe-clocker-paused` | exit 0, 4 of 4 steps, 3 axe runs, 0 violations (page unchanged by this patch). |
| Earlier rounds | `cap/fe-clocker-en` (round 1: 48 of 48, 0 violations; the run's end source check failed because I added a test file during it, so it is not counted), `cap/fe-clocker-es` (round 2: 47 of 47, 0 violations, source verified). |
| Type check, `heavy.sh` with `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` | `src` clean; 8 errors, all in the harness copy (`zz-scan/states.ts` 6, `zz-scan/clocker-flow.ts:113` 1, `zz-scan/review30.ts` 1; none in lines I touched). |
| `npx eslint` on the 14 changed TypeScript files | clean |
| Tests for touched files (14 files) | 146 passed |
| Full run, `heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` | 936 files passed, 24 skipped; 14,441 tests passed, 741 skipped; exit 0 |
| `git apply --check -R p9/fe.patch` in `wt/fe` at `1225685b4` | OK (16 files) |

Pictures looked at region by region against the before set: every row's state in both languages at both sizes where the
harness reaches it, 800x600, 200% text and High Contrast.

## For Codex

1. The server's English sentences still say "registered": `CLOCKER_TRANSPORT_ERRORS` "Verify your PIN again on this
   registered tablet.", "This shift is open at another location. Use a registered tablet at that location." and "New tablet
   setup is paused. Use a registered tablet to finish an existing shift." The kiosk shows its own sentences by code and the
   Spanish lines now say "conectada"; suggest "connected" in English for the one verb.
2. Offline, the clock screen still lets a person press Clock in (the tablet keeps the punch and checks again when the
   connection returns, as before). The UI now draws the action as secondary under the "wait" note. Whether the kiosk should
   refuse a punch while offline is a punch and queue rule, not presentation.

## Needed from another package

- Owner pages: `ClockerRecoveryReview` is rendered without a language and the Settings row says "Clocker recovery", so
  Spanish Owners see English there. If those pages become Spanish ("Recuperación de Clocker" is ready in
  `clocker-owner-copy.ts`), the kiosk's two Spanish lines should follow them.
- DESIGN.MD: the Clocker Direction B bullet ("Too many attempts (amber hourglass)", "red Wi-Fi-off; red tablet for
  'Reconnect this tablet'") predates the glyph map; the kiosk now follows spec 3.2 and decision 2.

## For Jose

1. #12: the lockout keeps the amber Pause (NV-171) and Recording keeps the teal hourglass. Either the lockout takes the
   amber HourglassMedium and Recording keeps only its bar, or DESIGN.MD records the kiosk exception.
2. The reconnect card's ring is WarningCircle now (was the red tablet), so every red stop has one glyph.
3. Offline clock screen: Done is the filled button and the actions stay tappable as secondary rows.
4. Words to confirm: "Done" / "Listo" and "Start over" / "Empezar de nuevo" in place of "Return to PIN"; the help's title
   "Your punch is kept on this tablet"; "Time clock" over the not-found title; "Tu personal".
5. Still open from Phase 6 and 8: "Ask Owner to check" stays the quiet button.
6. The band's glass pills are a little deeper (a veil of the band's own dark teal) so white words read at 4.5:1 under the
   glow; the glow itself is untouched (NV-115 is yours).
7. Information notes on the kiosk are teal-tinted with an edge now (they were grey canvas), as everywhere in the app.

## Not verified

- The photo path's not-confirmed and camera states (#27): source and unit tests only.
- Focus moving to Back after "Request sent" with a keyboard (the harness presses with the mouse).
- A real iPad, Safari, a screen reader, a switch, and a Windows High Contrast theme (Chromium's forced-colours emulation
  only).
- Motion sequences were captured (`seq-*`) but not reviewed frame by frame.
