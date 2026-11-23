# Package P: signed-out billing pages (A15–A19)

Branch `claude-codex-collab-nevora-batch-public`, with `claude-codex-collab-nevora` merged up to `07978531`.

Restored for Jose's gap closure (16:08): `b2a233d2` and its shots `03b2c198` were withdrawn under G23 (reverts
`3b29fe48`, `5727bf3f`) and are back as `5da599e4` and `65f01653` (reverts of those reverts).

## Commits
| Commit | What |
|---|---|
| `b2a233d2` | Code: `src/components/commerce-recovery/recovery.module.css` only. Footer links are 44 × 44 minimum boxes and stack on phones; the desktop brand line's size bounds are in rem. |
| `5da599e4` | The same change, restored (revert of the revert `3b29fe48`). |
| `bcd96705` | Code: `recovery.module.css` only, for J18. The legal line takes the footer's own size, so it grows at 200% text on `/app/billing`. These pages already used that size: no change here (see below). |

The shots commit (this report, `shots/package-p/rows.json` and 44 webp files) comes last.

## Re-checked on the current tip
On `bcd96705` (shared tip `07978531` merged), production build, same harness and fictional billing answers:
- **Captures**: all 44 views are pixel-identical to the approved ones (`03b2c198`), so the shots in `shots/package-p/img`
  stand as they are. That includes 390 with 200% text: the new kit rem sizes and the J18 legal-line rule change
  nothing here.
- **Probe**: overflow 0 and overlap 0 on all 44 views; text edges 36/354 in English and Spanish at 390.
- **Accessibility** at 390 and 1440 on every state (22 views):
  - axe: 0 violations
  - every Tab stop has a ring
  - every link and button hit area is 44px or more
  - no text fixed at 200%
- **API**: only `POST /v1/handoff/exchange`, `GET /v1/status` and `GET /v1/plans` (32 each); no checkout, portal, plan
  change or Stripe.
- **Repeats** for Jose (none removed): “per month”/“al mes” once on each plan's price line; “Small” as the current plan and
  in the plan list. Each states a separate fact.

## How it was checked
- **Production build** of `b2a233d2`, run like the repo's central-billing suite: `createOwnedNextApp`, production, with the
  owned billing origin `https://br-owned-collab-qa-commerceapi…` and the app at `collab.nevora.example.invalid`
  through the owned loopback TLS proxy. The scratch runner was unpacked for the run and removed afterwards.
- **Fictional billing API.** Every request to the billing origin was answered inside the browser by Playwright routes,
  so nothing reached the network. The answers:
  - handoff exchange: a fictional token
  - status: trial, paid Small, or a failed payment (grace)
  - plans: the service's own catalog, Small USD 19.00 and Team USD 29.00 a month
  - workplace: “Northside QA Workforce”

  The API saw only `POST /v1/handoff/exchange`, `GET /v1/status` and `GET /v1/plans` (32 each). There was no checkout,
  portal or plan change, and nothing touched Stripe.
- **Captures**: EN pages in English and ES pages in Spanish, each state at 390, 390 with 200% text, 768 and 1440: 44
  views.
- **Probe**, per view:
  - visible strings and any repeats
  - left and right text edges, button sizes
  - overlap, clipping and overflow
- **Accessibility**, at 390 and 1440 on every state:
  - axe (wcag2a/aa, 2.1, 2.2 AA, best-practice)
  - a Tab walk with ring check
  - hit-testing every link and button
  - text that does not grow at 200%
- **Tests**: `src/components/commerce-recovery`, `clocker-paused`, `app/billing`: 43 passed, 0 failed.
- **Not run**: WebKit, 320px, and the refusal and retry states. Those need a financial action against the API, which
  this package doesn't make.

## Per page (final build)
| Row | Page | States captured | Main and other buttons | Text edges L/R at 390 | Overflow | 200% text |
|---|---|---|---|---|---|---|
| A15 | Plans `/pages/plans` | Trial; no handoff | Review subscription in Stripe: Solid teal 52. Refresh status and Close billing: text links 44. Back to the workplace: link | 36/354 (entry 36/350) | 0 at every width | Buttons grow, no overlap |
| A16 | Billing `/pages/nevora-billing` | Active Small; payment needs attention; no handoff | Manage billing in Stripe: Solid teal 52. Review Team plan: outlined 52. Links 44 | 36/354 | 0 | as A15 |
| A17 | Billing return `/pages/nevora-billing-return` | Subscribed; confirming | Subscribed: Back to Northside QA Workforce Solid teal, Manage billing and Review Team plan outlined 52. Confirming: links only | 36/354 | 0 | as A15 |
| A18 | Facturación `/pages/es-facturacion` | Prueba; sin acceso | Revisar suscripción en Stripe: Solid teal 52, one line at 390 | 36/354 | 0 | as A15 |
| A19 | Pago `/pages/es-pago` | Suscripción activa; confirmando | Volver a Northside QA Workforce: Solid teal. Administrar facturación en Stripe and Revisar plan Team: outlined 52, one line at 390 | 36/354 | 0 | as A15 |

Before the change, the Spanish pages measured 27/363 at 390 because the one-line Spanish footer ran wider than the card.
They now measure 36/354, the same as English.

**Accessibility (final build):**
- axe: 0 violations
- every Tab stop has a visible ring
- every link and button hit area is 44px or more (before: footer “Terms” 42px and “Ayuda” 43px wide)
- no text stays fixed at 200% (before: the desktop brand line was fixed at 46px)

## Wording
- No billing, price, tax or legal wording changed, and no line was removed.
- The only repeats are:
  - “per month”/“al mes”, once on each plan's price line
  - “Small”, once as the current plan and once in the plan list

  Both are separate facts, not repeats of a line. Nothing met the rule for removal.

## Compared with the approved public pages (A1–A14)
- **Matched now**: the footer (owner line, then the links on their own 44px row on phones; 44px links on every width)
  and text in rem.
- **Same already**: Solid teal 52px main button, outlined secondary buttons, 44px text links, the band and card on
  phones, the brand panel from 1024px, focus rings, and the workspace chip.
- **Different on purpose**: the language control. These pages keep the billing session in memory and cannot reload,
  so they use the two-option English/Español control instead of the reloading pill (documented in `frame.tsx` and
  `language-switch.tsx`). Each option has a 44px hit area.

## Impeccable audit: billing pages A15–A19 (Owner, signed out; 390, 390 at 200%, 768, 1440; entry, trial, paid, grace, subscribed, confirming)
Checked: production build in Chromium with fictional billing answers, full-page captures, the DOM probe, axe, Tab walk
and hit-testing.

Blocking: none left. Fixed in `b2a233d2`:
1. [Accessibility] Footer links under 44px (Terms 42px, Ayuda 43px).
2. [Spacing] On phones the footer was one long line, wider than the card in Spanish (text edges 27/363). It now stacks
   as on the sign-in pages.
3. [Accessibility] The desktop brand line was fixed at 46px; it now follows the reader's text size.

Polish (left as is)
4. [Hierarchy] At 200% text on a phone, “Review subscription in Stripe” wraps to three lines. The button grows with it
   and nothing overlaps.

States: Empty ✓ (no handoff) · Loading ✓ (confirming) · Error ✓ (payment needs attention) · Success ✓ (subscribed) ·
Edge ✓ (200% text, Spanish)
Not checked: WebKit, 320px, the refusal and retry messages (they need a financial action), screen reader output.

## Shared file note
`recovery.module.css` is also used by:
- the in-app billing recovery page (`/app/billing`): it gets the same footer change.
- the paused Clocker page: its footer has no links and it hides the brand line, so nothing changes there.
