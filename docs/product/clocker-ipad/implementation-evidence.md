# Clocker iPad implementation evidence

Implementation branch: `codex/clocker-ipad-integration-20261027`.
Base: `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2` (origin/development).
Approved prototype: `d7204373a53e332332600ab0ffe01052801e550f2e3ad543d4fe26402d7df257`.

## Baseline, October 27

- TypeScript: passed.
- Focused Clocker unit suite: 6 files, 87 tests passed.
- Owned PostgreSQL PIN/transport/recovery: 3 files, 54 tests passed.
- Owned Company access PIN management: 16 tests passed.
- Owned Company access recovery/calendar: 27 tests passed.
- Development inventory: 61 classified sources, 6 active branches, passed.

All PostgreSQL checks used a newly owned loopback cluster; no application credentials.
No push, merge or deployment authorized or performed. Prototype evidence is separate
from application evidence. Physical iPad acceptance remains required.

## T1 — Owner-only administration

- PIN pages/actions/service admission and late SQL guards now require OWNER.
- Recovery page/API/receipt service require OWNER with current session and Company guards.
- Clocker links are hidden for Managers; account recovery, attendance and calendar permissions remain.
- Removed the hardcoded “Set” PIN status from the profile (now “Manage” until actual metadata is read).
- New tests first failed on Manager PIN access and forged Owner receipt access; then passed.
- Focused presentation/page/action checks: 41 passed. TypeScript passed.
- Owned Owner policy + PIN/recovery/calendar/Manager visibility SQL: 59 passed.
- Awaited revocation, DB-clock expiry and post-commit suppression coverage retained on the Owner path.

## T2 — Durable exact-action recovery

- IndexedDB keeps one atomic pending slot per location and opaque employee/device subject.
- Exact payloads commit and read back before a punch request; conflicting same-subject writes fail.
- Valid v1/v2 session records migrate after readback; corrupt/conflicting bytes remain for assistance.
- Resolution retains reference-only history. A failing cross-tab legacy resurrection test exposed a missing tombstone check; the fix now prevents that resurrection.
- 25 parser/journal unit tests passed; 24 Chromium/WebKit checks passed, including tab closure, competing saves, changed-record resolution, corrupt migration, quota and blocked database opening.
- TypeScript passed. No physical iPad durability claim is made.

## T3 — Approved presentation and locale

- Separate `NEVORA_CLOCKER_UI_V2=true` switch controls presentation only; default remains false and punch enablement stays independent.
- Scoped pale rail, system typography, regular Phosphor icons, 12px controls and 64px keypad/action geometry use the approved Clocker roles. Official wordmark, real location/timezone and explicit company branding remain.
- Complete English/Spanish setup, PIN, action, recovery and accessible labels replace the secondary glossary in V2. Locale survives in memory when storage is blocked.
- 12 render/copy/route tests and TypeScript passed.
- Real owned Next/PostgreSQL enrollment and PIN flows: 12 Chromium/WebKit checks passed at 768x1024, 1024x768, 1366x1024 and 200% text, with Spanish denial/success and no console errors.
- Two bounded visual rounds: corrected inherited action radius/shadow in the second; geometry assertions passed. Captures: `outputs/clocker/app-ipad-evidence` in the parent task workspace.
- 21st search used project context; existing primitives fit better than the returned time-picker/timesheet components. Review found seven informational palette-literal notices; these values define the approved scoped palette, not a new portal theme. No hosted AI generation used.

## T4 — Privacy and secure continuation

- Partial PIN entry clears after 20 idle seconds, retaining focus.
- Private views expire at the earlier of 30 seconds and the server identity deadline; last 10 seconds show a secure continuation action.
- Continuation clears identity first, awaits the existing serialized server clear, then requires a fresh PIN. Only an unchanged same-subject unsent task can resume; no PIN, name, command or old verification is carried.
- Existing epoch fences, Escape, background/pagehide and persisted-pageshow clearing remain.
- New partial-PIN browser test failed before the fix. Helper/copy tests: 8 passed. Existing actual PIN transport: 13 passed. TypeScript passed.
- Owned Chromium/WebKit: 16 checks passed, including unfinished PIN expiry, warning/hard clear and delayed verify response after Escape that cannot restore private content.
- Native sleep/lock/background acceptance remains on the physical-iPad checklist.
