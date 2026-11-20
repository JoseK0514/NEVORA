# Desktop and mobile defect audit: fixes (Nov 19, 2026)

Jose shared the desktop and mobile defect audit of `bc75950a83ce6299dd89953ccb528e06450fa2e2` (first audit and second
pass) and asked Claude to inspect it and correct what applies. All five findings were reproduced on that commit and are
fixed in the UI. No server code, data contract or API changed.

Release sequence: Development is the acceptance release. These fixes go to `claude-codex-collab-nevora` only with Jose's
approval, then Codex joins them into the Development candidate. Main needs Jose's separate approval.

## Findings and fixes

| Audit | What was wrong | Fix |
| --- | --- | --- |
| NV-AUDIT-01 · P2 | Clocker PIN step on short screens: at 320x568 the first key started at y=523 and Continue at y=799; at 844x390 Continue started at y=398; at 699x390 the keypad sat under the band. | Short landscape (under 32 lines of text tall, 600px wide and up) keeps the side band and puts the keypad beside the field, its message and Continue. Short phones tighten the band and the card, and opening the PIN step scrolls just far enough to show Continue. Keys and buttons stay 56px. |
| NV-AUDIT-02 · P2 | At 700x390 and 844x390 the sticky band held 507px of content in 390px with its overflow hidden, so the time zone and tablet name were cut off for good. | The short-landscape band is narrower and tighter, so the location, date, state, time zone and tablet name fit (390 of 390px). A longer name scrolls inside the band instead of being cut. |
| NV-AUDIT-03 · P2 | Owner › Clocker tablets at 320px: the kit's two-line clamp under 360px cut "Calle Loíza · Connected · Last used …" to one line in WebKit. | A facts line built from parts (Dotted) is never clamped; it wraps between its parts (`owner-b.css`). |
| NV-AUDIT-04 · P3 | The schedule grid cut long names ("Alexandra Montenegro d…", one line with an ellipsis at 844px), so two people looked the same; only a mouse tooltip had the rest. | The Owner and Manager grids show each whole name, wrapping under itself; a long name makes its row taller. The redundant tooltip is gone. |
| NV-AUDIT-05 · P2 | A time-off decision whose answer was lost fell through to the page's error screen, "This page didn't load. Nothing was changed.", while the decision was already saved. | Decline and Approve (request page, Waiting list, Things to do) step aside for an amber note, "Your decision isn't confirmed yet. The answer didn't arrive, so it may already be saved. Check the request before you decide again." The check opens the request: "Already approved" or "Already declined" with who and when, or the buttons return under "This request is still waiting. Decide again." |

## Files

- `src/components/clocker.module.css`, `src/components/clocker-pin-gate.tsx` (01, 02)
- `src/components/owner-b/owner-b.css` (03)
- `src/app/app/b-foundation.css`, `src/app/app/owner-b-schedule.css`, `src/components/manager-weekly-roster.tsx` (04)
- `src/components/time-off-decision-form.tsx` and `.css` (new), `src/components/manager-time-off.tsx`,
  `src/components/time-off-waiting-list.tsx`, `src/components/owner-b/inbox-b.tsx` (05). The server action
  `reviewTimeOffAction` is unchanged; its redirects still reach Next's router.

## Evidence

Local Next development server, owned loopback PostgreSQL, fictional workspace (Northside Café & Bakery), Playwright
Chromium and WebKit. Each finding ran on the tested commit and on the fix with the same fixture.

- **Clocker PIN step**, 14 sizes from 320x568 to 1440x900 in Chromium, three in WebKit. Fixed: the keypad and Continue
  are on screen at every size, a 390x844 phone does not scroll, the short-landscape band fits with every line, no
  horizontal overflow. Tab order unchanged (field, keys, language switch; Continue joins once a digit is typed). Spanish
  wrong PIN at 700x390 and 320x568 and 200% text at 1024x768, 390x844 and 844x390 keep the keypad and Continue on screen.
  axe-core: 0 violations at 320x568, 667x375, 844x390 and 1440x900.
- **Tablet rows**, 320, 360, 390 and 1440 in Chromium and 320 and 390 in WebKit. Before, WebKit at 320: one line, cut.
  After: two lines, nothing cut. axe-core 0 at 320.
- **Schedule grid**, 1440, 1280, 1024, 900 and 844 in Chromium, 1440 and 844 in WebKit, with three long names (two
  share "Alexandra Montenegro de la Cruz"). Before: two or three names cut at every width. After: none cut. axe-core 0.
- **Lost decisions**, Chromium at 1440 and 390 plus WebKit at 390. A reply dropped after the app saved the decision
  (request page approve, Things to do decline, Waiting list decline), and dropped before it reached the app (request
  page approve, Waiting list decline). Before: the error screen with "Nothing was changed" in all six cases, five of
  which were saved. After: the note in every case with focus on it; the check showed "Already approved" or "Already
  declined" with "Approved by Elena Ruiz · Nov 19", or the waiting request; deciding again after an unsaved try
  approved it. axe-core 0 on the note.

## Not covered

Physical phones and tablets, an installed app, hosted Development and a screen reader pass. The full-page screenshots
show the hidden skip link and the tab bar where the page was scrolled; both are capture artifacts (the link measured
off screen and unfocused).

## Pictures

`pictures/before-*` is the tested commit and `pictures/after-*` the fix, same fixture and size.

| Pair | Shows |
| --- | --- |
| `ck-pin-320x568`, `ck-pin-699x390`, `ck-pin-844x390`, `ck-wk-pin-844x390` | Clocker PIN step (01), WebKit last |
| `ck-pin-700x390`, `ck-es-wrong-pin-700x390` | The band at 700x390, and a wrong PIN in Spanish (02) |
| `tablets-wk-320x568` | Owner tablet rows in WebKit (03) |
| `grid-1440x900`, `grid-844x390` | Schedule grid names (04) |
| `approve-lost-reply-1440`, `approve-C-inbox-unknown-1440-view` | A lost decision on the request page and on Things to do (05) |
| `after-approve-A-unknown-390-view`, `after-approve-A-checked-390`, `after-approve-B-still-waiting-390-view`, `after-approve-C-waiting-unknown-390-view`, `after-approve-wk-unknown-390` | The note, the check's two outcomes, the Waiting list, WebKit (05) |
