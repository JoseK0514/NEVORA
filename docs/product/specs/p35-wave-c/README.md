# Phase 3.5 Wave C: Settings and recovery

October 19, 2026. Branch `claude/p35-wave-c-93e13c` (pushed for the cloud inspection rounds, with Jose's OK). Jose approved the sign-off screens as built ("approved A, B, C").

**Status:** _exit round 4 pending (Codex). This section is filled in when it reports._

## What changed

Wave C rebuilt the Owner's Settings hub, every Settings page, Account recovery and Clocker recovery on the kit, phone and desktop together (320–1440). No server code changed.

| Page | Route | Roles |
|---|---|---|
| Settings hub | `/app/settings` | Owner |
| Company profile | `/app/settings/workspace` | Owner |
| Locations, Add location, Location detail | `/app/settings/locations`, `/new`, `/[id]` (plus a not-found page and an error page) | Owner |
| Branding | `/app/settings/branding` | Owner |
| Features & words | `/app/settings/features` | Owner |
| Company policies | `/app/settings/company-policies` | Owner |
| Break types | `/app/settings/breaks` | Owner |
| Positions | `/app/settings/positions` | Owner |
| Clocker devices | `/app/settings/clocker` | Owner |
| Account recovery | `/app/account-recovery` | Owner, Manager |
| Clocker recovery | `/app/clocker-recovery` | Owner, Manager |

**One frame and one form pattern for every page:**
- `src/app/app/settings/wave-c-kit.tsx`: the frame (`SettingsFrame`: band with Back, cards, a guide column from 1180px), notices, facts, guides and empty states.
- `src/app/app/settings/wave-c-form.tsx`, the form parts:
  - `Field`: label above, the control, the help 8px under it, and one error with an icon and words.
  - `SwitchRow`, `FormActions` and `SettingsForm`.
  - `ButtonLabel`: a pending label that keeps the button's width.
  - The save bar: fixed on the measured tab bar on phones, in the page in landscape, sticky on desktop.
  - The scroll lock for dialogs.
- **Validation:** every Wave C form is `noValidate` and checks its own declared constraints on submit. There is one sentence per field, the first invalid field takes focus, and nothing is sent.
- **Pending and taps:** the button says what it's doing, nothing moves, and a double tap sends exactly one request.
- **Loading:** each route has its own `loading.tsx` that draws its real band. The parent placeholder (`root-loading.tsx`) has one entry per route, with heights measured at 320–430 and in landscape.
- **Company words** (Standard, Retail, Restaurant, Field services and the rest) apply throughout the Locations pages.
- **Copy:**
  - Plain sentence case, curly apostrophes and US spelling.
  - Times and dates are kept whole.
  - "Couldn’t load {thing}." with Try again.
  - "Your session ended" with a Sign in link.
- **Styles:** all in `src/app/app/premium-wave-c.css`. The old per-page stylesheets, CSS modules and GSAP entrance motion for these routes are retired.

**Files changed:**
- Pages under `src/app/app/settings/**`, `account-recovery/`, `clocker-recovery/`.
- Components: `brand-editor`, `features-editor`, `company-policy-editor`, `clocker-break-types`, `clocker-device-manager`, `new-location-form`, `edit-location-form`, `assisted-recovery`, `clocker-recovery-review`.
- `account-recovery` (the assisted branch only, plus pass-through props).
- One allowed entry block in `root-loading.tsx`.

**Shared fixes cherry-picked from `claude/premium-phase-1`:**
- `9f7b649`: landscape type.
- `a62cc79`: fields 3:1 and growing with text.
- `aae87e4`: validation trap, toast over bars, unfaded buttons, Inter preload.

**Wording that changed:**
- "Missing clock-in/out" is now "No clock‑in/out recorded".
- Policy options now read "Off", "Off by default" and "Use company default".
- The legal sentence "These rules do not determine pay, discipline, or legal entitlements." is kept exactly. It's in the Company policies guide card.

## Checks run

_Final numbers are filled in at exit._

| Check | Result |
|---|---|
| `npx vitest run` (full suite) | Round 3 build: every Wave C test passes (102 in Wave C's files). Four files outside Wave C failed under machine load; each passes on rerun (`employee-home-actions` with a 60s timeout). The baseline before Wave C was 7,283 passed |
| `npx tsc --noEmit -p .` | Clean |
| `npx eslint src` | Only the known Wave A error at `src/app/app/exchange/swap/page.tsx:51` |
| `checks.mjs`, Chromium, every width and text size, axe | Round 1: Wave C's pages clean (the remaining flags were the shell's sidebar labels, footer and "Search" label, since fixed or reassigned). Later full sweeps run by Codex every round |
| Submit states (own script) | Pending, blocked failure and double tap on 6 forms: label swaps in place, 0px movement, one request per double tap, focused failure notice |
| Inspection | Rounds 1–2 local, five areas each (`inspection/*.md`). Round 3 by Codex: two P1s (WR-21, ST-02), both fixed. Exit round 4 by Codex: _pending_ |

## Set aside for Codex

See `CODEX.md`:
- The real outcome of every action.
- Session expiry on the server.
- No-access redirects with no message (§2b).
- Server-written sentences (§3).
- The Settings hub's extra `getWorkspace()` read.

## Decided, with reasons

See `inspection/ROUND-2.md` and `ROUND-3.md`:
- Fields are 48px and grow with text; search fields are white (both shared rules).
- Filter pills wrap.
- A native select truncates its value at 320 with 150–200% text.
- The browser's date format at 200%.
- The Locations loading placeholder uses Standard words.
- Policy terms next to legal text are Jose's call.

## Screenshots at 390 and 1440

Every route, in `screens/` (sign-off set, approved by Jose).

## On-screen keyboard (local, October 19)

- **Android emulator** (`Nevora_Pixel_7_API_36`, Chrome 133, real on-screen keyboard, driven over the DevTools port): all 17 fields on 11 pages pass. Each field took focus from a touch and stayed fully inside the visible area above the keyboard. Nothing was submitted. The pages:
  - Company profile, Add location (3 fields) and Edit location (2).
  - Branding hex; Positions add and search; Locations search.
  - The Company policies threshold. The fixed save bar sits behind the keyboard, not over the field.
  - The Add break type dialog (name, reference time) and the Add device dialog.
  - Account recovery (ID, attestation) and Clocker recovery.
- **iOS Simulator** (iPhone 17 Pro): not done here. Safari's saved-password sheet for the test account blocked sign-in; I tried a swipe-down and its close button, and entered no device passcode. The coordinator offered to run Wave C's forms in its Phase 3 iOS keyboard pass.
- **Incident:** during the Android sign-in, the preview's fictional local test password was once typed into the Employee ID field and showed in a screenshot in this session. The field was cleared at once and the screenshot deleted. Reported to the coordinator so it can be rotated if that preview is reused.
- **Still Jose's:** the real-device pass (VoiceOver and TalkBack).
