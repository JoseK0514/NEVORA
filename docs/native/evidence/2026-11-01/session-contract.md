# Native session and role presentation verification

Source: detached development 1e6f35ab plus the approved native design; Task 1 base 4d87b5f80fec441f9b02acd56f92b37ae10b058f. Local source only, no deployment/database change.

- RED contract: 18 failed, 13 passed; expected missing-behavior assertions. GREEN contract: 31 passed.
- RED layout: 2 failed, 5 passed; native Manager/Lead incorrectly received the protected shell before the guard existed.
- Combined final focused run: 5 files / 60 tests passed (new context, session endpoint and layout; existing Settings layout and login/logout actions).
- `npm run typecheck`: exit 0. ESLint for all seven changed/new source and test files: exit 0.
- Default full-suite baseline was interrupted after approximately four minutes without per-file/completion output; it is not a pass or failure. A complete suite run remains required at the foundation verification gate.

The v1 probe remains role-neutral and exposes only protocol/state. Native probes do not carry browser session credentials; fresh protected navigation establishes the actual browser session. Native role presentation is checked after `requireSession`, before workspace/scope reads, and uses the existing logout server action. UA markers never authorize any operation. Ordinary Manager/Lead web behavior is covered separately.

Detailed invocation logs are in `.superpowers/sdd/2026-11-01-native-foundation-plan/` (local, ignored). These unit/render tests do not establish full-backend, simulator, device, hosted, signing or store acceptance.
