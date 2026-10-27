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
