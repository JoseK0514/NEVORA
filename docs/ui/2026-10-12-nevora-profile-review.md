# NEVORA Profile review - 2026-10-12

Profile and calendar subscription were redesigned against this checkout's `DESIGN.MD` and retained NEVORA UI. Desktop uses two settings columns; mobile stacks them with a direct calendar shortcut. Local Inter, portal orange, Phosphor icons, 18px surfaces, 44px controls and reduced-motion-aware GSAP entrances follow the existing system.

The existing five work-detail values, refresh/privacy lifecycle, notifications navigation, feature-gated device-settings action, calendar create/copy/select/replace/revoke/retry controller, and native sign out remain available. Two red-then-green regression tests fix stale calendar URL exposure in unauthorized/unavailable view states.

Source: retained UI baseline `e39803a69e50361f6a0dcc696ee294ccaad243b8`; branch `codex/nevora-profile-redesign-20261012`; implementation commits `df27b3f` and `27b18c3`. Current Fuel Scheduler development does not contain Profile/calendar, so restoration of the retained UI is an integration dependency. No push, main merge or deployment was performed.

Verification: 14 focused tests, final typecheck, production build and whitespace check passed at `27b18c3`. Full suite at `df27b3f`: 6,710 passed, zero failed, 801 pending/skipped. Lint exited 0 with the existing warning in unchanged `employee-weekly-confirmation.tsx:18`. Actual owned Next.js/PostgreSQL browser testing passed 47 checks in Chromium and WebKit, with zero page errors or external requests. Coverage includes seven widths from 320 to 1440px, keyboard/focus, calendar lifecycle and retry, clipboard failure, loading/offline recovery, motion cleanup, native sign out and no-JavaScript guidance. Push enrollment and real provider subscriptions were not tested.

Mobbin references: [Tolan grouped settings](https://mobbin.com/screens/3d50e687-ac13-4612-9933-7eba90e33884), [Basecamp provider choices](https://mobbin.com/screens/c71e3467-91e9-4f87-ae1d-6cccb6690abe). The `21st` search showed [Account Settings Fieldset](https://21st.dev/@cnippet-dev/components/v-fieldset-7), [Vertical Settings Tabs](https://21st.dev/@cnippet-dev/components/v-tabs-13) and [Copy Link Button](https://21st.dev/@uiable/components/button-copy). Patterns were adapted locally without a new dependency.

Complete handoff, evidence, source manifest and screenshots: `/Users/josek0514/Documents/Codex/2026-10-12/using-the-structure-layout-and-animation-21/outputs/HANDOFF.md`. Browser QA script: `../profile-browser-qa.mjs` from this repository root, run through `node --import tsx` with `DATABASE_URL` unset. It uses disposable owned data and leaves the local preview running only when `PROFILE_KEEP_PREVIEW=yes`.

Rollback the implementation by reverting `27b18c3`, then `df27b3f` on this branch. Do not reset another checkout's changes. The next integration step is carrying the retained UI and these changes into the agreed development line, followed by that line's checks.
