# Z3 sweep, sections A–E: forced colours (A4-05) and language leaks (A4-07), Nov 23, 2026

Branch `claude-codex-collab-nevora-staff`, final captures from d9a946ab (origin with the kit button rule baca629a
merged). Production build, Chromium with `emulateMedia({forcedColors: 'active'})`, fictional data. One role per row:
Owner (`QAOWNER`, rich Owner data) for manager rows, Employee (`QA-SCAN-B`, rich data) for employee rows, signed out
in English and Spanish (`nv-lang` cookie) for A1–A14. 390 and 1440 for every row; viewport-height shots before and after.

## How each row was checked
- Forced colours: a probe lists controls drawn only by a fill (no border or outline in the forced palette), status
  dots that vanish (small empty elements with no edge), a chosen tab drawn the same as its neighbours, and fields whose
  focus ring is a shadow (Tab through the first ten stops); then each shot was looked at.
- Language: every visible and screen-reader text node checked for Spanish words in English pages (B–E, A1–A14 in
  English) and English words in the Spanish public pages, skipping text inside an element marked with its own `lang`.

## Commits
| Commit | Fix | Rows |
|---|---|---|
| b77bc57d | The signed-out footer's screen-reader line "NEVORA is a product of VELANI LLC." is marked `lang="en"` (as `brand-legal.tsx` does); wording unchanged. Test in `phase8.test.tsx`. | A1–A14 (Spanish) |
| ccc8038f, 4e505c5b | Forced colours (`b-foundation.css`, `@layer nv-b`): the chosen tab of every segmented control gets a Highlight outline; `:focus-visible` gets a Highlight outline; status dots (`mb-dot`, `b-dot`, `eb-unread`, the week strip's has/gap dots) keep the text colour. Button edges removed again in 4e505c5b: the kit rule from the Timecards session (baca629a) covers them. | B3, B5, C1, C4, C5, C14, C15, E1 |
| ccc8038f | `access-recovery.css`: the password rules' dots keep the text colour. | A5 |
| c671905a | The week strip's Open shifts legend dot keeps the text colour. | C1, C4, C5 |
| d9a946ab | The chosen Timecards filter (All, In progress, Approved; `.c-tc-tabs`) and the other corporate tab rows (`.c-tabs`, `[data-c-tabs]`) get the Highlight outline. | D1 |
| 170901a1 | Merge of origin (baca629a) into this branch; conflict in my own block resolved to the newer version. | — |

Tests: `src/app/app/b-foundation-forced.test.ts` (new, 3) and `phase8.test.tsx`; the whole `src/components` suite
passes (3209 tests); typecheck clean.

## Results
- **Language leaks (A4-07):** one, on every Spanish signed-out page (the footer's English ownership line without
  `lang`), fixed. No Spanish found inside the English app (B1–E1). The Privacy, Terms and Account deletion texts are
  English on the Spanish pages and already marked `lang="en"` (approved legal wording, unchanged).
- **Forced colours (A4-05):** after the fixes and the kit button rule, the probe finds no vanished dot, no chosen tab
  drawn like the others, and no field without a focus outline on any A–E row.

## Left as they are (not defects)
- Text-style actions read as text by design: Add shift's phone header "Save" (beside "Cancel"), the show-password eye
  (an icon), the language switch, the policy pages' section headers and "Open all", "Start deletion request" (a link,
  drawn as a link).
- Owner list rows (Timecards people, the week day buttons) are rows, not buttons, and stay rows.

## For the app shell (not in A–E files)
- The desktop top bar's Search and account menu buttons have no edge in forced colours (`command-finder-trigger`,
  `nevora-action-menu-trigger`).
- In the earlier pass the desktop sidebar links reported no outline on the link itself; their ring is drawn on
  `::after` (RA-17) and shows in the shots.

## Captures
`shots/sweep-z3-a/img/<row>[-en|-es]-<before|after>-<390|1440>.webp` (quality 80), viewport-height, forced colours on;
`rows.json` has one entry per row (`<row>-fc`). Before shots are from fe25235e (origin at da3283a0 merged, before any
Z3 change).

## Shell follow-up (lead, Nov 23, 15:37)
- 5511429e: in forced colours the top bar's Search, bell and account menu (desktop) and the phone header's bell, avatar
  and Add shift get a 1px ButtonText inset outline, as the kit buttons (baca629a).
- b35fb837: the bell's glyph was set to the band's white with layered !important and stayed white on the forced
  Canvas (the bell circle was empty, before and after the edge); it is now drawn in ButtonText.
- Checked on the Owner (Schedule) and Employee (Home), 390 and 1440; row `SHELL-fc` in rows.json (before and after).
