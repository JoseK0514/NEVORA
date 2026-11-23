# Alerts fix package (L1 phone app Alerts, K12 kept-punches help)

Branch `claude-codex-collab-nevora-alerts`, from `claude-codex-collab-nevora` at `59d645cb`.

## Commits
| Commit | What |
|---|---|
| `fd9688b4` | L1: one main action per state, white secondaries, no repeated words, live line, rem text; K12 help spacing |
| `3fb8946e` | L1: while a confirmation is open, its action is the only solid button on screen |
| `17dc8a7d` | K12: the empty request line takes no height |
| `f481f3d0` | L1 Owner popover: red words on the turn-off secondary, white words on the red confirmation |
| `0ac9f33e` | K12: the empty request line leaves the flow, so Back sits 8px under the request |
| (this commit) | Captures, `rows.json`, this report |

Files: `src/components/native-shell/device-settings.tsx`, `.css`, `.test.tsx`; `src/lib/native-shell/device-client.ts`,
`.test.ts`; `src/components/clocker-recovery.tsx` (one class on the help's stack); `src/components/clocker.module.css`
(three rules at the end). States, handlers, `data-native-*` hooks, server reads and data contracts are unchanged.

## L1 Alerts (Owner Device settings popover; Employee and Lead Alerts page)

### Words, before → after
| State | Before | After |
|---|---|---|
| Needs a check, body | NEVORA couldn’t confirm this phone’s alert setup. Check again, or review the app’s setup. | NEVORA couldn’t confirm this phone’s alert setup. |
| Needs a check, extra line (`device-client.ts:84`) | We could not verify this device. Check again. | (none: the body already says it) |
| Checking, body | Checking permission and this app’s enrollment… | Confirming notification permission and this app’s enrollment. |
| Setup changed, body | The server and this app could not confirm the same setup. Review app setup or turn off the previous setup. | NEVORA and this app no longer match on this phone’s alert setup. |
| Permission blocked, body | Allow NEVORA notifications in your phone settings, then check again. | Allow NEVORA notifications in your phone settings, then come back to this screen. (The screen checks again on return.) |
| Paused, body | Checking will continue when you come back to this screen. | It continues when you come back to this screen. |
| Setup taking longer | App setup is taking longer. Check again. | App setup is taking longer than usual. |
| Enrolment failed | Setup did not finish. Check again before starting a new request. | Setup didn’t finish. |
| Turn-off stale | Device setup changed. Check again before turning alerts off. | Device setup changed before alerts could turn off. |
| Turn-off pending | Turn-off is still pending. Check again or block NEVORA alerts in your phone settings. | Turn-off is still pending. You can also block NEVORA alerts in your phone settings. |
| Owner popover, confirmation | (no heading) | Turn off alerts here? / Use alerts for this account? (the same headings as the Employee page) |

Every visible string per state is listed in the capture logs. In every state no line repeats the title or a button.

### Buttons, one main action per state
| State | Solid teal (main) | White secondary | Red |
|---|---|---|---|
| Off | Turn on alerts | Check again | – |
| On | Check again | – | Turn off alerts (white, red words) |
| Permission blocked | Check again | – | – |
| Setup changed | Review app setup | Check again | Turn off alerts (white, red words) |
| Needs a check | Check again | Review app setup | – |
| Checking | – | – | – |
| Paused | Check now | – | – |
| Confirm turn off | – (state card steps down) | Check again, Keep current setup | Turn off alerts (solid red, white words) |
| Confirm use for this account | Turn on for this account | Check again, Keep current setup | – |

The white secondary is the component pick (white, one hairline and a soft lift, ink words; `--b-btn-surface*`
tokens). The Owner popover's grey secondaries and its **Done** are now the white secondary. The Employee page's
frameless secondaries have their frame back. Measured heights: 48px in the Owner popover, 52px on the Employee page,
equal within each screen. Edges: the Employee card 14px from both phone edges, and its actions 35–355 at 390
(482–922 in the 440px column at 1440). In the Owner popover the actions sit at 34–356 at 390 and 532–908 at 1440.
No horizontal overflow at either width in any state.

### Accessibility fixes on these screens
- The failure line is now a live region that is in the page from the start, so a message that appears later is
  announced. Before, the region was added with the message already in it.
- The card view (Owner popover) is named by its visible heading “This device” (it was `aria-label="App alerts"`).
- The Owner popover's confirmations have visible headings that name the groups.
- The popover's solid red “Turn off alerts” had ink words on red, because the corp kit's `!important` colour won
  (axe `color-contrast`). It now has white words. This was a pre-existing failure that the new axe step found.
- Text sizes in `device-settings.css` are now rem (title 1.1875rem, body .9375rem, eyebrow, message, confirmation
  heading).
- Focus: a 2px teal ring on every action, confirmed by keyboard on the Employee page (Tab order: skip link, bell,
  account, Notifications, Check again).
- Focus returns to the control that opened a confirmation when **Keep current setup** is pressed (Owner and Employee).
- axe (wcag2a/aa, 2.1aa, 2.2aa) on the popover and the Alerts card: **0 violations in every state at 390 and 1440**,
  for both roles.

## K12 Clocker kept-punches help (390x844)
| Gap | Before | After |
|---|---|---|
| “Ask Owner to check” → Back (target edge to edge) | 24px (two 12px gaps around the empty request line) | 8px |
| Back → Reference | 10px | 0 (Reference sits directly under Back) |
| Stack gap | 12px | 8px |

Back and Reference keep their 56px kiosk targets. The empty request line is out of the flow and out of view, but stays
in the accessibility tree, so “Request sent…” is still announced when it fills. After a request it takes its place
again, 8px above Back. Tab order: skip link, Ask Owner to check, Back, Reference. No overflow.

## How it was captured
- Production build (`NEVORA_OWNED_APP_PRODUCTION=1`, under `flock /tmp/nevora-heavy.lock`), fictional data,
  throwaway Postgres. The phone app's bridge was simulated and the notification API answered by Playwright routes
  (`NEVORA_SCAN_NATIVE_FLOW=1`). No device, push or provider calls.
- The harness ran from a scratch copy of `zz-scan.tar.gz` (unchanged in the repo). Changes worth folding in:
  `NEVORA_SCAN_NATIVE_OWNER=1` (opens the Owner's Device settings popover per state), an axe and button-style probe
  per state, a keyboard pass on Needs a check, and `NEVORA_SCAN_CLOCKER_FLOW=help` (enrol, PIN, a failed Clock in,
  the help with Reference open and the request sent, with measurements).
- The Employee L1 run was captured before the last two commits. Those commits only touch the Owner popover rules
  (`.native-device-card`, `.portal-device-settings`) and the Clocker, so the Employee screens are unchanged by them.
- Reduced motion: the desktop context runs with `reducedMotion: 'reduce'`. These screens add no motion.
- Not captured: 768 (the package asks for 390 and 1440), 200% text (sizes are rem now but not captured at 200%),
  and the Lead role (same component as the Employee).

## Impeccable audit
- **Hierarchy:** one focal state block (ring, title, one line) and one solid action per screen. With a confirmation
  open, the confirmation's action is the only solid one. The destructive path is quiet until confirmed.
- **Spacing and alignment:** action gap 12px on the Employee page (was 10). K12 is now on the 8px step. The Owner
  popover keeps its own 10px gaps from `portal-device-setup.css` (not this package's file). Edges are equal at each
  width.
- **Accessibility:** axe clean, focus ring visible, focus returns after Keep, live region present from the start, the
  card named by visible text, rem sizes, targets 48–56px.
- **States:** off, on, blocked, setup changed, needs a check, checking, paused and both confirmations are captured for
  the Owner and the Employee.
- **Copy:** checked against `voice.md`. No repeated words, and no claim of a check that didn't happen.

## Blocking items left
None on these screens.

## Proposed ledger rows (end sweep or other owners)
| Proposed | Item | Kind |
|---|---|---|
| G-al-1 | `portal-device-setup.css` (Owner popover) sets fixed px text (14.5px, 15.5px, 17px, 19px) and off-scale 10px gaps; not in this package's files | end sweep |
| G-al-2 | `account-b-client.tsx` and `employee-mobile/device-alerts.tsx` (browser device alerts, not the phone app) still say “Checking this device…” over “Checking permission and this device’s enrollment…”, the same repeat fixed here | check |
| G-al-3 | corp.css gives `.c-btn--secondary`/`--danger` words `!important`, which overrode the popover's red button words; worth a kit-level fix | kit |
| G-al-4 | Fold the harness additions above into `tools/ui-scan/zz-scan.tar.gz` | evidence |
