# Public pages (A1–A14): capture and gate check

Branch `claude-codex-collab-nevora-batch-public`, based on `claude-codex-collab-nevora` at `2f2387a9`.

## Commits
- `d3eb96c7` Sign-up verify: no focus box round the page title on arrival (A9). One rule in
  `src/components/onboarding/signup.css`. The onboarding tests pass (`node scripts/run-rstest.mjs src/app/onboarding
  src/components/onboarding`: no failures). The change is CSS only, so typecheck and oxlint had nothing to check.
- The shots commit adds this report, `shots/batch-public/rows.json` and 90 webp captures (15 views × EN/ES × 390, 768,
  1440, quality 80).

## How it was checked
- **One production build**: `scripts/ui-checks/collab-qa.sh --production --serve`, run as `postgres` under
  `flock /tmp/nevora-heavy.lock`. It builds the commit `2f2387a9` and serves it on the fictional HTTPS origin
  `collab.nevora.example.invalid` through the loopback TLS proxy. Sign-up runs in private-test mode with a fictional
  approved address and a loopback mail server. No email or SMS left the machine. Signed out only, and every request
  outside the sandbox origin was aborted.
- Playwright Chromium, reduced motion on, `nv-lang` cookie for English and Spanish. Each view was captured at 390×844,
  768×1024 and 1440×900 as a full page. A probe ran at each width and recorded:
  - every visible string and any repeats
  - left and right text edges, button heights, widths and fills
  - text overlap, clipped text and page overflow
  - time strings
  - the same layout checks at 200% text at 390, without captures
- Keyboard: Tab order on Sign in at 390 and 1440 in both languages.
- **A9 capture**: the fix landed after the build. The A9 captures were taken on the same build with the committed rule
  injected (`addStyleTag`, the same selector). On the live page the title had no ring and Tab still ringed “Start
  signup”. I did not do a second production build.
- Not run: axe, WebKit, 320px captures, and filled-in form states (errors, sent, success). Those states need a token,
  an email link or a submission, so only the arrival state of each page is captured.

## Per page

| Row | Page | Changed | Main button (h × w at 390 / 768 / 1440) | Overflow | Text edges L/R (390 · 768 · 1440) |
|---|---|---|---|---|---|
| A1 | `/` → `/login` | No (redirect in one hop, status 200 on `/login`) | as A2 | 0 / 0 / 0 | as A2 |
| A2 | Sign in | No | Sign in: Solid teal 52 × 318 / 358 / 376; passkey: outlined 48 (EN) | 0 / 0 / 0 | 28/340 · 205/559 · card 376 wide |
| A3 | Welcome | No | Sign in: Solid teal 52 | 0 / 0 / 0 | 28/340 · 205/539 |
| A4 | Forgot access | No | Email me a reset link: Solid teal 52 | 0 / 0 / 0 | 28/344 · 205/557 |
| A5 | Reset access | No | Save new password: Solid teal 52 | 0 / 0 / 0 | 28/340 · 205/562 |
| A6 | Activate | No | Get invitation help: Solid teal 52 | 0 / 0 / 0 | 28/340 · 205/554 |
| A7 | Access help (hub + “Find your Employee ID”) | No | Topic: Sign in, Solid teal 52 | 0 / 0 / 0 | 28/340 · 205/539 |
| A8 | Owner sign-up | No | Send confirmation link: Solid teal 52 | 0 / 0 / 0 | 28/340 · 205/556 |
| A9 | Verify email | **Yes**: focus box on the title removed | Start signup: Solid teal 52 | 0 / 0 / 0 | 28/351 · 205/548 |
| A10 | Activate business | No | Back to signup: Solid teal 52 | 0 / 0 / 0 | 28/353 · 205/557 |
| A11 | Privacy | No (legal text word for word) | none; sections are 52px rows | 0 / 0 / 0 | 36/354 · 36/732 · 220/1206 |
| A12 | Terms | No (legal text word for word) | none | 0 / 0 / 0 | 36/354 · 36/732 · 220/1206 |
| A13 | Support | No | none (email row) | 0 / 0 / 0 | 36/353 · 36/718 · 342/1084 |
| A14 | Account deletion | No | Start deletion request: **outlined** 48 | 0 / 0 / 0 | 36/354 · 36/732 · 342/1084 |

At 1440 every auth page puts a 376px-wide form card beside the teal brand panel (text 56…1384 includes the panel). The
policy pages use the band with the reading card. Spanish edges match English within the card. The centred footer link
row is the only line that differs: it runs 34/356 in Spanish because of “Eliminar cuenta”.

**Before/after words.** The only change is A9's title ring, so no wording changed. Repeated strings the probe flagged
are intended, not gate failures:
- Privacy and Terms list each section title twice on desktop: once in the contents card and once in the text.
- Support shows its title and the footer's “Support” link.
- The support address appears in several legal paragraphs.

**Time format.** None of these pages shows a time.

**Keyboard.** Sign in at 390 tabs through these stops:
- skip link
- wordmark
- language
- Employee ID
- password
- show password
- Forgot password?
- Sign in

At 1440 it tabs through language, the fields, Sign in, passkey, Forgot password? and New here?. Every stop has a 2px
ring: teal on white, white on the band. Spanish is the same.

## Impeccable audit: Signed-out and public pages A1–A14 (public, 390/768/1440 + 200% at 390, arrival state)
Checked: production build, Chromium, EN and ES, full-page captures plus the DOM probe above.

Blocking
1. [Hierarchy] A1/A2 Spanish, 390 and 768: “Iniciar sesión con una llave de acceso” wraps to two lines (57px tall
   against 52px for Iniciar sesión), so the two stacked buttons differ in height. This breaks gate point 4. The label
   comes from the shared auth copy (`src/lib/auth-copy.ts`), and a shorter wording is Jose's call. Fix: a shorter
   Spanish label, for example “Entrar con llave de acceso”. Not changed here.
2. [Accessibility] A9 Verify: the title showed a dark focus box on arrival at every width. **Fixed** in `d3eb96c7`.

Should fix (end sweep)
3. [Hierarchy] A14: the page's only action, “Start deletion request”, is an outlined 48px button. The picks say
   Solid teal for a main action. Needs a decision, since it starts a destructive request.
4. [Spacing] A8–A10 sign-up: the title is left aligned in the card, while A4–A6 centre it under a step bar. The pages
   also have no “‹ Sign in” back link.
5. [Accessibility] 200% text at 390: “Sign in with a passkey” and “Email me a reset link” wrap. The chevron on
   “Where do I find my Employee ID?” sits apart at the right edge. Nothing overlaps or clips, and the page doesn't
   overflow.

Polish
6. [Hierarchy] A5 without a code: the step bar reads “Step 3 of 3” with no step name. A4 and A6 name their step.
7. [Hierarchy] A7: the back link reads “Back”, while the other public pages read “‹ Sign in”.
8. [States] A9: a 401 shows in the console when the page opens without a sign-up session. This is the resume check.

States: Empty ✓ (missing link or token states on A5, A6, A9, A10) · Loading ✗ not captured · Error ✗ not captured ·
Success ✗ not captured · Edge ✓ (EN/ES, 200% text)
Not checked: axe, WebKit, 320px, filled-in error and success states (need a token, link or submission), screen reader
output.

## Blocking items left
- Spanish passkey label wraps on phones and tablets (item 1). It needs a copy decision in the shared auth copy, which is
  outside the page files.

## Proposed ledger rows (end sweep)
| # | Screen | Gap | Source | Kind | Status |
|---|---|---|---|---|---|
| G73 | Sign in (ES) | “Iniciar sesión con una llave de acceso” wraps at 390 and 768 (57px vs 52px); shorter Spanish label needed | Public batch | Copy + layout | open (blocking, needs wording) |
| G74 | Account deletion | Only action “Start deletion request” is outlined, not Solid teal | Public batch | Component pick | open (end sweep, decision) |
| G75 | Sign-up A8–A10 | Title left aligned in the card, no step bar or “‹ Sign in” link, unlike A4–A6 | Public batch | Consistency | open (end sweep) |
| G76 | Sign in, Forgot access | At 200% text (390), passkey and “Email me a reset link” labels wrap; Employee ID help chevron sits apart | Public batch | 200% text | open (end sweep) |
| G77 | Reset access | “Step 3 of 3” has no step name when opened without a code | Public batch | Copy | open (end sweep) |
| G78 | Access help | Back link reads “Back” instead of “‹ Sign in” | Public batch | Copy | open (end sweep) |
| G79 | Verify email | Console 401 on arrival without a sign-up session (resume check) | Public batch | Console noise | open (end sweep) |
