# Phase 6: Clocker (Nov 17, 2026)

Phase 6 of the Nov 11 plan. Commit `3f9687dc1742aab774ac9c6ee1bfbaed4e3cadf4` on `claude-codex-collab-nevora`, built on `5b5fe4bd`.
The work started on `e9d2ba4e`; six backend and handoff commits from another session landed on the branch while it was
being built (`722babea` to `5b5fe4bd`: Phase 5 backend, Support references, the U10 hold answer, rebuilt guides). No
file overlaps. The checks below were run again on `5b5fe4bd` plus this change.

Presentation, client modules, copy, styles and tests. No punch, PIN, lockout, journal, photo or enrolment logic
changed, and no API route, server module, authorization rule or data contract. The kiosk keeps its look: the band, the
clock, the glow, the card and the keys are as they were at 1024x768 and 768x1024.

## What changed

60 files (3,473 lines added, 785 removed), in two packages.

| Area | Report | Main changes |
|---|---|---|
| The tablet's clock-in flow | [a-kiosk-clock-in-flow.md](a-kiosk-clock-in-flow.md) | Every refusal is chosen by the server's code, in both languages. A punch the tablet cannot confirm says "not confirmed yet" with the action and its time. "1 more saved on this tablet." An offline card that returns by itself. The receipt carries the first name and up to two facts. The tablet remembers its language, and a fresh Spanish tablet starts in Spanish. The Clocker's own not-found page. High Contrast edges and focus, 56px targets, a keypad that announces how many digits are in. The PIN step fits 800x600. |
| Setting up a tablet, and the Owner's Clocker settings | [b-tablet-setup-and-clocker-settings.md](b-tablet-setup-and-clocker-settings.md) | The setup code as a QR code with three steps, Copy link and Show code. The tablet reads the code from the link and connects after one tap. Clocker tablets, Clocker PINs, one person's PIN, Punch photos and Clocker recovery rebuilt in the Settings frame, with honest rows, one filled button per page and designed states. Loading placeholders for all five routes. |

Two things changed after the builders' reports: focus now lands on the answer after a code check on Clocker recovery
(section 14 of report B), and two Owner sentences quote the kiosk's new button names.

## The tracker

`docs/product/review-2026-11-11/status.json` has no Clocker rows: the Clocker review was still running when the tracker
was made, and its findings (JR-12, JR-26, RA-6, RA-13, RA-17, RA-28, MK-8) are tracked in the two reports' first
tables. The tracker stays at 133 fixed, 25 partly, 12 open.

| Item | State | What remains |
|---|---|---|
| Stable error codes | fixed | Four punch replies carry no code (Codex 1). |
| Extra status request | already fixed in round 1 | Measured: verify, state, execute, clear. |
| "N more saved" | fixed | |
| Receipt | fixed | Shift end on clock in and worked time on clock out need fields (Codex 2). |
| Offline (RA-6, MK-8) | fixed in the page | A reload with no connection shows the browser's error page: the Clocker has no service worker. Queued punches are not built. |
| Language (RA-13) | fixed | An Owner default per tablet needs a field (Codex 3). |
| Shared-tablet honesty (JR-12, JR-26) | fixed | |
| Not-found page | fixed | |
| Accessibility (RA-17, RA-28) | fixed | Windows High Contrast itself and a screen reader were not run. |
| Tablet hand-off (JR-26) | fixed | A real camera scan was not run. |
| Clocker tablets | fixed | No pause exists on the server; the page says to remove and set up again. The empty page is unit tested only. |
| Clocker PINs | fixed for the Owner | Managers cannot open the pages (a server permission; your call). |
| Punch photos, Clocker recovery | fixed | The photo review list was not rebuilt. |

## How it was checked

On `5b5fe4bd` plus this change, in an isolated copy with an owned local Postgres and fictional data.

| Check | Result |
|---|---|
| Type check | Clean |
| Lint on the changed TypeScript files | Clean |
| Unit tests (`vitest run --dir src`) | 1,036 files: 15,059 pass, 944 skipped. 1 fails by design: the manuals guard. |
| Kiosk journey, English, 1024x768 and 768x1024 | 45 of 45 steps, run on this exact tree |
| Kiosk journey, Spanish | 44 of 44 steps on `e9d2ba4e` plus this change, before the recovery focus fix (an Owner page the journey does not open). Not run again on `5b5fe4bd`. |
| axe-core on 14 kiosk states | 0 violations in each language |
| Tablet hand-off | Real, once in each language: add a tablet, open the link, "Setup code received", connect, the clock opens, the same link refused a second time, the Owner's row reads Connected. No request URL, page HTML or storage held the code. |
| Owner pages | Every state at 1440, 900 and 390 by the builder; frame measured (title 130, band 224 or 296, 812 column) |

The journey: enrol the tablet, wrong PIN, clock in, start and end a break, clock out, saved-punch recovery, a second
location, both lockouts, offline, High Contrast, a small tablet and 200% text.

The first English run on the combined build passed 42 of 45: "real offline", "small tablet" and "text at 200%" timed
out waiting for the PIN step. The Spanish run that followed passed all of them, and so did the next English runs. Not
traced; it happened while a type check was running on the same machine.

**Real against forced.** Real local server: the journey above, both lockouts, the tablet losing its registration,
punches off, the paused redirect, the hand-off, a PIN save, a PIN another person has, a code with nothing saved. Forced
in the browser: server not reached, 503, a lost punch reply, "PIN again", blocked storage, the photo step (no camera),
"not confirmed" on the Owner pages, help requests with rows, saved and conflict answers on recovery. Unit tests only:
punch sentences for codes the local server did not send, the empty tablets page, closed PIN pages, an expired code.

**Not run:** a production build, the browser integration suites, the QA scripts, a real iPad, Safari, a real camera on
the QR code, a screen reader, a switch, Windows High Contrast (Chromium's emulation only), 320px and 200% text on the
Owner pages.

Evidence: [evidence-kiosk/](evidence-kiosk/) (a selection, with the run logs in full),
[evidence-setup-and-settings/](evidence-setup-and-settings/).

## The setup code on the Owner's page and the tablet

The setup code is a credential: one use, 15 minutes. Here is exactly where it lives.

- **Owner's page.** In page memory from the server's answer until Done, expiry, removal, a newer code, or leaving the
  page. While the card is open it is also in the drawn QR code and in the "open its Clocker" link. The readable code
  shows only while "Show code" is open. It is never in the address bar, storage, a cookie or the console.
- **Clipboard.** Copy link and Copy code leave it on the device clipboard. The page cannot clear that.
- **Link.** `/clocker/<key>#setup=<code>`. A fragment is not sent to a server or in a Referer header. Never a query
  string.
- **Tablet.** Read once, removed from the address bar and that history entry, then held in one in-memory ref: not in
  state, storage or HTML. Dropped on connect, refusal, "Type a code instead" or leaving. Kept after offline and "not
  confirmed" so the same code can be tried again.
- **Nothing connects without a tap.** A link opened on the wrong device does not enrol it or use the code.
- **Not closed from the UI:** the browser's history list may keep the first address, and a third-party scanner app may
  keep a scan history. The 15 minutes and the one use bound both.

Codex should review this part, as with the reset link in Phase 5.

## For Codex

1. **The setup code hand-off** (above): `src/components/clocker-setup.tsx`, `clocker-setup-link.ts`,
   `clocker-device-manager.tsx`. The `redeem` call is unchanged.
2. **Four punch replies have no code** (`punch-transport.server.ts`): punches disabled, origin refused, wrong header,
   tablet not registered. The kiosk reads the first three as "not confirmed" and the last as "enter your PIN again".
3. **Fields the kiosk would use:** the shift's scheduled end and worked time today on the receipt; a default language
   per tablet on the setup `status` reply; `attemptedAt` in the journal record, so a reloaded tablet can say "at 9:02
   AM".
4. **Reload with no connection** needs a service worker for `/clocker/` and a server decision on what may be cached.
   Queued punches need server rules.
5. **Owner-side refusals** from `manageClockerDeviceAction` and `saveClockerPinAction` are English sentences with no
   code, so they show as sent. One refusal code (`ENROLLMENT_INVALID`) covers a used, expired or wrong-location setup
   code, by design.
6. **No pause** for a tablet (REGISTER, RENAME, ROTATE, REVOKE only). The setup code card cannot learn that the tablet
   connected without a reload.
7. **Recovery:** two records for one code are shown as "This code has more than one record". Confirm that reading.
8. **Scripts and tests that press the old names will fail:** `scripts/clocker-ipad-ui-qa.mjs`,
   `clocker-journal-mounted-browser.mjs`, `clocker-staging-acceptance.mjs`, `phase-c-punch-ui-qa.mjs`,
   `phase-d-browser-qa.mjs`, `payroll-workflow-ui-qa.mjs`, `document-appearance-browser.mjs`,
   `src/test/integration/shift-change-phase3-facts.integration.ts`. New names: "Check if it saved", "Send it again",
   "See current status", "Ask Owner to check", "Check your last punch". The punches-off note is
   `[data-clocker-punches-off]`. The Owner pages' markup and labels changed throughout.
9. **Manuals.** The guides were rebuilt from `5cc1c838`; this change makes `src/test/manual-publication.test.ts` fail
   again until `docs/guides/web` covers the new Clocker screens and is rebuilt.
10. **Left in shared sheets:** `.wa-pin` rules in `owner-b-desktop.css`, `owner-b-pages.css` and `premium-wave-a.css`
    match nothing now. The paused page's "Try Clocker again" is 52px and the legal links under the not-found card are
    42px (kiosk floor 56px); both sheets belong to other pages.

## For you to decide

1. **"Not confirmed" in place of "not saved".** Your example said "is not saved yet". The kiosk cannot know that, so it
   says "Your clock in at 9:02 AM is not confirmed yet" and that the tablet kept the attempt.
2. **The first name on the two break lines:** "Enjoy your break, James." and "Welcome back, James." You approved them
   without the name.
3. **A fresh Spanish tablet starts in Spanish.** The language stays for the next person; say if it should reset after
   each one.
4. **The not-found page has no sign-in link.** Round 1 kept a quiet one.
5. **Offline says nothing is recorded.** Queued offline punches are a decision for you and Codex.
6. **Kiosk targets are 56px** (were 48px), and "Ask Owner to check" is the quiet button.
7. **The kiosk checks the connection by itself** every 20 seconds while it shows "No connection". It never sends a
   punch by itself.
8. **Should Managers set PINs** for their own location's people? Owner only today.
9. **The clock opens by itself 6 seconds after a tablet connects.** Keep, or wait for the tap.
10. **"This is the tablet: open its Clocker"** on the setup code card, for an Owner holding the tablet. Keep or drop.
11. **Home Screen tablets.** An iPad's camera opens the link in the browser. A kiosk added to the Home Screen may keep
    its own cookies, so a tablet set up in the browser may not be set up in the icon. Not tested on a real iPad;
    typing the code inside the Home Screen app works.
12. **Every new sentence**, English and Spanish, is in section 7 of each report. None is a payroll sentence. Spanish
    is a draft: the kiosk uses "tú", the Owner pages "usted".

## Left for a later pass

| Item | Why |
|---|---|
| The photo review list and the "Help for your team" form | Not rebuilt; they keep their English strings. |
| A calm first paint on a connected tablet (the setup form shows for a moment while it checks) | Two existing tests pin the first paint. |
| Phases 7 and 8 | Motion and finishing moments, final verification and preview. |

## Release sequence

Unchanged. Codex integrates and verifies with the backend on development. The exact verified release is promoted to
main only after Jose approves. Nothing here authorizes a main merge, a production activation, copied production data,
a paid activation or a live charge.
