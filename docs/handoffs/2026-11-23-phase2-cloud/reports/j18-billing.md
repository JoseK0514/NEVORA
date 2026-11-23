# J18 Billing (signed in, Owner): billing configured, fictional status

Branch `claude-codex-collab-nevora-batch-public`, with `claude-codex-collab-nevora` merged up to `07978531`.

## Commits
| Commit | What |
|---|---|
| `bcd96705` | Code: `src/components/commerce-recovery/recovery.module.css` only. In the signed-in app the kit's `.q-legal` (a fixed 13/18px) won over the frame's footer, so the legal line on `/app/billing` stayed 13px at 200% text. It now takes the footer's own size (13.5px in rem, line-height 1.4), as it already did on the signed-out billing pages A15–A19. |

The shots commit (this report, `shots/j18/rows.json` and 15 webp files at quality 80) comes last.

## How it was checked
- **Production build** of `bcd96705` in the owned sandbox, run like the repo's central-billing suite (`createOwnedNextApp`, production), with:
  - the app at `collab.nevora.example.invalid` through the owned loopback TLS proxy
  - commerce recovery and payroll switched on for the seeded fictional workplace
  - the fictional Owner `QAOWNER`, signed in once and the session reused
- **Fictional status.** The page reads `/api/commerce/status`; every read was answered inside the browser by a Playwright route. The answers:
  - **Subscribed**: paid, Small, paid through 28 days ahead
  - **Trial**: plan not selected, trial ends 20 days ahead
  - **Payment needs attention**: grace, Small, `payment_failed`, paid through 2 days ago, grace ends 5 days ahead

  Each answer also carried 8 of 15 active employees and time zone America/Puerto_Rico.
- **Nothing left the sandbox.**
  - Any other `/api/commerce/` path would have been answered with a 404, and every request outside the sandbox origin was aborted.
  - The page only ever asked for `status`.
  - “Open billing in Velani” was not pressed: no handoff, checkout, portal or payment, and nothing touched Stripe.
- **Captures**: each state in English at 390, 390 with 200% text, 768 and 1440, plus Spanish at 390 (15 views). Chromium, reduced motion.
- **Probe**, per view:
  - visible strings and any repeats
  - left and right text edges, button sizes
  - overlap, clipping and overflow
- **Accessibility**, on every state:
  - axe (wcag2a/aa, 2.1, 2.2 AA, best-practice) at 390 and 1440 in English and at 390 in Spanish
  - a Tab walk with ring check and hit-testing out from each control's centre, at 390 and 1440
  - a computed-size comparison at 100% and 200% text, to find text that doesn't grow
- **Default size unchanged.** All 15 views at 100% text are pixel-identical before and after the merge of `07978531`. The legal-line fix makes the line 13.5px (was 13px), which only moves the footer.
- **Tests**:
  - `src/components/commerce-recovery`, `src/app/app/billing`, `target-size-44`, `forced-colors-z3`: 53 passed
  - the whole `src` suite before the push (see the message to the lead)
- **Not run**:
  - WebKit and 320px
  - the restricted (export only) and access-denied states, and the slow and failed status reads
  - pressing “Open billing in Velani”, which starts a real handoff

## Per state (final build)
| State | What the card shows | Main and other buttons | Text edges L/R at 390 | Overflow | 200% text |
|---|---|---|---|---|---|
| Subscribed | Access Active · Plan Small · 8 / 15 · Paid through | Open billing in Velani: Solid teal 52. Refresh status, Return to workspace, My pay statements: text links 44. Sign out 44 | 36/356 | 0 at every width | Button wraps to two lines and grows (107); values drop under their labels; nothing overlaps |
| Trial | Access Trial · Plan Not selected · 8 / 15 · Trial ends | as Subscribed | 36/356 | 0 | as Subscribed |
| Payment needs attention | Amber line “We couldn’t charge your card. Update your payment method.” · Access Payment needs attention · Plan Small · 8 / 15 · Paid through · Grace period ends | as Subscribed | 36/356 | 0 | as Subscribed |

At 768 the card is centred (text 144/734). At 1440 it sits beside the teal brand panel (“Your week, in one place.”). The
footer is the same as on A15–A19: owner line, then 44px links stacked on phones.

**Accessibility (final build):**
- axe: 0 violations (9 English and Spanish views)
- every Tab stop has a visible ring
- every control's hit area is 44px or more: the language control, Open billing, the three text links, Sign out, Privacy, Terms and Support
- no text stays fixed at 200% (before: the legal line at 13px)

**Spanish.** The card, buttons and footer read in Spanish. “Facturación del negocio” is the title. Dates are “20 dic 2026”.
“Small” stays as the plan's name, as on A18 and A19.

**Time and dates.** No times are shown. Dates follow the workplace time zone (“Dec 20, 2026”).

## Wording
- No billing, plan, payment or legal wording changed, and no line was removed.
- The probe found no repeated strings in any state or language.

## Impeccable audit: J18 Billing (Owner, signed in; 390, 390 at 200%, 768, 1440; subscribed, trial, payment needs attention; EN and ES at 390)
Checked: production build in Chromium with fictional status answers, full-page captures, the DOM probe, axe, Tab walk,
hit-testing and the 200% size comparison.

Blocking: none left. Fixed in `bcd96705`:
1. [Accessibility] The legal line stayed 13px at 200% text, because the kit's fixed `.q-legal` size won in the signed-in app.

Should fix (left, with reason)
2. [Accessibility] In Spanish, `<html lang>` stays “en” on signed-in pages, but the page's `<main>` says “es”, so the
   Billing content is marked Spanish. This is app-wide (Home reads the same), so it belongs to the signed-in Spanish
   work, not to this page.

Polish (left as is)
3. [Hierarchy] At 200% text on a phone, “Open billing in Velani” wraps to two lines and “Payment needs attention” drops
   under its label. The button grows and nothing overlaps.

States: Empty ✓ (trial, no plan) · Loading ✗ not captured · Error ✓ (payment needs attention) · Success ✓ (subscribed) ·
Edge ✓ (200% text, Spanish)
Not checked: WebKit, 320px, export-only and access-denied, slow or failed status reads, screen reader output.

## Shared file note
`recovery.module.css` is also used by the signed-out billing pages (A15–A19) and the paused Clocker page.
- A15–A19: the re-run of all 44 captures on `bcd96705` is pixel-identical to the approved ones.
- Paused Clocker: its footer is its own plain line, not `.q-legal`, so the rule doesn't reach it.
