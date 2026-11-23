# Time exports and Paid time export: wording options for Jose

Two messages are waiting on a wording decision. **A** is today's approved wording, as merged at `58a1dbee`. **B** is the
proposal: it drops the words that repeat what the page already shows (the week, or "Time exports" when the back link
right above already says it), and the button names what you do there.

The shots are in `img/`, named `<A|B>-<screen>-<width>.webp`. They come from a production build on fictional data,
signed in as the Owner. English is at 390 (phone, viewport height) and 1440; Spanish is at 390. All 28 captures have 0
axe violations and no clipped, overlapping or off-screen text.

## G8 Time exports, while the week is still open
The Week field above the message already shows "Nov 23–29 (this week)".

| | A (approved) | B (proposal) |
|---|---|---|
| Line | Its timecards can be approved from Mon, Nov 30. | Timecards can be approved from Mon, Nov 30. |

- Shots: `A-G8-390`, `B-G8-390`, `A-G8-1440`, `B-G8-1440`.
- The Owner's line keeps "Go to Timecards" in both. The Manager's line has no link in both, because their back link already goes to Timecards.
- This page has no Spanish copy.

## G9 Paid time export, hold card
The phone band and the desktop header both show "‹ Time exports" above the card. The card's title doesn't change in
either option.

### Choose who's included first (`G9-not-reviewed`)
| | A (approved) | B (proposal) |
|---|---|---|
| Line (EN) | Go through everyone on the team for this period, then come back. | *(same)* |
| Button (EN) | Open Time exports | Review who’s included |
| Line (ES) | Repasa a todas las personas del equipo para este período y vuelve aquí. | *(same)* |
| Button (ES) | Abrir Exportar horas | Revisar quién está incluido |

### The team or the timecards changed (`G9-changed`)
| | A (approved) | B (proposal) |
|---|---|---|
| Line (EN) | Review who’s included again on Time exports. The export uses exactly that list. | The export uses exactly the list of who’s included. |
| Button (EN) | Open Time exports | Review who’s included |
| Line (ES) | Revisa otra vez quién está incluido en Exportar horas. La exportación usa exactamente esa lista. | La exportación usa exactamente la lista de quién está incluido. |
| Button (ES) | Abrir Exportar horas | Revisar quién está incluido |

### This period is already complete (`G9-complete`)
| | A (approved) | B (proposal) |
|---|---|---|
| Line (EN) | The server already has a complete record of this period. Its files are on Time exports. | The server already has a complete record of this period. |
| Button (EN) | Open Time exports | See the files |
| Line (ES) | El servidor ya tiene un registro completo de este período. Sus archivos están en Exportar horas. | El servidor ya tiene un registro completo de este período. |
| Button (ES) | Abrir Exportar horas | Ver los archivos |

**Links:** the buttons go to the same place in A and B. "Review who's included" goes to Time exports' "Who's included"
section for the same period (`/app/payroll-export?start=…&end=…#who-is-included`), as A's button does for these two holds. "See the files" goes to Time
exports for the same period (`/app/payroll-export?start=…&end=…`), as A’s button does for this hold.

## How the shots were made
- **Hold states:** the build has only fictional data, and it contains just the first hold (nobody chosen yet). For "changed" and "complete", the capture browser rewrote the reply of the period-close read (`POST /api/period-close`, READ) before the page saw it. "Changed" gets a saved list whose source no longer matches. "Complete" gets a current record of the period. Nothing reached the server, and the page code is the same as A or B.
- **Spanish:** the live paid-time page never passes a language to the flow, so it always shows English, even though `copy.ts` has the Spanish strings. For these shots, a local commit that was never pushed let the page read `?lang=es`. If Jose wants Spanish shown on this page, wiring the language up is a separate change.
- **Commits:** option B's code lives only in local, unpushed commits. Nothing from B is on any shared branch.
