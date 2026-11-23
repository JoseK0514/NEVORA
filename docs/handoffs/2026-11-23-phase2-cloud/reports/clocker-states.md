# Clocker K13 and K15 (package `clocker-states`)

Branch `claude-codex-collab-nevora-clocker-states`. Production build, served at the owned https origin through the owned
loopback TLS proxy. Fictional workspace, fictional tablet key `scan-kiosk-main`, fictional PINs, throwaway local Postgres.
No real device, payment, billing provider, deploy or publishing.

## Commits
- `5151a9b0` Scan modes (in `tools/ui-scan/zz-scan.tar.gz`): `NEVORA_SCAN_CLOCKER_FLOW=states` (K13) and
  `NEVORA_SCAN_CLOCKER_FLOW=paused` with `NEVORA_SCAN_COMMERCE_RECOVERY=1` (K15).
- `0801bfe9` Fixes in the Clocker's own files: `src/components/clocker.module.css`, `src/components/clocker-copy.ts`.
- `9e6a9b95` First shots commit.
- `96be1370` K15 follow-up from the lead: no "Time clock" eyebrow on the paused page; `RecoveryFrame` takes
  `brandLine={false}` (only the paused Clocker passes it), so from 1024px the tablet no longer shows the sign-in line
  "Your week, in one place.". The billing pages' frame renders byte-identical markup before and after (EN and ES,
  with and without `below`/`legal`, compared with renderToStaticMarkup).
- `d01b7e15` The paused scan also captures `/login` and `/app/billing` at 1440 (both unchanged).
- `22b0c470` K15: from 1024px the © line under the card steps aside, so the panel's "Powered by VELANI LLC" is the one
  company line (as on K1–K14); phones and portrait tablets keep the © line. The panel stays otherwise plain: the paused
  page has only the tablet key, so the place and its clock would need a server read.
- `74aced0e` K13: the keyboard capture is taken on the first Tab, when Done / Listo has its 3px ring.
- Shots commit (latest): this report, `shots/clocker-states/rows.json` and `img/`.

## How each state was reached
- **K13 Someone else's punch is waiting.** The kiosk shows it when the tablet holds an unconfirmed punch for one person
  and the server now verifies someone else (`clocker-punch-panel.tsx`, `refresh()`: `pending.subject !== fresh.subject`).
  In one tablet context: James (PIN 2468) taps Clock in and the request is cut off in the browser, so nothing is recorded
  and the punch waits in the tablet's saved punches. With that screen open, Ana (PIN 1357) enters her PIN in a second tab
  of the same tablet. Back on the first screen, Check if it saved shows K13.
- **K15 Clocker paused.** `/clocker/access/paused` is a 404 unless commerce is on. The scan starts the owned app with
  `commerceRecoveryEnabled` (commerce on, no binding or provider credentials, the same setup as
  `commerce-recovery-browser.integration.ts`) and opens only the paused page, with and without
  `reason=billing_status_unavailable`. The step 4 lifecycle test reaches a paused Clocker through its Stripe fixture and a
  canceled subscription; this route needs none of that, and nothing contacts a billing or payment provider.

No server change was needed for either state.

## Changes
| Page | Before | After |
|---|---|---|
| K13 | At 768x1024 the "Clears in 8 s / Keep my place" pill covered the only button, Done. | The pill steps aside on this screen, as it does on a receipt. The screen still clears on time and screen readers still hear "This screen clears in 10 seconds." |
| K15 (Spanish) | "Pídele al propietario de tu negocio que revise…" | "Pídele al dueño del negocio que revise…" (the Clocker's word everywhere else, 25 strings). |
| K15 | Eyebrow "Time clock" over "This time clock is paused" (ES "Registro de tiempo" over "El registro de tiempo está en pausa"). | No eyebrow; the heading says it once. |
| K15 at 1024 | Panel beside the card showed the sign-in line "NEVORA Workforce / Your week, in one place." | Panel shows the wordmark and "Powered by VELANI LLC" only. Sign-in and billing recovery keep their panel. |

## Gate check (390x844, 768x1024, 1024x768; English and Spanish)
| Check | K13 | K15 |
|---|---|---|
| Horizontal or vertical overflow | none | none |
| Buttons | one primary Done / Listo, 56px tall, 322px wide at 390, 34px from each edge | one primary Try again / Intentar de nuevo, 56px tall, 36px from each edge; language switch 56px |
| Repeated wording | none | none (eyebrow removed) |
| Overlap, cut-off text | fixed (pill over Done at 768) | none |
| Time format | band clock `9:17 AM` (English) | no times on the page |
| Targets under 44px | none | none |
| Keyboard | Tab reaches Done with a 3px ring, then the skip link | Tab reaches the language switch, then Try again, each with a visible ring |
| Page language | `lang="en"` / `lang="es"` | `lang="en"` / `lang="es"` |
| Alerts | the notice is `role="alert"` | none needed |

Checks run: the two production scans above; `node scripts/run-rstest.mjs run` on clocker-copy, clocker-phase6,
clocker-phase8, clocker-language and clocker-punch-panel tests (65 passed). Not run: 200% text, reduced motion (no
motion on either state beyond the kiosk's existing behaviour), WebKit, axe.

## Impeccable audit
- Hierarchy: icon, heading, one sentence, one action on both states. Good.
- Spacing: card padding and button edges match the other kiosk states; 768 portrait leaves a tall band over a low card
  (the kiosk's existing portrait layout, shared with K1–K12).
- Accessibility: notice announced as an alert; focus visible; targets 56px; the visual countdown is gone on K13 but the
  status line still announces it.
- States: K13 English and Spanish; K15 paused and "Access could not be checked", English and Spanish.

## Blocking items left
None.

## End-sweep items (proposed ledger rows)
1. K13: a second tab on the same tablet opens a normal Clock in screen while another person's punch is waiting in the
   first tab; only the tab that holds the punch shows K13. A kiosk runs one tab, so it's low risk. Behaviour, not layout.
2. Kiosk-wide: the Spanish band clock reads `9:18 a. m.`; the one time format is `7:00 AM`. Jose to decide for Spanish.
3. K15 at 1024x768: the panel holds only the wordmark and "Powered by VELANI LLC". A kiosk band there (clock, place)
   would match K1–K14, but needs the paused page to read the location on the server. Left for Jose.
