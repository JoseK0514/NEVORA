# Clocker K3 Enter Employee ID

Branch `claude-codex-collab-nevora-clocker-states`, merged with `claude-codex-collab-nevora` at 9596f934. Production
build served at the owned https origin through the owned loopback TLS proxy. Fictional workspace, tablet key
`scan-kiosk-main`, fictional Employee IDs (`QA-SCAN-B`, `QA-SCAN-C`, `ZZ-UNKNOWN-EN`/`-ES`) and PINs, throwaway local
Postgres. No real device, notification, payment, deploy or publishing.

## Commits
- `aeb157f2` Merge of `claude-codex-collab-nevora` (9596f934).
- `f8e6dc38` Scan mode `NEVORA_SCAN_CLOCKER_FLOW=k3` in `tools/ui-scan/zz-scan.tar.gz`: the Employee ID step empty and
  typed, the PIN step beside it, an unknown ID, offline and the lockout, with focus logged after each, at 390x844,
  768x1024, 1024x768 and 390x844 with 200% text, in English and Spanish.
- `f4d33443` The fix (`src/components/clocker.module.css`) and its test beside the gate
  (`src/components/clocker-pin-gate.test.tsx`).
- Shots commit: this report, `shots/clocker-k3/rows.json` and `img/`.

## What changed
| Where | Before | After |
|---|---|---|
| Phone (390x844) | Employee ID field 54px tall and 6px lower than the 60px PIN field, so the card shifted when Continue moved to the PIN step. | The field is 60px and sits at the PIN field's place (top 286px at 390x844, in both languages and at 200% text). |
| Short phone, short landscape tablet, large-text portrait tablet | The ID field's top margin was 12px or 20px against the PIN field's 8px. | Same 8px as the PIN field. |

Words, behaviour, the form, the server reads and the data contract are unchanged. The new test parses
`clocker.module.css` and checks that every media block after the base field rules gives the ID field the PIN field's
height and top margin.

## Gate check (390, 768, 1024, 390 with 200% text; EN and ES)
| Check | Result |
|---|---|
| Direction B kit | Kiosk card, kit field, one primary Continue (disabled until an ID is typed), the language switch as the footer's only control; the same anatomy as K4. |
| One main action | Continue on the ID step; one button on each error card (Check connection, Done/Listo). |
| Targets | Field 60px (52px on short screens, as the PIN field), Continue 56px (64px at 768), language switch 56px. None under 44px. |
| Same grid as the PIN screen | Field, help, Continue and the PIN keypad share the left and right edges: 34–356 at 390, 100–668 at 768, 492–900 at 1024. |
| Nothing said twice | ID step: no repeated lines. Offline: band and heading both say "No connection" (see end sweep 2). |
| Overflow | None horizontally. At 200% text the page scrolls (ID step 13px EN, 80px ES); every control is reachable. |
| Time format | Band `10:18 AM`; lockout "Try again at 10:25 AM." |
| Focus | Load: the Employee ID field, with its ring. Tab: Continue (3px ring), then the language switch. Change Employee ID: back to the field with the ID kept. Unknown ID: the PIN field (ID kept). Offline and locked: the heading. After Check connection or Done: the Employee ID field. |
| Language | `lang` follows the tablet's choice; Spanish fits at every size. |

Tests run: `node scripts/run-rstest.mjs run` on every `src/components/clocker*.test.ts*` and
`src/app/clocker/*.test.ts*` (225 passed); `tsc --noEmit` clean. Not run: WebKit, axe, reduced motion (K3 has no
motion of its own).

## Impeccable audit
- Hierarchy: heading, field, help, one action. Good.
- Spacing: now identical to the PIN step on a phone; the tablet sizes were already paired.
- Accessibility: visible label for screen readers ("Employee ID"), help tied to the field, capitals on, no
  autocorrect, alerts on errors, focus returned after each state.
- States: empty, typed, unknown ID, offline, locked, after locked, EN and ES.

## Blocking items left
None.

## End-sweep items (proposed ledger rows)
1. The Continue arrow stays 20px at 200% text while the word grows (fixed icon size in `ClockerIcon`).
2. Offline: the band and the card heading both say "No connection" ("Sin conexión"). Kept because the band follows the
   card by the approved rule NV-049, and K1's setup and the fallback screen use the same pair. Proposed for Jose: band
   "Offline", or a heading "This tablet is offline" on K1, K3 and the fallback together.
3. Unknown ID: the message says "Check both" on the PIN step, where the Employee ID isn't shown; the way back is the
   icon-only back arrow ("Change Employee ID"). Proposed: show the entered ID under the heading with a Change link (K4).
4. Unknown ID: focus stays in the PIN field, whose red error border replaces the teal focus ring, so focus isn't
   visible while the error shows (K4 pattern).
