# Owner premium — round 2 plan (Oct 31)

Sources (critique only, fictional data, branch `claude/owner-premium-20261031`):
`round2-tastemaker.md` (craft + taste), `round2-critique-copy.md` (design critique + 181-row copy table),
`round2-21st.md` (21st.dev patterns). All three agree on the direction: keep the calm corporate look; lift it with
type contrast, colour restraint, one consistent page/title/button/sheet system, better tables, and plain human copy.
Verdict (tastemaker): competent, still reads as a tidy admin template; target "characterful" (Gusto level).

## Round 2 items (all presentation only unless marked)
| # | Item | Sources | Effort |
|---|---|---|---|
| R1 | Type contrast: page title 28/34 desktop, 24/30 phone (-0.02em); key figures one size 20/26; row titles 15/20 500; labels 13/18 500 grey | taste 1 | S |
| R2 | Signature numbers: tabular figures on times, dates, amounts; quiet AM/PM; thin spaces around the dash; one hour format ("8 h 2 min") and one date format | taste 5, copy 2 | S |
| R3 | Colour calm: Home stats in ink (no red 1 / amber 3); one red mark per urgent row and one "Find cover"; default-state pills become grey text (Published, Due, need setup, Live, Waiting, Not filled); Payroll notice becomes a white card with a red title and a neutral button, not repeated on Prepare | taste 2, 21st 1–3, copy 3, 7 | S |
| R4 | One title block and one button system: title at the same height on every page; buttons 40px desktop / 44px phone (32px only in the top bar); one secondary style; no teal outline buttons | taste 3–4, copy 10 | S |
| R5 | Card finish and rhythm: refined edge + soft shadow, leftover warm greys replaced, 12px inside groups / 32px between groups, section labels above list cards | taste 6–7 | S–M |
| R6 | Home with one focus: Today card full width as the main block; Payday and Things to do below, aligned; stats tappable; Things to do splits Open shifts and Missed clock-ins | taste 8, 21st 3, copy 9 | M |
| R7 | Copy pass: rewrite engineering text (Insights "how counted", Clocker recovery hint, Time exports, Punch photos notice); one verb "Approve"; "In progress" while a week can't be approved; Payroll says each thing once ("Prepare by Mon, Nov 2"); 178 changes in the copy table | copy 1–2, 7 | S–M |
| R8 | One sheet pattern: centred title + Done everywhere; tablet sheet one primary + quiet "Remove tablet"; side panel on desktop | copy 5 | M |
| R9 | Pay history and payroll details: name-first, two-line rows; filename and revision off the row | taste 10, copy 6 | S–M |
| R10 | Timecards table: sticky header, 52px rows, Scheduled and Total, actions outside the card, no empty 0% bar, no repeated date header | 21st 5, taste 10 | M |
| R11 | Schedule grid: week bar in the grid card, today's column tinted, open shifts dashed (no red tile), chips top-aligned, past open shifts collapsed to "4 open" and readable (contrast 2.29:1 today) | 21st 6, taste 9 | M |
| R12 | Motion: segmented control, tabs and sidebar indicators slide (200ms kit curve); list rows fade in/out after a save | 21st 4, 7, 8 | S–M |
| R13 | Punch photos collapses to one card while capture is unavailable; Employee PIN tabs fixed; one profile entry in the desktop avatar menu; one Insights period control | copy 4, other | S–M |
| R14 | Copy: remove "lead" from Owner copy (Find cover) | copy 8 | S |

## Needs Jose
1. Approve round 2 (all, or pick).
2. Name for the Time section: keep "Time" in the tab/sidebar with "Timecards" as the page (approved board), or "Timecards" everywhere (copy reviewer).
3. Not presentation-only, so Release 1.1 unless Jose says otherwise: removing the "Lead" role choice in Add employee; Add employee step 2 showing an error before typing (validation timing).

## Not adopted
- Grey sidebar/tab total (Jose decided teal stays on totals).
