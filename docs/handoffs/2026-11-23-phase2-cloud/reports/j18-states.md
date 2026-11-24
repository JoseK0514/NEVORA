# J18 Billing (signed in): the remaining states, Chromium and WebKit

Branch `claude-codex-collab-nevora-batch-public`, with `claude-codex-collab-nevora` merged up to `5c713840`.

## Commits
| Commit | What |
|---|---|
| `7c3d1bf9` | Code: `src/components/commerce-recovery/billing.tsx`. When the status can't be read (failed, or after a lapse), the filled “Refresh status” now comes first, above the outlined “Open billing in Velani”, in reading and focus order. Test: `billing-order.test.tsx` (fails before the change). No wording changed. |

| `a19b39a6` | Code: `src/app/app/billing/page.tsx`. On the Manager and Employee page, “My pay statements” (and Try again, when shown) sit in the same actions block as the Owner's, so they have its `--b-space-20` gap under the paragraph. Test in `recovery.test.tsx` (fails before the change). No wording changed. |
| `c8597c51` | Code: `billing.tsx`. A status check still running after 2.5 s (S-01's threshold, the scoped read frame's `STUCK_MS`) replaces “Checking workplace access…” in the same status line with Jose's wording (option B). EN: “Still checking your access. This connection is slow. Your billing details appear when the check finishes.” ES: “Seguimos comprobando tu acceso. La conexión está lenta. Los detalles de facturación aparecen cuando termine la comprobación.” Test: `billing-slow.test.tsx`. |

The polish commits came after the first capture. The slow, Manager and Employee views were captured again on `c8597c51`
in both browsers (24 views, replacing the earlier ones): no overflow, overlap or repeats; axe 0; rings and 44px on every
stop.

The shots commit (this report, `shots/j18-states/rows.json` and 56 webp files at quality 80) comes last.

## How it was checked
- **Production build** of `7c3d1bf9` in the owned sandbox (`createOwnedNextApp`, production), with:
  - the app at `collab.nevora.example.invalid` through the owned loopback TLS proxy
  - commerce recovery and payroll switched on
  - fictional accounts: the seeded Owner `QAOWNER`, plus a Manager `QAMANAGER` (Company access) and an Employee `QAEMPLOYEE`, added in the scratch harness only
- **Fictional status.** Every `/api/commerce/status` read was answered by a Playwright route:
  - **Export only**: restricted, `operational:false`, `export:true`, `trial_ended`
  - **Owner denied**: 403
  - **Slow**: no answer; captured 3.5 s in
  - **Failed**: 503
  - **Lapse**: a paid answer valid for 15 s, then renewals that never answer; captured at 16.5 s

  Manager and Employee get the server's non-Owner page, which makes no status read.
- **Nothing left the sandbox.**
  - Any other `/api/commerce/` path would have been answered with a 404, and none was requested.
  - Requests outside the sandbox origin were aborted.
  - “Open billing in Velani” was never pressed: no handoff, checkout or payment.
- **Views**: 320, 390, 390 with 200% text, and 1440, in Chromium and in WebKit (Playwright 1.62.1, webkit-2336): 7 states × 4 views × 2 browsers = 56 captures.
- **Per view**:
  - DOM probe: overflow, overlap, text past the edge, repeats, text edges
  - axe (wcag2a/aa, 2.1, 2.2 AA, best-practice) at 100% text
  - a keyboard walk (Tab in Chromium, Option+Tab in WebKit, which otherwise skips links) with a ring check and hit-testing from each stop's centre
- **Tests**: `src/components/commerce-recovery`, `src/app/app/billing` and `src/lib/commerce` pass (176). `tsc --noEmit` is clean. The whole `src` suite ran before the push (see the message to the lead).
- **Not run**: Spanish for these states, screen reader output, and pressing Open billing (it starts a real handoff).

## Results (final build, both browsers)
- **Overflow, overlap, text past the edge, repeats**: none in any of the 56 views. Text edges at 390 are 36/356 in every state.
- **axe**: 0 violations in the 42 views at 100% text.
- **Keyboard**: every stop has a visible ring, and every stop's hit area is 44 × 44 or more. That includes the language control, Sign out, Privacy, Terms and Support.
- **Focus order at 390** (the same in both browsers):

| State | Order |
|---|---|
| Export only | Español › Open billing in Velani (filled) › Refresh status › My pay statements › Sign out › Privacy › Terms › Support |
| Owner denied | Español › Refresh status › My pay statements › Sign out › footer |
| Manager, Employee | Español › My pay statements › Sign out › footer |
| Slow | Español › My pay statements › Sign out › footer (Open billing and Refresh are disabled while it checks; from 2.5 s the status line says it is still checking) |
| Failed, Lapse | Español › **Refresh status (filled)** › Open billing in Velani (outlined) › My pay statements › Sign out › footer |

- **Lapse**: the paid details (plan, people, dates) are withdrawn when the 15 s window ends, and the page shows the same
  state as a failed read.
- **Slow**: after 10 s without an answer, the page shows the failed state.

## Wording
No billing, plan, payment or legal wording changed, and no line was removed. The probe found no repeated strings.

## Impeccable audit: J18 Billing, remaining states (Owner, Manager, Employee; 320, 390, 390 at 200%, 1440; Chromium and WebKit)
Checked: production build with fictional status answers, full-page captures, the DOM probe, axe, keyboard walk and
hit-testing in both browsers.

Blocking: none left. Fixed in `7c3d1bf9`:
1. [Hierarchy] Failed and lapse: the state's one filled button (Refresh status) sat below the outlined Open billing
   and came second in focus order. It now comes first, as the filled button does in every other state.

Polish, done in this batch (Jose, Nov 24)
2. [Spacing] Manager and Employee page: “My pay statements” sat close under the paragraph. It now has the Owner page's
   actions gap (`a19b39a6`).
3. [States] Slow: the page gave no sign that the check was taking longer than usual. From 2.5 s it says it is still
   checking (`c8597c51`).

States: Empty ✓ (Manager, Employee) · Loading ✓ (slow) · Error ✓ (failed, Owner denied, export only) · Success (in `j18-billing.md`) ·
Edge ✓ (lapse, 320, 200% text, WebKit)
Not checked: Spanish, screen reader output.
