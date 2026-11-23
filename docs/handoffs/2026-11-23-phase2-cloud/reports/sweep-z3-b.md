# Z3 sweep, sections F onward: forced colours (A4-05) and language leaks (A4-07), Nov 23, 2026

Branch `claude-codex-collab-nevora-timecards-final`, with da3283a0 merged (0f5f0007). Defects only; no visible change
outside forced colours. Fictional data and a throwaway local database (development build).

## Commits
| Commit | What |
|---|---|
| f9491514 | Settings switches (J4 Features, J7 Edit location, J11 Company policies, J15 Clocker photos) and Profile notification switches (I1): keep a ButtonText edge and thumb; on is the Highlight track, locked is GrayText with the lock. J3 Branding swatch keeps its colour with an edge. F2 Add person step dots keep a border. J13 Clocker devices: tablet rows get a Highlight focus outline; "Get setup code" keeps its edge. "Add a passkey" (I1/I5) keeps a button edge. |
| 4c1a6fe0 | I1 Profile (Employee): the language switch shows the chosen language (Highlight pair; the track keeps an edge). |
| (kit) | Kit buttons: the lead's baca629a rule (outline, b-foundation.css) replaces this branch's owner-b.css border rule (9a64daaf, b5a63c20), which the merge 19d1e134 removes so the edge isn't drawn twice. |
| 481912f3 | J18 Billing (and the K15 Clocker paused frame): "Open billing in Velani", "Refresh status" and the language switch keep a button edge. |

Files: `src/app/app/settings/settings-b.css` (additive, as the README asks for the Settings base),
`src/components/manager-profile/manager-profile-upscale.css`, `src/components/clocker-owner-b.css`,
`src/components/team/team-forms.css`, `src/components/passkeys/passkeys.css`, `src/components/employee-b/account.css`,
`src/components/commerce-recovery/recovery.module.css`. Every rule sits inside `@media (forced-colors: active)`.
Test: `src/components/forced-colors-z3.test.ts` (6 tests). Whole `src/components` suite: 3215 of 3215 pass.

| eb2ed31d | Shell and kit (cleared by the lead): the page-loading bar keeps a Highlight fill (corp-shell.css) and the skeleton blocks a GrayText edge (b-shimmer.css). Normal view pixel-identical. |

## How it was checked
Chromium with `emulateMedia({forcedColors: 'active'})` at 390 (1024 for the Clocker), one role per row. On each page:
every text-less painted mark (dot, bar, switch, swatch) must keep a border, an outline or forced-adjusted paint; every
filled or shadow-drawn control must keep an edge; every selected item (`aria-pressed`, `aria-current`, `aria-checked`)
must differ from its siblings; 10 Tab stops must each show an outline. Language: every visible text node and
`aria-label` on the page, English app checked for Spanish words, Spanish Clocker checked for English words. The kiosk
(K13, and every other kiosk state on the way) was run through the scan's full Clocker flow in English and in Spanish.

## Rows
| Row | Role | Forced colours | Language |
|---|---|---|---|
| F1 Team | Owner | OK except kit button edge ("Add employee", see below). The search field's focus is drawn on its frame (a Highlight ring under forced colours), checked by keyboard. | No leaks |
| F2 Add person | Owner | Fixed: step dots | No leaks |
| F4 Person | Owner | OK | No leaks |
| F5 Pay rate | Owner | OK except kit button edge | No leaks |
| F6 Restrictions | Owner | OK except kit button edge | No leaks |
| F7 Time off balance | Owner | OK | No leaks |
| F8 Clocker PIN | Owner | OK except kit button edge | No leaks |
| I1 Profile | Owner, Employee | Fixed: notification switches (Owner), language switch (Employee), "Add a passkey" | No leaks ("Español" is the language's own name) |
| I2 Policy document | Employee | OK (privacy, terms) | No leaks |
| I3 Calendar | Employee | OK except kit button edge ("Create calendar link") | No leaks |
| I4 Device alerts | Owner | OK (same switches as I1, fixed) | No leaks |
| I5 Passkeys | Owner | Fixed: "Add a passkey" | No leaks |
| I6 Delete my account | Owner | OK except kit button edge ("Delete my account") | No leaks |
| J1 Settings, J2 Workspace, J5 Locations, J6 Add location, J8 Positions, J9 Breaks, J10 Time off policies, J14 Matching, J16 Photo review | Owner | OK | No leaks |
| J3 Branding | Owner | Fixed: swatch | No leaks |
| J4 Features, J7 Edit location, J11 Company policies, J15 Clocker photos | Owner | Fixed: switches; kit `c-btn--secondary` edges remain | No leaks |
| J13 Clocker devices | Owner | Fixed: row focus outline, "Get setup code" edge | No leaks |
| J18 Billing | Owner (commerce on) | Fixed: action edges | No leaks |
| K13 Someone else's punch in progress | Kiosk | OK in English and Spanish | No UI leaks. The Spanish kiosk shows the Owner's own names in English ("Front counter tablet", "Rest break", "Meal break"); that is fictional data as typed, not app wording. |
| K15 Clocker paused | Public | OK in English and Spanish | No leaks |

## Left for the kit session
None: the kit buttons (baca629a), the loading bar and the skeleton blocks are done.

## Not covered
- Payroll (G) and Rondo/Insights (H) have no ✓ (Jose, Nov 23) rows yet, so they were not swept.
- The Profile notification switches render only with device alerts on; the before/after evidence for them is the
  detector log (invisible before, clean after), not a screenshot.
- Development build only (no production capture was asked for); WebKit not run (forced colours is a Chromium/Windows
  feature).
