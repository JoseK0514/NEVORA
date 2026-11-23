# Profile pages fixes: I2 Policy document, I3 Calendar, I4 Device alerts, I5 Passkeys (Nov 23, 2026)

Branch `claude-codex-collab-nevora-profile`, from `claude-codex-collab-nevora` at `4a68adfc`. Employee and Lead see
the same screens; Owners and Managers are still sent to Profile (no change to the redirects).

## Commits (code)
- `ffb0ccaf` I2: one sections list, the first section open inside it; no restated intro; footer skips the current page.
- `a63e9dee` I3, I4: calendar card title; device alerts error state.
- `650751d5` I5: no card around Saved passkeys on tablets and desktop; body inset; empty text. Policy footer links 44px.
- `fa8d25b0` I5: the "Passkeys aren't available here" state keeps its card at every width.
- `289fbf08`, `0480c569` I4, I5: Add a passkey, the passkey card text and the Sign in again link scale with text size.

The shots commit (this report, `shots/profile/`) is separate and last.

Files: `src/components/employee-b/account-b.tsx`, `account-b-client.tsx`, `account.css`;
`src/components/employee-mobile/calendar.tsx`, `device-alerts.tsx`, `passkeys.tsx`; tests beside them and the
wording in `src/test/integration/employee-mobile-passkeys.integration.ts`. No kit, app-shell, settings-base or
`native-shell/device-settings.tsx` edits. Server reads, actions and data contracts unchanged.

## Per page

### I2 Policy document (Privacy Policy)
- Before: a contents list of all 13 section titles at 768 and 1440 (at 768 above the policy), then accordions with the
  same titles; the summary "How NEVORA handles information when you use it on the web or in its apps." restated by Who
  we are; on phones "In this policy" came after Who we are; the footer repeated "Privacy Policy" as plain text.
- After: one card "In this policy" with every section as a row that opens in place, Who we are open first, at every
  width. No summary on Privacy (its first section says it); Terms, Support and Account deletion keep their summary.
  Footer: Terms of Use, Support, Account deletion (44px tall at every width, were 32px on tablets and desktop).
- Policy text is word for word. Layout only.
- Edges: card 14–376 (390), 108–740 (768), 296–1108 (1440), the same column as I3–I5. No overflow at any width or at
  390 with 200% text.

### I3 Calendar subscription
- Before: card "Your calendar link" with the button "Create calendar link"; "Your calendar app picks up schedule
  changes the next time it refreshes, which can take a while."
- After: card "Subscription" (chip Off or Active), the keep-it-private callout, "Create calendar link". The refresh
  line is gone (end-sweep item). The older-look fallback card drops its "Your shifts, in your calendar" lead too.
- Buttons: one teal primary (52px phone, 44px desktop); the provider rows are 64px. Edges 14–376 / 108–740 /
  296–826 and 846–1376 (two columns at 1440).

### I4 Device alerts
- Before (error state): title "Setup needs a check"; card "We could not verify this device. Check again before
  starting a new request. You can also turn off a previous setup."; notice "Setup could not finish. Check again before
  starting a new request. You can ask your manager for help."
- After: title "We couldn't verify this device"; card "Check again before starting a new request. You can also turn
  off the previous setup."; notice "Setup could not finish. You can ask your manager for help." The instruction is said
  once, with the same meaning.
- Buttons: Check again (quiet, 44px), Turn off alerts (red outline, 52px). Edges 14–376 / 108–740 / 296–1108.
- Captured in the error state: the capture blocks service workers, so the on and off states weren't reachable.

### I5 Passkeys
- Before: at 768 and 1440 Saved passkeys sat in a second white card (the shared kept-panel frame in
  `employee-b-desktop.css`), 13–14px inside the column; the empty text was 2px off the heading on phones; "Saved
  passkeys" then "No saved passkeys".
- After: the kept panel keeps the frame's width and place without its surface (an override in `account.css`, in the
  `nv-b` layer); the card is 14–376 / 108–740 / 296–1108, the same as every other card; the body starts on the
  header's inset (heading and "None yet" both at x=319 on desktop). Empty state: "None yet" / "Your password still
  works." ("Add a passkey when you're ready" dropped: the button says it.)
- The unavailable state (plain http) is now a card at every width; it used to rely on the outer card on desktop.
- Captured over the test HTTPS origin, so the list loads.

## Checks run
- Unit: `account-b.test.tsx`, `calendar.test.tsx`, `device-alerts.test.tsx`, `passkeys.test.tsx`: 37 passed, 0 failed
  (tests updated for the new wording and the single sections list). Typecheck clean. oxlint clean on
  `src/components/employee-b` and `src/components/employee-mobile`.
- Production build (`NEVORA_OWNED_APP_PRODUCTION=1`, test HTTPS origin, fictional data, throwaway Postgres), Employee,
  390, 768, 1440 and 390 with 200% text, all four pages:
  - axe (WCAG 2.0/2.1/2.2 A and AA): 0 violations on every page and width.
  - Overflow 0 everywhere; nothing clipped at 200% text.
  - Keyboard with reduced motion (390 and 1440): every stop in the page has a 2px teal ring (white on the band); tab
    order is the back link (where the band shows one), then the page's controls top to bottom.
- The integration tests (`employee-mobile-calendar`, `employee-mobile-passkeys`) were updated for wording but not run.
- Lead not captured (same component and data path as Employee).
- The capture tooling change (axe, edges, focus, 200% text, HTTPS for these routes) stayed in a scratch copy; the
  repo's `tools/ui-scan` archive is unchanged.

## Impeccable audit (after)
- Hierarchy: one teal primary per screen (Create calendar link, Add a passkey; Device alerts error has no primary by
  design). Each fact once: titles, intro and instructions are no longer repeated on any of the four pages.
- Spacing and alignment: every card on the same column edges at each width (above); card text on the 18px inset.
- Accessibility: axe 0; focus rings everywhere; 200% text without overflow; policy footer links 44px. Names match
  visible text (Remove buttons read "Remove <name>", starting with the visible word).
- States: I5 ready (empty) and unavailable checked; I4 error checked, other device states not reachable in the
  capture; I3 off state checked; I2 has no data states.

## Blocking items left
None of items 15–18 remain.

## End-sweep items for the ledger (outside these pages' files)
- Kit `BHero` back link (Profile, Notifications) is 32px tall at 768 and 1440 (44px on phones). `b-kit.tsx`.
- At 200% text, `BButton` labels (Check again), `BChip` (Check, Off) and `.eb-btn-outline-danger` (Turn off alerts,
  sized in `b-foundation.css`) keep fixed px text. Kit and foundation.
- The shared kept-panel frame in `employee-b-desktop.css` (line 243) draws any `.b-keep` as a white card on tablets and
  desktop; panels that are already cards (Passkeys) need the override this branch adds. Worth a rule in the frame
  itself.
- The 390-with-200%-text shots catch the kept panel's enter animation replaying after the size change (a faint band at
  the top of the Passkeys card); it settles a moment later.
