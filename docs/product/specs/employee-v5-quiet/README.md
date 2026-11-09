# Employee v5 "One look" (Oct 24, 2026): mockups for Jose's approval

Phase 2 of the premium-upgrade plan. Jose chose "Quiet base everywhere": every role uses the approved Quiet v4 base, and the Signature teal stays only as Employee Home's next-shift card. Desktop comes later.

- **Approval board:** https://claude.ai/artifact/DyBXtCEiX435MD47xppgty (private). A copy is in `approval-board.html`.
- **26 screens:**
  - 17 Employee (`E01`–`E17`);
  - 2 Lead (`L01`, `L02`);
  - 1 Manager (`M01`);
  - 6 dark mode (`D01`–`D06`, including sign-in and a proposed Owner dark Today).
- **Files:**
  - `templates/`: the sources, rendered with `build.mjs`;
  - `mockups/`: 2x PNGs;
  - `kit5.css`: `kit4.css` plus the v5 additions (Home card, sheets, radio rows, dark tokens).

## Decisions for Jose

1. **Owner dark mode.** The Owner app follows the phone like every other role (it is light-only today).
2. **Delete account.** Every sentence is kept but regrouped into rows; the retention list opens from "What may be kept". This is account-deletion wording, so it needs his OK.
3. **More.** For employees, More becomes a page instead of a pop-up sheet.
4. **Shift changes.** Swap, offer for cover and Unable to work start from a shift and open as bottom sheets.

## After approval

Build each screen exactly, as with v4, on the Quiet kit in `src/components/quiet`. Then do the CSS cleanup (plan step 1C) once the Signature and older layers have no pages left.
