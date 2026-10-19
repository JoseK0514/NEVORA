# Wave C inspection, round 2

October 19, 2026. Every round-1 finding was worked through. The fixes are live on the same preview (`http://127.0.0.1:49855`), which stays frozen while you look. `BRIEF.md` still holds the pages, accounts, password rule and report format. Read it again, then this file.

## Scope for round 2 (Jose's cuts, PARALLEL.md "Cuts")

- **Re-check every one of your own round-1 findings by ID.** Mark each one Fixed (with the new measurement), Not fixed (measurement and `file:line`), Partly fixed or Regressed.
- **Then look again at whatever the fixes touched** (listed below), in your area, for new defects.
- **Widths and browsers:** Chromium at 320, 390, 844×390 and 1440, at 100% and 200% text, with WebKit spot checks. The full width, text-size and browser sweep runs separately in `checks.mjs`. Don't run it yourself, and no Firefox.
- **Not yours:** the shared shell (phone header, tab bar, More sheet, section tabs, desktop sidebar and header) belongs to the coordinator and the desktop chat. Ignore shell flags.
- **Report:** append `## Round 2` to your own report file with the status table, any new findings in the same format, a short bullet list of what you checked and found correct, and one line saying whether your area has zero open P0–P2.
- The dev server is shared and slow. Use one browser at a time and retry a 500 once.

## What changed (so you know where to look)

- **Forms:** every Wave C form is now `noValidate`, so the shared `form-validation.tsx` skips it, and Wave C checks the declared constraints on submit. There is one error sentence per field, and no checks run on blur.
- **Large text:** buttons wrap their labels; link and code boxes wrap; preview tabs and word choices size to the column; long words hyphenate or break; card heads let a pill drop under the title; the band's Add control drops under Back.
- **Desktop:**
  - Two-column layouts start at 1180px (the sidebar takes 212px).
  - The hub uses balanced CSS columns.
  - Guides and the Branding preview stick below the 65px header, and stay static when the window is shorter than 860px.
- **Save bars:**
  - They dock on the 68px tab bar and stay in the page in landscape.
  - Outcomes show inside the bar.
  - Company policies has only Save in its bar; "Reload policies" is in the history card.
  - On phones the guide comes first on pages with a save bar.
  - Toasts sit at the top on those pages.
- **Dialogs:** one scroll lock (the root element). Destructive confirms (Archive, Revoke, New setup code) open on Cancel.
- **Copy:**
  - Company words on the Locations pages.
  - One count pattern: "Showing n of m noun".
  - Policy options "Off" / "Off by default" / "Use company default", and "Greater than or equal to".
  - "Reference time" for breaks.
  - US spelling ("color").
  - Curly apostrophes, `keepWhole` times, and non-breaking hyphens in "clock‑in" and "clock‑out".
  - The protected timezone reads in full as text.
  - Account recovery shows company time and names the employee in Back.
  - Only an Owner's Back goes to Settings.
- **States:**
  - Branding and Company policies are guarded until hydration, with their finished look kept.
  - The 401 notices on Branding, Features and Policies have a "Go to sign in" link.
  - After a Features save, focus lands on "All changes saved".
  - Clear filters returns focus to the search field.
  - An unknown location has its own not-found page in the Settings frame.
- **Loading:** the Settings segment's placeholder takes the destination's band. The parent placeholder (`root-loading.tsx`) now has one entry per route, with band heights in `premium-wave-c.css`.
- **Look:**
  - An off switch has a 3:1 edge.
  - Disabled kit buttons keep the kit's disabled look (no 55% fade).
  - Footnotes and draft-status lines sit on the card text edge.
  - Disclosure carets sit on the first line.
  - The receipt card keeps one height.
- **Shared fixes cherry-picked:** `9f7b649` (landscape phone type) and `a62cc79` (fields have 3:1 edges and grow with text, `min-height: 3rem`).

## Decided or out of Wave C's hands (don't refile)

| Item | Why |
|---|---|
| Field height: 48px (3rem), growing with text | Shared rule WR-55 and `a62cc79`. PARALLEL.md says 48. Buttons stay 52 |
| Search fields white with a border | Shared WR-49, same as Team |
| Filter pills wrap to a second row on Wave C list pages | These lists have 3–4 pills with counts; wrapping keeps every count visible. Team's pills also wrap (`premium-team-status`) |
| No access: Owner-only pages redirect to Home with no message, and the band shows for a moment first | Server redirect in `permissions.ts`; listed in `CODEX.md` for Codex |
| Toast covering a save bar on other pages; Inter loading without preload (font swap, ST-11); desktop parent placeholder with no band (ST-12) | Shared files, sent to the coordinator |
| Home's row describes Clocker recovery as "Reconnect a shared clock-in device" (`premium-home.tsx`) | Desktop session's file, sent on |
| Strings from `src/lib/workspace-presentation/` (module "off" notes with straight apostrophes, "at least 5:1") | Shared library, sent to the coordinator |
| Policy terms next to legal text ("Observation cutoff", "Aggregation", "Recorded elapsed", "Effective elapsed after corrections") | Policy and legal wording: Jose decides |
| "These rules do not determine pay, discipline, or legal entitlements." | Legal wording, kept exactly |
| Server-written sentences (`CODEX.md` §3) | Server code |
| The four list pages differ in their Add entry point (band Add vs an Add card on Positions) | Positions adds inline in one field; the others open a page or a dialog. Count lines, search and pills now match |
