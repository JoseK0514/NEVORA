# Decisions for Jose: five small wording choices

A is today and B is my proposal. Each was captured from a production build on fictional data: A on `b9aa04f5`, B on
the same tree with the B words (code kept local, not merged). Shots are in `img/` and named by item number. The app
shows phones at 390, desktop at 1440, and the Clocker at 390x844 and 1024x768. On the app screens, axe gives the same
result in A and B (the Clocker capture mode doesn't run axe). The one finding on the Employee Updates list (a row whose screen-reader name differs from its text) exists in
A too and isn't caused by the wording.

## 1. Updates: "Acknowledged" (B6/B7)
An update can be **read** or, when the Owner requires it, **acknowledged**. These are two states, so "Read" or "Seen"
can't take the word's place without merging them. The plainer word is **Confirmed**: the app already says "You
confirmed receipt of this version", and the Spanish screens already say "Confirme el aviso del equipo" and "Por
confirmar".

| Where | A (today) | B |
|---|---|---|
| Employee and Lead list, filter | To acknowledge | To confirm (ES today: Por confirmar) |
| List row button | Acknowledge | Confirm |
| List row status | Acknowledged | Confirmed |
| Update detail, line | Your acknowledgement is required. Opening this update does not record it. | Confirm that you’ve read it. Opening it doesn’t count. |
| Update detail, button | Acknowledge update | Confirm I read it |
| Update detail, done | Acknowledged 9:41 AM | Confirmed 9:41 AM |
| Notification | Acknowledge the team update | Confirm the team update (ES today: Confirme el aviso del equipo) |
| Owner and Manager detail, card | Acknowledged · 0 of 10 | Confirmed · 0 of 10 |
| After publishing | Acknowledged by 0 of 10 so far | Confirmed by 0 of 10 so far |

**Recommendation: B.** It is the everyday word, it matches the Spanish that already ships, and it keeps read and
confirmed as two separate states.

## 2. Person (F4): "one-time link"
| Where | A | B |
|---|---|---|
| Person page, Reset password row | Give them a one-time link to sign back in | Give them a link to set a new password |
| Help someone sign in, band line | Give someone a one-time link to reset their password. | Give someone a link to set a new password. |
| Help someone sign in, How this works | You get a one-time reset link: a QR code they scan, or a link you copy. | You get a reset link: a QR code they scan, or a link you copy. |

The link page already says the fact in plain words: "It works once, until 3:15 PM". **Recommendation: B.** "One-time"
is jargon on the row, and the limit is stated where it matters.

## 3. Timecards: "Approve each timecard, then finalize the week to lock it for payroll."
On an open week the summary card already reads "6 to approve · 5 to finalize", next to "Approve 3 ready timecards", and
rows say "Ready to finalize". So the steps line on the page repeats what the card shows.
- A: the line shows on the page (desktop under the summary; phones as a note), in a person's timecard, and in the
  Select bar.
- B: the line is cut from the page and stays in a person's timecard and in the Select bar, where Approve and Finalize
  are actually taken. Its words are unchanged.

**Recommendation: B (cut from the page).** "To lock it for payroll" still appears at the moment someone finalizes.

## 4. Clocker offline: "No connection" in the band and the card heading
B keeps the band's status pill, "No connection" (ES "Sin conexión"), because it is the tablet's status on every screen
(the pill reads "Tablet connected" when all is well). B changes the card, which says what it means for the person. The
same change applies to K1, K3 and the offline fallback page (`clocker-pin-gate.tsx` and `clocker-fallback.tsx`). The
fallback page shows only when the tablet loads with no network, which this harness doesn't reach, so it isn't in the
shots.

| Where | A | B |
|---|---|---|
| Card heading | No connection · Sin conexión | Time can’t be recorded · No se puede registrar el tiempo |
| Card, first line | This tablet is offline, so nothing can be recorded right now. · Esta tableta no tiene conexión, así que ahora no se puede registrar nada. | This tablet is offline. · Esta tableta está sin conexión. |
| Card, second line (unchanged) | Tell a manager so your time gets recorded. · Avísale a un gerente para que registre tu tiempo. | same |

**Recommendation: B.** The band says what's wrong, and the card says what it means and what to do.

## 5. Clocker K4: unknown Employee ID on the PIN step
The PIN step doesn't show the Employee ID, so "Check both" points at something the person can't see.

| | A | B |
|---|---|---|
| English | Employee ID or PIN not recognized. Check both, or ask your manager. | Employee ID or PIN not recognized. Check your Employee ID and PIN, or ask your manager. |
| Spanish | ID de empleado o PIN no reconocido. Revisa ambos o pide ayuda a tu gerente. | ID de empleado o PIN no reconocido. Revisa tu ID de empleado y tu PIN, o pide ayuda a tu gerente. |

**Recommendation: B.** It runs one line longer, and the shots show it still fits above the keypad at 390 and 1024 in
both languages. The ← next to "Enter your PIN" already goes back to the Employee ID.
