# WP8 report: billing pages (in-app billing recovery and central billing)

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp8.patch` (reverse-applies cleanly against the worktree). Nothing committed.

All eight items are done in the UI. Unit tests and lint pass. The type check and the three Playwright integration suites were not run (per COMMON.md); I edited 10 string lines in those suites blind to match changed copy.

```
 src/app/app/billing/page.tsx                       |  32 ++++-
 src/app/pages/es-facturacion/page.tsx              |   4 +-
 src/app/pages/es-pago/page.tsx                     |   6 +-
 src/app/pages/nevora-billing-return/page.tsx       |   2 +-
 src/components/commerce-recovery/billing.tsx       |  32 +++--
 src/components/commerce-recovery/central-page.tsx  |  10 +-
 .../commerce-recovery/central-recovery.test.tsx    |  30 ++++-
 src/components/commerce-recovery/central.tsx       |  80 +++++++++---
 src/components/commerce-recovery/copy.ts           |  45 +++++++  (new)
 src/components/commerce-recovery/frame.tsx         |  25 +++-
 .../commerce-recovery/language-switch.tsx          |  15 +++  (new)
 .../commerce-recovery/recovery.module.css          | 139 ++++++++++++++++-----
 src/components/commerce-recovery/recovery.test.tsx |  47 ++++++-
 src/lib/commerce/central-billing.test.ts           |  11 +-
 src/lib/commerce/central-billing.ts                |  14 ++-
 .../central-billing-browser.integration.ts         |   4 +-
 .../commerce-recovery-browser.integration.ts       |   4 +-
 .../commerce-recovery-effects.integration.ts       |   2 +-
 18 files changed, 414 insertions(+), 88 deletions(-)
```

## Findings

| ID | Status | What changed |
|---|---|---|
| UI-2 (item 1) | Done | `frame.tsx` and `recovery.module.css` rebuilt on the sign-in look, using `--b-*` tokens only and no `!important`. Under 1024px: teal band with wordmark and language control over a lifted white 22px card. From 1024px: teal brand panel beside the card. Pill buttons, legal footer. Old class names (`action`, `secondary`, `actions`, `eyebrow`, `footer`, `details`) still work, so the paused Clocker page picks up the new frame unedited. |
| JR-9 (item 2) | Done | `/app/billing` shows one sentence per `status.reason` in a callout (red when paused, amber in grace). Over 30 gets the quote sentence and an "Email support@thevelani.com" pill. Dates use the workplace time zone; if it cannot be read they stay UTC and the labels say "(UTC)". Non-Owners keep "ask your Owner". |
| JR-10 (item 3) | Done | `central-billing.ts` reads `error.code` and adds an optional `refusal` to refused/conflict results. `central.tsx` shows the README copy per code, plus a support pill for the quote and review cases. Unknown codes keep the old line. Requests and retry custody are untouched. |
| JR-11 (item 4) | Done | Every state on the central page has a real back link: "Back to {business}" to `{applicationUrl}/app` when known, otherwise "Back to NEVORA sign-in" to `/login`. The handoff is no longer discarded when the page opens unfocused; it waits in memory and is exchanged once on focus. |
| JR-19 (item 5) | Done | `/pages/nevora-billing-return` and `/pages/es-pago` pass `returning`. The page shows "Confirming…" while polling, then "You're subscribed" with the back link as the main action, or the "haven't seen a payment" message after 120 seconds. |
| JR-12 (item 6) | Done | "Sign out" under the card on `/app/billing` for every role, using the shell's `PortalSignout`. |
| Item 7 | Done | `/app/billing` uses `generateMetadata`: "Page not found" when billing is off, otherwise the bilingual title. |
| Item 8 | Done | Central heading and intro renamed to "Plan and billing"; tab title updated. Plans and prices behave as before. |

## Decisions for you

- **Language control on the central page is two options, not the single sign-in pill.** It is a Direction B segmented pill ("English | Español"). The page keeps its session in memory so it cannot reload, and the CI browser test needs both named buttons. `/app/billing` and the paused Clocker page use the single reloading pill, via sign-in's `switchTo`.
- **The business name stays on screen after the billing session ends.** The remembered workplace (name and URL, memory only) feeds the "Back to {business}" link after blur, close or denial. Private details still retire as before. That is what JR-11 asked for, but it relaxes the earlier "no private display" posture.
- **The primary button label is unchanged.** It stays "Open billing in Velani" for every reason; the sentence names the action. Three integration suites click that exact name. Per-reason labels ("Choose a plan" and so on) are a small follow-up if you want them.
- **Checkout is hidden during the two-minute confirming window** on the return pages, to prevent a second payment. It returns with the "haven't seen a payment" message.
- **"Subscribed" is inferred.** It means `billingAction` is `portal` and state is `paid` or `trial`; the client cannot see the Stripe subscription status.
- **"Close billing" is now a text button** rather than a pill, to cut the stack of pills. Same handler.
- **The paused Clocker page gains the language pill** through the frame default. I did not edit that page.
- **`/app/billing` heading stays "Workplace billing"** (integration tests assert it), while the new Settings link will say "Plan and billing".
- **Desktop brand panel reuses sign-in's "NEVORA Workforce" and "Your week, in one place."** I left out the "ready the moment you sign in" support line.

## Strings changed or added (for Jose)

`src/components/commerce-recovery/copy.ts` (new; EN lines 10-19, ES lines 22-31), shared by both pages:
- trial_ended: "Your free trial ended. Choose a plan to keep using NEVORA." / "Tu prueba gratis terminó. Elige un plan para seguir usando NEVORA."
- payment_failed: "We couldn’t charge your card. Update your payment method." / "No pudimos cobrar a tu tarjeta. Actualiza tu método de pago."
- subscription_canceled: "Your subscription ended. Subscribe again to continue." / "Tu suscripción terminó. Suscríbete de nuevo para continuar."
- employee limit: "Your team has {n} active people and your plan covers {limit}. Upgrade, or deactivate people you no longer need." / "Tu equipo tiene {n} personas activas y tu plan cubre {limit}. Mejora tu plan o desactiva a las personas que ya no necesitas."
- over 30: "Teams over 30 need a custom plan. Contact us for a quote." / "Los equipos de más de 30 personas necesitan un plan a la medida. Contáctanos para una cotización."
- unreachable: "We can’t check billing right now. Try again in a few minutes." / "No podemos consultar la facturación en este momento. Inténtalo de nuevo en unos minutos."
  - This replaces "Billing status is unavailable. Try again in a moment." / "El estado de facturación no está disponible. Inténtalo de nuevo en un momento." (`billing.tsx:12-13`).
- contact pill: "Email support@thevelani.com" / "Escribir a support@thevelani.com"
- Three reasons the task did not specify, my wording:
  - payment_required: "A payment is needed to keep using NEVORA. Choose a plan to continue." / "Se necesita un pago para seguir usando NEVORA. Elige un plan para continuar."
  - setup_required: "Workplace setup is not finished. Contact us and we will help you finish it." / "La configuración del negocio no está completa. Contáctanos y te ayudamos a terminarla."
  - setup_pending: "Your workplace is still being set up. Check again in a few minutes." / "Tu negocio todavía se está configurando. Vuelve a consultar en unos minutos."

`src/components/commerce-recovery/billing.tsx:12-13`:
- Date labels: "Trial ends (UTC)", "Paid through (UTC)", "Grace period ends (UTC)" become "Trial ends", "Paid through", "Grace period ends", with " (UTC)" appended only when no time zone is available. Spanish follows the same rule.

`src/app/app/billing/page.tsx`:
- Line 18, tab title: "Workplace billing" stays; added "Facturación del negocio" (ES) and "Page not found" (billing off).
- Line 31: "Sign out" / "Cerrar sesión".
- Line 35, non-Owner when the check is unreachable: the unreachable sentence plus " If it keeps happening, tell your workplace Owner." / " Si sigue pasando, avísale al propietario de tu negocio."
- Line 38: "Try again" / "Intentar de nuevo" (links to `/app`).

`src/components/commerce-recovery/central.tsx` (EN lines 13-16, ES lines 17-20):
- Heading: "NEVORA billing" → "Plan and billing"; "Facturación de NEVORA" → "Plan y facturación".
- Intro: "Review your workplace subscription with Velani." → "See your plan and manage your subscription. Payments are made in Stripe."; "Revisa la suscripción de tu negocio con Velani." → "Consulta tu plan y administra tu suscripción. Los pagos se hacen en Stripe."
- Back links: "Back to {business}" / "Volver a {business}"; "Back to your workplace" / "Volver a tu negocio" (URL known, name missing); "Back to NEVORA sign-in" / "Volver al inicio de sesión de NEVORA".
- "Confirming your payment with Stripe…" / "Confirmando tu pago con Stripe…"
- "You’re subscribed." / "Tu suscripción está activa."
- "We haven’t seen a payment yet. If you paid, wait a moment and refresh. You won’t be charged twice for the same checkout." / "Todavía no vemos un pago. Si pagaste, espera un momento y actualiza. No se te cobrará dos veces por el mismo pago."
- Refusals taken verbatim from the README (EN and ES): idempotency_conflict; billing_operation_pending and checkout_pending; the two reconciliation_required codes; checkout_expired and billing_operation_expired.
- Refusals with my wording:
  - plan_employee_limit: "The Small plan covers up to 15 active people. Deactivate people you no longer need, then try again." / "El plan Small cubre hasta 15 personas activas. Desactiva a las personas que ya no necesitas e inténtalo de nuevo."
  - use_billing_portal: "You already have a subscription. Refresh your billing status to manage it." / "Ya tienes una suscripción. Actualiza el estado de facturación para administrarla."
  - subscription_sync_pending: "Stripe is still confirming your subscription. Refresh your billing status in a moment." / "Stripe todavía está confirmando tu suscripción. Actualiza el estado de facturación en un momento."
  - assisted_quote_required uses the over-30 sentence.

`src/components/commerce-recovery/central-page.tsx:7-8`:
- Tab title "NEVORA billing" → "Plan and billing · NEVORA"; Spanish routes get "Plan y facturación · NEVORA".

`src/components/commerce-recovery/frame.tsx:23`:
- Footer fallback "© 2026 VELANI LLC" when no legal line is passed (paused Clocker page). The text "NEVORA" is replaced by the wordmark component.

All other existing strings are unchanged.

## Tests

- **Lint:** `npx eslint` on every changed file passes.
- **Unit:** `npx vitest run src/components/commerce-recovery src/lib/commerce src/app/api/commerce src/app/app/b-viewport.test.ts src/test/no-page-entrance-motion.test.ts src/test/nevora-visible-branding.test.ts src/components/signature/hex-guard.test.ts` gives 17 files, 228 tests passed. That includes 27 new tests for frame and Sign out, reasons in both languages, the non-Owner unreachable copy, the tab title, the back links, the return states, the over-30 quote and the refusal-code mapping.
- **Rendered check (not asked for, not part of the patch):** I bundled the real components with esbuild and ran them in headless Chromium against fictional fixtures. Across 18 scenes at 320, 390, 768, 1024 and 1440px, at 100% and 200% text:
  - No horizontal overflow.
  - The repo's `scripts/browser-contrast.mjs` reports no text under 4.5:1.
  - No link or button under 44px.
  - Tab order matches what the CI keyboard test expects.
  - A handoff that arrives unfocused makes 0 exchanges, then exactly 1 on focus.
  - Screenshots are in `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wp8-preview/out/`.
- **Not run:** `tsc` and the full suite.
- **Not run, edited blind:** the Playwright integration suites. String-only edits:
  - `central-billing-browser.integration.ts`: 4 lines, heading names.
  - `commerce-recovery-browser.integration.ts`: 4 lines, unavailable sentence.
  - `commerce-recovery-effects.integration.ts`: 2 lines, unavailable sentence.

## For Codex

1. **Time zone.** `/api/commerce/status` carries no time zone. The page reads it from `getWorkspace()` with a fallback to labelled UTC, as `/app/my-pay` does. Central `/v1/status` often returns `timeZone: null` (the headcount path sets it to null), so the central page then shows UTC with its note.
2. **Refusal codes.** Please confirm the list and HTTP statuses I mapped, and whether the other `*_reconciliation_required` codes, `billing_operation_resolved`, `plan_changes_unavailable`, `billing_unavailable` and `setup_pending` should get customer copy. They show the general refusal today.
3. **Stuck request after a definitive refusal.** After `assisted_quote_required` or `plan_employee_limit` the client still holds the original request, so the page shows "Retry the original request" and locks the language until billing is reopened. I left custody alone.
4. **Subscription status.** A `subscriptionStatus` field, or a "checkout completed" flag, on `/v1/status` would make the return-page confirmation exact.
5. **`/app/billing` ignores most of `?reason=`.** The Owner view reads `status.reason`; only `billing_status_unavailable` changes the non-Owner text.

## Risks and browser checks for the coordinator

- **`/login` fallback.** "Back to NEVORA sign-in" points at `/login` on the host serving `/pages/*`. Confirm that is right for the central host (relates to JR-20).
- **Footer contrast is tight after sign-in.** If `quiet.css` is still loaded from a client navigation from `/login`, its rule colours the legal line #6A7176 on the canvas, which is 4.52:1. A fresh load uses my rule at 5.3:1.
- **Effects fixture colours.** `commerce-recovery-effects.integration.ts` loads only Signature tokens, so the component renders without `--b-*` colours there. Behaviour assertions are unaffected.
- **Tall pages on desktop.** The brand panel now stretches with the page instead of sticking at viewport height.
- **Worth a real-browser look:** the paused Clocker page on a tablet, the phone band on iOS with a notch, and both language controls at 390 and 1440.
- **Release sequence** is unchanged: development first, then the exact verified release to main after Jose's approval. This is a worktree patch only.
