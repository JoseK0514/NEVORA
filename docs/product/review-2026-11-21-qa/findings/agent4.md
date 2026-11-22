# Agent 4: accessibility, English and Spanish. Review tip 6601ee82a (Nov 21, 2026)

Saved by the lead from Agent 4's hand-back, because the subagent could not write report files.

**Evidence** is in this folder: `axe/`, `kbd/`, `public/`, `tree/`, `modes/`, `sheets/`, `repro/`, the `A4-*.png` screenshots and `tree-modes-log.json`. The Spanish Clocker run is in `../../cap/qa-a4-clocker-es/`: exit 0, 90 screenshots, 24 axe runs.

**Setup:**
- Live app at :59493, Nov 21 from 17:00 to 18:45.
- Playwright Chromium, axe-core 4.14.1 with the WCAG 2.0, 2.1 and 2.2 A/AA tags, and ARIA snapshots.
- 200% text through the Chrome DevTools font-size setting (default font size 32px).
- Reduced motion and forced colors emulated.
- Nothing was changed on the live app. The only submissions were empty forms and one wrong sign-in with a made-up ID.

**Run problems:**
- **Load:** load average was 12 to 16. Some pages showed their own load-error states (Employee Home, records, time off, the Owner person page, Timecards). Every one of them loaded on a later visit and was re-scanned.
- **Sign-in lockout:** QAOWNER sign-in was paused twice for everyone, because the limit of 10 attempts per ID in 15 minutes counts successful sign-ins too (`src/lib/auth/login-limits.server.ts`).

## Findings
| ID | Sev | WCAG | Finding | Evidence | Verified |
|---|---|---|---|---|---|
| A4-01 | **P1** | 1.4.4 | **Employee Home `/app` at 390 with 200% text: lines draw over each other.** The date line, "Clocked in at 2:57 PM / Breaks and clock out…" and the Hours tile ("36 h 05" runs into "Fri, Nov") overlap. "Scheduled pay…" is clipped and the shortcut labels overflow. The unmerged branch 425bdbf85 ("Keep Employee screens readable at 200% text") probably fixes this, but it is not on the tip. | `A4-01-employee-home-text200-overlap.png`, `modes/employee-home-390-text200-full.png` | Chromium, 2 runs |
| A4-02 | **P1** | 1.4.4 | **Owner Home at 1440 with 200% text.** "Nov 2–8 has no payroll" and the payday "Friday, Nov 27" overlap themselves. Quick actions are cut to "Add em…" and "Send u…". Owner Schedule at 200% held up. | `A4-02-owner-home-text200-overlap.png`, `repro/owner-home-1440-text200-run2.png` | 2 runs |
| A4-03 | **P1** | 1.3.1, 2.5.3, 4.1.2 | **Owner Team list rows, 1440 and 390.** Each row link's `aria-label` replaces what is on screen, for example "Ana Colon, Employee, Calle Loíza, 555-0199". The visible status ("On break", "Clocked in late · 9 min", "Not clocked in · 1 h 29 min", "Off today") and the position are dropped, and a phone number that is not on screen is added. Screen-reader users never hear the status the page exists to show. | `tree/owner-team-1440.yaml` lines 58–90, axe at both widths, `repro/repro-log.json` | 2 runs |
| A4-04 | P2 | 2.5.3 | **The accessible name rewords the visible label, so Voice Control commands miss.** Examples: "Prepare Nov 16–22" is named "Prepare payroll for Nov 16–22"; "Time off" is "Request time off"; "Can't work" is "Can't work a shift"; "Mon 16" is "Monday, November 16, assigned shift"; "Fri, Nov 27" is "Friday, November 27"; "When they can be scheduled" is "When Luis Torres can be scheduled". axe flagged 106 nodes (the rule is experimental). Fix: start the name with the visible text, then add context. | axe | axe + tree |
| A4-05 | P2 | 1.4.11 / forced colors | **In High Contrast (forced colors) at 390 and 1440:** the header bell disappears for Owner and Employee, and the NEVORA wordmark disappears on the phone. Employee Schedule's "Confirm" button loses its edge, the selected day in the week strip loses its marker, and the Schedule legend swatches vanish. Sign-in and the Clocker are fine. | `A4-05-employee-schedule-forced-colors.png`, `A4-06-owner-schedule-forced-colors.png` | emulated |
| A4-06 | P2 | 1.4.3 | **Team filter chip counts are too faint:** #7a7c7d on white at 12.5px is 4.19:1, below 4.5:1. Keep the approved grey numerals, one step darker. | axe | axe + computed |
| A4-07 | P2 | 3.1.2 | **An Owner whose device asks for Spanish (`nv-lang=es`, no saved language) gets mixed-language screens.** Schedule's cost card ("Pago base programado… Horario leído a las 6:04 p. m.") and the whole Time off policies page are in Spanish inside English chrome. The Spanish sign-in page says the app is English after sign-in. "Políticas de tiempo libre" uses a word the glossary bans (should be "días libres"), and "balance" should be "saldo". The Spanish blocks do carry `lang="es"`. | `tree/owner-es-schedule-1440.png`, `tree/owner-es-settings-timeoff-1440.png` | Chromium |
| A4-13 | P2 | 2.4.3 | **Closing the Employee shift sheet opened from Home loses focus.** Opening is right: focus moves into the sheet and stays inside. On Escape the sheet closes, focus lands on `<body>`, the URL keeps `&shift=`, and the person is left on Schedule rather than Home. Opened from Schedule itself, focus returns correctly to the shift row. | `sheets/sheets-employee*-390.json` | 2 runs |
| A4-14 | P2 | 2.4.7 | **The band search field (Team, "Search people") shows almost no focus:** the faint border only gets brighter, with no ring. | `crops/team-search-*.png` | Chromium |
| A4-08 | P3 | product 44px | **Phone controls under the product's 44px rule** (all still pass WCAG 2.5.8): the sign-in language pill (85x36), Profile language segments (158x36), Requests tabs (171x36), Team filter chips (156x36) and band buttons (40px tall). Nothing anywhere is under 24px. | | |
| A4-09 | P3 | 3.1.2 | **On Spanish signed-out pages**, the screen-reader-only line "NEVORA is a product of VELANI LLC." stays in English (`brand-legal.tsx:36`). | | |
| A4-10 | P3 | — | **Clocker Spanish wording (read in the code only):** "tu empleador" (`clocker-copy.ts:213`) and "propietario de tu negocio" (`:283`); the glossary word is "dueño". The English screen names inside Spanish sentences are a documented choice. | | source-only |
| A4-11 | P3 | — | **Employee Home "Hours by day"** reads "8.1 hours" to a screen reader, while the screen shows "8 h 6 min". | | tree |
| A4-12 | P3 | 2.4.6 | **Owner Requests:** James Ortiz's two requests both have buttons named "Approve time off for James Ortiz". Add the dates. | | tree |

**Not findings:**
- 4 axe contrast hits on the white band tabs are false positives (axe reads the gradient band as the page grey).
- The PIN counter "2 de 4 dígitos ingresados" uses a polite `role="status"`, which is correct.

## axe summary
| Surface | Scans | Violating nodes | Rules |
|---|---|---|---|
| Signed-out pages (sign in, forgot, reset and its bad link, activate and its bad link) in en and es, 1440 | 12 | 0 | — |
| Clocker in Spanish, 23 states | 23 | 0 | — |
| Owner 1440, 11 screens | 11 | 25 | label-name 21, contrast 4 (1 real) |
| Owner 390, 6 screens | 6 | 44 | label-name 43, contrast 1 (real) |
| Employee 1440 + 390 | 14 | 43 | label-name 43 |
| **Total** | **66** | **112** | label-content-name-mismatch 106, color-contrast 6 (2 real, both A4-06) |

**Caveats:**
- Owner person and Timecards were scanned while showing a load error.
- axe could not decide on: band contrast, `aria-prohibited-attr` (1–2 per page), and `duplicate-id-aria` (2 on Owner Schedule 390).

## Keyboard and focus
| Check | Result |
|---|---|
| Skip link, every signed-in screen, 1440 and 390 | Pass |
| Tab order | Pass. Owner Schedule at 1440 has 111 Tab stops because every capsule is one; a grid keyboard model is worth considering (P3) |
| Visible focus | Pass: a 2px teal ring (5.4–6.1:1) or a white ring on the band. Exception: A4-14 |
| Focus not hidden behind the phone tab bar (2.4.11) | Pass: `scroll-padding` keeps the focused row visible |
| ⌘K search dialog | Pass: modal, named, focus contained, Escape closes, focus returns |
| Route sheets | Opening: pass. Closing from Home: fail (A4-13). Closing from Schedule: pass |
| Signed-out form errors, en and es | Pass: focus goes to the first invalid field; `aria-invalid` and `aria-describedby` are set; the server refusal is a `role="alert"` |
| Clocker by keyboard | Pass |
| Target size (2.5.8) | 0 targets under 24px |

## English and Spanish
**How the language is chosen on the tip:**
- Signed out: the `nv-lang` cookie sets it, or the browser language if there is no cookie.
- Signed in: `<html lang="en">` always. A few Owner pieces rendered on the server read the saved language, then `nv-lang`; that is the cause of A4-07.
- Employee Profile says: "Sign-in pages only. The rest of NEVORA is in English for now."
- The unmerged branch 425bdbf85 keeps signed-in Spanish switched off (`SPANISH_READY` false) unless `NEVORA_SPANISH_PREVIEW=1` is set. The harness does not pass that setting, so the branch was not run.

| Item | Verdict |
|---|---|
| Sign-in errors | Pass (tú) |
| Forgot, reset, activate | Pass |
| Buttons | Pass (infinitive) |
| Times and dates ("5:12 p. m.", "sábado, 21 de noviembre") | Pass |
| Clocker states (ID, PIN, wrong PIN, receipts, lockouts, idle) | Pass |
| Clocker at 200% text and in High Contrast | Pass |
| Spanish at 320 and 390, and sign-in at 200% | Pass |
| Signed-in Employee with Spanish chosen | English throughout, which matches the Profile note |
| Signed-in Owner with Spanish chosen | Mixed (A4-07) |

**Bilingual verdict:**
- Signed-out pages and the Clocker are ready to release in Spanish.
- Signed-in Spanish does not exist on the tip.
- An Owner can get half-Spanish screens (A4-07).

## Accessibility tree (a prediction, not VoiceOver output)
- **Structure:** landmarks and headings are sound, but the sidebar's "More" H2 comes before the page's H1.
- **Team rows:** VoiceOver would read them without their status (A4-03).
- **Times** read cleanly ("3:00 PM to 11:00 PM").
- **Approve and Decline** carry the person's name.
- **Load errors** are announced through `role="status"`.

## Checked and good
- Signed-out pages in both languages.
- The Clocker in Spanish.
- The skip link, visible focus and the ⌘K search dialog.
- Reduced motion: transitions drop from 70 to 1 on Employee Home, with no endless animations.
- No sideways overflow at 320 or 390.

## Not checked
- VoiceOver, TalkBack and NVDA.
- Real-device large text and High Contrast.
- Success toasts after a real save.
- The Owner Timecards inspector and the Payroll run review page by keyboard.
- The unmerged Spanish branch, live.

## Manual checks a person still has to do
1. **VoiceOver on iPhone:**
   - The Spanish sign-in page (does the voice switch to Spanish?).
   - The wrong-password alert.
   - The cards and week strip on Employee Home.
   - Opening and closing a shift sheet (A4-13).
   - A time off request.
2. **VoiceOver on macOS Safari:**
   - The Team list (A4-03), the Schedule grid and the Timecards inspector.
   - Payroll prepare.
   - Approve and Decline on Requests.
   - A Rondo answer and its source.
3. **VoiceOver on a Clocker tablet:** the keypad, a wrong PIN, the receipt clearing after 8 seconds, and the lockouts.
4. **Largest text size on a phone** (iOS Larger Text, Android font scale): Employee Home, Owner Home and the Clocker (A4-01, A4-02).
5. **Voice Control** with the labels in A4-04.
6. **Windows High Contrast** with a real theme (A4-05).
