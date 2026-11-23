# Clocker and phone app (batch-clocker): capture and gate check

Branch `claude-codex-collab-nevora-batch-clocker`, from `claude-codex-collab-nevora` at `8afc0f11`.

## Commits
- One commit: the captures (`shots/batch-clocker/img/*.webp`), `shots/batch-clocker/rows.json` and this report. **No app
  code changed.** Every blocking problem below needs a fresh production capture to prove a fix, and this package had
  one production build. So they're listed here for the next round, not fixed blind.

## How it was captured
- One production build (`NEVORA_OWNED_APP_PRODUCTION=1`) under `flock /tmp/nevora-heavy.lock`, served at the owned https
  origin through the owned loopback TLS proxy. Fictional workspace, fictional tablet keys (`scan-kiosk-main`,
  `scan-kiosk-west`), fictional PINs. No devices, push, deploys or publishing.
- Clocker at 390x844, 768x1024 and 1024x768; the receipts also at 390x844 with 200% text. L1 at 390 and 1440.
- The harness was used from a scratch copy. The tracked `tools/ui-scan/zz-scan.tar.gz` is unchanged. Copy changes
  that should go into the tracked archive:
  1. The kiosk's current button names: `Keep my place` (was Continue securely), `Clock out recorded`, `Send it again`
     (was Retry same clock action), `See current status` (was Review current status).
  2. `NEVORA_SCAN_CLOCKER_FLOW=all`: the receipt captures, then the full flow, in one build.
  3. Per-size gate probe: buttons (height, kind), visible strings and repeats, text overlap, off-screen text, and times
     not in the one format.
  4. A someone-else's-punch step, and a `/clocker/access/paused` step.
  5. The native flow takes the https front origin (it was passed the http one, which has no session). On Profile it
     opens the Device settings panel. It also runs a second pass signed in as `actors[1]`.

## Per page (gate check)
Time format: every time on every captured Clocker screen reads `7:47 AM` (no leading zero, no 24-hour). The receipt
log has `timesOk: true` at all four sizes, clock in and clock out. No horizontal overflow at any size, and no visible
text cut off. Button heights per state: the main action and the secondary match (56px on phones and landscape, 64px on
portrait tablets). Clock in, Clock out and break rows are 84px. Keypad keys are 56, 64 and 76px.

| Row | Captured | Buttons | Blocking (fix now) |
|---|---|---|---|
| K1 Setup | setup, wrong code, not confirmed, checking, broken link | Connect tablet solid teal; Español tinted | "Northside Main Office" in the band and the card; "Setup not confirmed" as pill and heading; tinted Español |
| K2 Connected | not as its own screen (PINs-on flow goes to Employee ID) | – | – |
| K3 Employee ID | EN, ES | Continue solid (disabled grey until typed) | tinted Español |
| K4 PIN | keypad, 2 digits, not recognised, checking | keys grey (allowed), Continue solid | "Checking…" on the button and as a status line |
| K5 Actions | off clock, clocked in, on break, other location | one solid action; Done white; Refresh link | "Your time is recorded when you clock in." is always true |
| K6 Break | rest/meal rows | Back white | the "doesn't end on its own" sentence explains the screen (Jose's call) |
| K7 Clock out? | normal, on break | Confirm solid, Stay white, equal height | – |
| K8 Photo | **not captured** (harness timeout) | – | – |
| K9 Review current | **not captured** (harness timeout) | – | – |
| K10 Sending | phone | none | – |
| K11 Receipt | in, out, break start/end, 200% text | Done white | the time shown twice (big time and "Saved at …"); receipt belongs to the 200% fix session, not edited |
| K12 Not confirmed | check last punch, kept-punches help | Check if it saved solid; Done and help links | help screen: Back floats far below the button |
| K13 Someone else's punch | **not captured** (state not reached) | – | – |
| K14 Errors | couldn't load, PIN again, can't reach, set up again, PIN paused, storage | one solid action each | "Can't reach NEVORA" pill plus heading; storage pill "Can't save punches" vs heading "can't read its saved punches"; tinted Español |
| K15 Paused | **not captured**: 404 with billing off in the owned app | – | – |
| L1 Owner | on, blocked, setup changed, needs a check, checking, paused, both confirms | Turn on solid, Turn off red outline, others grey | repeated "Check again" lines (needs a check); repeated "Checking"; grey secondaries (older look, shared `native-shell/device-settings.tsx`); unclear order in setup changed |
| L1 Lead | phone-app gate "Use NEVORA in your web browser" | Sign out solid | – |

Left and right edges: the band and the card share the 14px phone gutter. At 1024 the side band and the card are
aligned on their own grid. One measured edge problem: on K1 the "Setup code" label is left-aligned under a centred
heading. That's an end-sweep note.

## Impeccable audit (Clocker, all captured states)
- **Hierarchy:** one focal point per state (the greeting with the main action, or a state ring with its heading). One
  solid teal action per card. Fails where the band pill repeats the heading (K1 not confirmed, K14 offline) and where
  the receipt repeats its time.
- **Spacing and alignment:** consistent card inset and 4/8 gaps. The exception is the kept-punches help screen, where
  Back and Reference sit on extra air. The band clock fits at every size (late-hour check: 10:58 PM fits at all three).
- **Accessibility:** targets ≥ 56px except the skip link (47px, visible only on focus). Reduced motion swaps the
  check's draw for a fade (`ckFade`). Keyboard: the skip link and Employee ID come first, then Español. The scripted
  keyboard step stopped early (harness timeout), so the PIN-step order wasn't re-verified.
- **States:** loading, sending, success, error, offline, lockout and storage are designed. Photo, review-current,
  someone-else's punch, retry and paused have no evidence in this build.
- Copy: the three repeated pairs and the one always-true line above.

## Blocking items left, and why
None were fixed: each needs a second production capture to prove it, and the package budget was one build. In
order of importance:
1. K14 storage: the band says the tablet can't *save* punches while the heading says it can't *read* them.
2. Repeated wording: K1 (location; "Setup not confirmed"), K4 ("Checking…"), K14 ("Can't reach NEVORA"), K11 (time
   twice, for the receipt session) and L1 (needs a check, checking).
3. Older look: the Clocker's tinted Español button (`clocker.module.css`, `.lang`) and L1's grey secondaries (shared
   kit, read-only for this package).
4. K5's always-true line "Your time is recorded when you clock in."

## End sweep (proposed ledger rows)
| Proposed | Item | Kind |
|---|---|---|
| G-ck-1 | Capture K8 photo, K9 review current, K12 retry, K13 someone else's punch (harness step fixes listed in rows.json) | evidence |
| G-ck-2 | Capture K15 paused with commerce on | evidence |
| G-ck-3 | Capture L1 for an Employee (all fixture actors are Leads) and L1 Owner Off state | evidence |
| G-ck-4 | K1 "Setup code" label alignment under centred heading | end sweep |
| G-ck-5 | Phone-app Lead gate says "web browser" three times | end sweep |
| G-ck-6 | Profile behind the paused Alerts panel shows "–" for Phone and Email | check |
