# Clocker and phone app (batch-clocker): capture and gate check

Branch `claude-codex-collab-nevora-batch-clocker`, started at `8afc0f11` and later merged with
`claude-codex-collab-nevora` (to `703b811f`).

## Commits
- `d01a1269` **Clocker code** (merge this). Only Clocker files plus their tests:
  - `clocker-shell.tsx`: the band's status pill no longer repeats the card heading.
  - `clocker-setup.tsx`: the setup card doesn't repeat the location.
  - `clocker-punch-panel.tsx`: the always-true off-clock line is removed.
  - `clocker-copy.ts`: Spanish for the new lines.
  - `clocker.module.css`: the language button is the white secondary.
  - `clocker-setup.test.tsx` and `clocker-premium.test.tsx`: updated for the new wording.
- `9b785337`: the first capture commit (before the fix). This last commit replaces it with captures after the fix.
- The final commit: the webp captures, `rows.json` and this report.

Checks on `d01a1269`: `tsc --noEmit` clean; oxlint clean on the changed files; `node scripts/run-rstest.mjs
src/components/clocker src/app/clocker` gives 237 passed, 0 failed.

## What changed (before → after)
| Where | Before | After |
|---|---|---|
| Band pill, setup not confirmed (K1) | Setup not confirmed (same as heading) | Check needed / Revisión necesaria |
| Band pill, NEVORA unreachable (K14) | Can’t reach NEVORA (same as heading) | Connection problem / Problema de conexión |
| Band pill, storage (K14) | Can’t save punches (heading said it can’t *read* them) | Storage problem / Problema de almacenamiento |
| Setup card (K1) | This tablet will be the time clock for **Northside Main Office**. (band already says it) | This tablet becomes this location’s time clock. / Esta tableta será el registro de tiempo de esta ubicación. |
| Off clock (K5) | Off clock · Your time is recorded when you clock in. | Off clock |
| Language button (all kiosk screens) | tinted teal-50 pill, teal words | white secondary with hairline and lift, ink words, 10px corners |

The heading text is unchanged in every case. Server reads, actions and data contracts are untouched.

## How it was captured
- Production builds (`NEVORA_OWNED_APP_PRODUCTION=1`, under `flock /tmp/nevora-heavy.lock`), served at the owned https
  origin through the loopback TLS proxy, with fictional data and fictional tablet keys (`scan-kiosk-main`,
  `scan-kiosk-west`). No devices, push, deploys or publishing.
- There were two builds, not one: the first was the gate check, the second the AFTER capture. The extra build was for
  the lead's 2-hour-target update (fix now, capture AFTER).
- Clocker at 390x844, 768x1024 and 1024x768, plus the receipts at 390x844 with 200% text. L1 at 390 and 1440.
- The harness ran from a scratch copy; `tools/ui-scan/zz-scan.tar.gz` is unchanged. Changes worth folding into it:
  1. Current button names: `Keep my place`, `Clock out recorded`, `Send it again`, `See current status`.
  2. `NEVORA_SCAN_CLOCKER_FLOW=all`: the receipt captures and the full flow in one build.
  3. A per-size gate probe: button heights and kinds, repeated visible strings, text overlap, off-screen text, time
     format.
  4. `Back` before `Check if it saved` (this unblocks K9 and the retry screen).
  5. The native flow uses the https origin and opens the Owner’s Device settings panel.
  6. A second L1 pass as an Employee (`actors[1]` set to EMPLOYEE; every fixture actor is a Lead).
  7. Steps for someone else's punch and for the paused page.

## Gate check per page
- **Time format:** every captured time reads like `8:02 AM`. The receipt log shows `timesOk: true` at all four sizes.
- **Overflow and clipping:** no horizontal overflow and no visible text cut off at any size.
- **Buttons:** the main action and the secondary match in height (56px on phones and landscape, 64px on portrait
  tablets). Action rows are 84px; keypad keys are 56, 64 and 76px.
- **Edges:** the card and band share the 14px phone gutter. At 1024 the side band and card each hold their own edge.
- **Scan false positives:**
  - Overlap with the collapsed Reference id and photo notice: hidden text.
  - Clipped "Employee ID" and "n of 4 digits": screen-reader-only labels.
  - The second "Checking…": a screen-reader status line.

| Row | Captured (AFTER) | Result |
|---|---|---|
| K1 | setup, wrong code, not confirmed, broken link | fixed (repeats) |
| K2/K3 | Employee ID, English and Spanish | fixed (language button); K2 PINs-off screen not captured |
| K4 | keypad, 2 digits, not recognised, checking | passes |
| K5 | off clock, clocked in, on break, after review, other location | fixed (always-true line) |
| K6, K7 | break choice; Clock out? | passes |
| K8 | photo for clock out, recorded without photo | passes |
| K9 | your earlier punch wasn’t recorded | passes |
| K10 | sending (phone) | passes |
| K11 | receipts, 200% text | time said twice (receipt session’s file) |
| K12 | check last punch, kept-punches help, retry | help screen spacing (open) |
| K13 | not captured | harness can’t reach the state |
| K14 | couldn’t load, PIN again, can’t reach, unavailable, set up again, PIN paused | fixed (pill repeats); storage not in AFTER run |
| K15 | not captured | 404 with billing off in the owned app |
| L1 Owner | 9 states | shared-component items below |
| L1 Employee | 8 states (Lead gets the web-browser notice) | shared-component items below |

## Impeccable audit (Clocker, AFTER)
- **Hierarchy:** one focal point per state and one solid teal action per card. The band now states the tablet's
  condition without echoing the heading. One open item: the receipt says its time twice.
- **Spacing and alignment:** a consistent inset and 4/8 gaps. The exception is the kept-punches help screen, where
  Back and Reference sit on extra air. The band clock fits at all three sizes (late-hour check, 10:58 PM).
- **Accessibility:**
  - Targets are 56px or more in the kiosk. The skip link is 47px and appears only on focus. The small targets the scan
    found (36–42px) are on the shared not-found page, not the kiosk.
  - The language button keeps its spoken name "Español, switch language to Spanish".
  - Its white fill gives ink-on-white contrast above 12:1. Forced colours keep the 2px ButtonText border.
  - Reduced motion uses a fade; this was checked in the first run.
  - Keyboard: the skip link, then Employee ID, then Español. The scripted PIN-step keyboard check timed out in both
    runs, so its order isn't re-verified.
  - axe was not run on the kiosk; the harness has no axe step for it.
- **States:** loading, sending, success, photo, review, retry, error, offline, lockout and storage are designed. K13
  and K15 have no evidence.
- **Copy:** checked against voice.md. The Spanish lines were added with the English ones.

## Blocking items left, and why
1. **K11 receipt:** the time is said twice. It belongs to the session fixing the receipt at 200% text.
2. **L1, Owner and Employee (shared component, read-only here):**
   - Needs a check repeats "Check again": the body text, plus the line from `src/lib/native-shell/device-client.ts:84`.
   - Checking says "Checking" twice.
   - The Owner panel's secondaries are the grey fill.
   - On the Employee page, Check again and Review app setup are frameless text beside a solid button.
   - On and Setup changed have no clear main action.

   All of these are in `src/components/native-shell/device-settings.tsx`.
3. **K12 kept-punches help:** Back and Reference spacing. It's a small CSS change in `clocker.module.css`, held until
   it can be captured.

## End sweep (proposed ledger rows)
| Proposed | Item | Kind |
|---|---|---|
| G-ck-1 | Capture K13 someone else’s punch (harness step that switches the PIN session under a pending punch) | evidence |
| G-ck-2 | Capture K15 paused with commerce on; K2 Tablet connected with PINs off; K14 storage after the pill change | evidence |
| G-ck-3 | Add axe and the PIN-step keyboard order to the kiosk harness | evidence |
| G-ck-4 | K1 “Setup code” label left-aligned under a centred heading | check |
| G-ck-5 | Profile behind the paused Alerts panel shows “–” for Phone and Email | check |
