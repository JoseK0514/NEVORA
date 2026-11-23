# Public pages (A1–A14): capture and gate check

Branch `claude-codex-collab-nevora-batch-public`. Base: `claude-codex-collab-nevora`, merged up to `b40f60e9`, which
carries the 2-hour target.

## Commits (code, in order)
| Commit | What |
|---|---|
| `d3eb96c7` | A9 Verify email: removes the dark focus box round the title on arrival (`src/components/onboarding/signup.css`). |
| `a2592210` | Signed-out footer links get a 44 × 44 minimum box. Spanish passkey button: “Iniciar sesión con una llave de acceso” becomes “Usar llave de acceso” (`src/lib/auth-copy.ts`), so it fits on one line from 320px. |
| `4838425d` | Text sizes in rem in the signed-out CSS (`auth-b.css`, `mobile-access.css`, `signed-out-footer.css`, `signup.css`). |
| `272edd01` | Public-only rem overrides for the Quiet base sizes, plus minimum heights on the language pill and the main buttons. |
| `df4e0c17` | Fixes from the pixel diff: drops the button-size override, keeps the footer line in place. |
| `4b3bb441` | The workspace chip grows with larger text (it spilled over the title at 200%). |

The shots commit is last. It holds this report, `shots/batch-public/rows.json` and 92 webp files at quality 80:
- 15 views × English and Spanish × 390, 768 and 1440
- Sign in at 200% text in both languages

The earlier shots commit `5ec0e90d` (docs only) is superseded by it.

## How it was checked
- **Final production build** of `4b3bb441`: `scripts/ui-checks/collab-qa.sh --production --serve`, run as `postgres`
  under `flock /tmp/nevora-heavy.lock`. It serves the fictional HTTPS origin `collab.nevora.example.invalid` through
  the loopback TLS proxy. Sign-up runs in private-test mode with a fictional approved address and a loopback mail server.
  - Signed out only.
  - Every request outside the sandbox origin was aborted.
  - No email or SMS left the machine.
- **Earlier production build** (`2f2387a9`, before the changes): the first pass and the baseline.
- **Iteration**: the development sandbox (`collab-qa.sh --serve`).
- **No visual change at the default size**: a pixel diff of every page against the baseline.
  - Every page height matches, except Spanish Sign in, which is 9px shorter because the passkey label is one line now.
  - The other differences are the A9 title box (removed), the Sign in greeting (time of day) and a 13px strip at the
    footer links ("Terms" is centred in its 44px box).
- **Probe on the final build**, for every view in English and Spanish at 390, 768 and 1440 (Chromium, reduced motion):
  - visible strings and any repeats
  - left and right text edges, button heights, widths and fills
  - text overlap, clipping and page overflow
  - time strings
  - 200% text at 390
- **axe 4.x** (wcag2a, wcag2aa, wcag21, wcag22aa, best-practice) at 390 and 1440 in both languages: **0 violations**
  on 56 page views.
- **Keyboard**: Tab through every page at 390 and 1440 in both languages. Every stop has a visible ring (0 without).
- **Targets**: real hit areas, measured by hit-testing out from each target's centre. All are 44px or more, including
  the language pill, the band back link and the footer links.
- Not run: WebKit; 320px captures (320 was measured for the passkey label only); filled-in error and success states,
  which need a token, an email link or a submission. Each page is captured in its arrival state.

## Per page (final build)
| Row | Page | Changed | Main button (h, px) | Overflow 390/768/1440 | Text edges L/R (390 · 768) |
|---|---|---|---|---|---|
| A1 | `/` → `/login` | redirect, one hop | as A2 | 0/0/0 | as A2 |
| A2 | Sign in | Spanish passkey label; chip grows with text | Sign in, Solid teal 52; passkey, outlined 48 (EN and ES, one line) | 0/0/0 | 28/340 · 205/559 (ES 553) |
| A3 | Welcome | rem only | Sign in, Solid teal 52 | 0/0/0 | 28/340 · 205/539 |
| A4 | Forgot access | rem, chip | Email me a reset link, Solid teal 52 | 0/0/0 | 28/344 · 205/557 |
| A5 | Reset access | rem, chip | Save new password, Solid teal 52 | 0/0/0 | 28/340 · 205/562 |
| A6 | Activate | rem, chip | Get invitation help, Solid teal 52 | 0/0/0 | 28/340 · 205/554 |
| A7 | Access help (hub and topic) | rem | Topic: Sign in, Solid teal 52 | 0/0/0 | 28/340 · 205/539 |
| A8 | Owner sign-up | rem | Send confirmation link, Solid teal 52 | 0/0/0 | 28/340 · 205/556 |
| A9 | Verify email | **title focus box removed** | Start signup, Solid teal 52 | 0/0/0 | 28/351 · 205/548 |
| A10 | Activate business | rem | Back to signup, Solid teal 52 | 0/0/0 | 28/353 · 205/557 |
| A11 | Privacy | footer only (legal text word for word) | none; section rows 52 | 0/0/0 | 36/354 · 36/732 |
| A12 | Terms | footer only (legal text word for word) | none | 0/0/0 | 36/354 · 36/732 |
| A13 | Support | rem for its question rows | none (email row) | 0/0/0 | 36/353 · 36/718 |
| A14 | Account deletion | footer only | Start deletion request, outlined 48 (PB-024 decision) | 0/0/0 | 36/354 · 36/732 |

At 1440, the auth pages put a 376px form card beside the teal brand panel. The policy pages use the band and the
reading card (text 220/1206 with the contents card; Support and Account deletion 342/1084). The footer applies to
every page.

**Before/after words.** Spanish Sign in: “Iniciar sesión con una llave de acceso” → “Usar llave de acceso”. The voice
guide keeps “Iniciar sesión” for signing in; the button sits under Iniciar sesión and “o”, so the shorter label reads
clearly. No other wording changed, and the legal text was not touched.

Repeated strings the probe flagged are intended:
- Privacy and Terms list each section title twice on desktop: once in the contents card and once in the text.
- Support shows its title and the footer's “Support” link.

**Time format.** None of these pages shows a time.

## Impeccable audit: Signed-out and public pages A1–A14 (public; 390, 768, 1440 and 200% at 390; arrival state)
Checked: final production build in Chromium, English and Spanish, full-page captures, the DOM probe, axe, Tab walk
and hit-testing.

Blocking: none left. Fixed in this package:
1. [Accessibility] A9: the title showed a focus box on arrival (`d3eb96c7`).
2. [Hierarchy] A1/A2 Spanish: the passkey button wrapped to two lines and stood 57px beside the 52px Iniciar sesión
   (`a2592210`).
3. [Accessibility] Footer links were under 44px (“Terms” 40px wide; all 43px tall from 768) (`a2592210`, `df4e0c17`).
4. [Accessibility] Text sizes were fixed in px on the signed-out pages, so they ignored the reader's text setting. Now
   in rem; the chip, language pill and main buttons grow instead of clipping (`4838425d`, `272edd01`, `4b3bb441`).

Should fix (left, with reason)
5. [Spacing] A8–A10 sign-up: the title is left aligned in the card with no step bar and no “‹ Sign in” link, unlike
   A4–A6. That's a layout change to the sign-up journey, beyond a gate fix.

Polish
6. [Hierarchy] A5 without a code: the step bar shows “Step 3 of 3” with no step name.
7. [States] A9: the console logs a 401 when the page opens without a sign-up session (the resume check).
8. [Accessibility] At 200% text on a phone, “Sign in with a passkey” and the Employee ID help link wrap to two lines.
   Nothing overlaps or is cut off, and the buttons grow with the text.

States: Empty ✓ (missing link or token on A5, A6, A9, A10) · Loading ✗ not captured · Error ✗ not captured ·
Success ✗ not captured · Edge ✓ (EN/ES, 200% text)
Not checked: WebKit, 320px captures, filled-in error and success states, screen reader output.

## For the lead (shared files)
- `src/components/quiet/quiet.css` (Quiet kit, shared app-wide) still sets its sizes in px: `.q-hd h1` 34px, `.q-btn`
  17px, `.q-rt b/i`, `.q-auth__lang` 15px and about 150 more. On signed-out pages, `auth-b.css` now overrides them in
  rem. The kit itself is unchanged.
- Shared but signed-out-only files changed here:
  - `src/components/auth-premium/auth-b.css`
  - `src/components/auth-premium/signed-out-footer.css` (also on the 404 and public error screens)
  - `src/components/mobile-access/mobile-access.css`
  - `src/lib/auth-copy.ts` (Spanish passkey label)

## Proposed ledger rows
| # | Screen | Gap | Source | Kind | Status |
|---|---|---|---|---|---|
| G73 | Sign-up A8–A10 | Title left aligned in the card; no step bar or “‹ Sign in” link, unlike A4–A6 | Public batch | Consistency | open |
| G74 | Reset access | “Step 3 of 3” with no step name when opened without a code | Public batch | Copy | open |
| G75 | Verify email | Console 401 on arrival without a sign-up session (resume check) | Public batch | Console noise | open |
| G76 | Quiet kit | `quiet.css` sizes in px app-wide; public pages override in rem | Public batch | Text size | open (kit) |
