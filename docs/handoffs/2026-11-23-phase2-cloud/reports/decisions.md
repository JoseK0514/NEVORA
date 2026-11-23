# Jose's four decisions, built (Nov 23, 2026)

Code on `claude-codex-collab-nevora-core` after merging `f5f64a2c` (`ceb6628a`):
- `b11e780d` DEC1: the Lead and Employee band says each fact once. Home's band shows Hours and Scheduled payday only.
  The Lead's card title is "On shift now" again, and Employee Schedule's band says "56 h this week".
- `0607f329` DEC2 (G68): Team's phone filters are two rows of two while the card is at least 21rem wide. A test is added.
- `5e0cb60e` DEC3 (G14): the filter reads "On the clock" on phones and desktop, and rows keep "Clocked in". Tests are
  updated and added.
- `6dc46749` DEC4 (G4): every Copy receipt word comes from one English/Spanish table, and the old inline English is
  gone. The page passes no language. The only language source in the app is the sign-in pages' `nv-lang` cookie and
  Accept-Language (`readAuthLang`), which the billing recovery page follows but no Direction B screen does, so C8
  defaults to English. The Spanish is ready, as `workCopy()` keeps it for the Employee screens. Tests check that both
  tables have the same entries and that the Spanish renders.

Checks: tsc and oxlint are clean, and the whole `src/components` suite plus the new and changed app tests pass (3,246
tests, 283 files, 0 failed).

Captures: production builds of `6dc46749`, fictional data. Axe finds 0 violations at 390 and 1440 on every page, and
nothing scrolls sideways. The only 200%-text audit hits are the ones already known (Home's weekday labels in the kit,
and a visually hidden heading on Employee Schedule). The C8 Spanish shots come from the same commit plus a
capture-only `?lang=es` switch that isn't on any pushed branch.
