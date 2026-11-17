P4-AUTH-01 implementation review — CLEAR / APPROVE

Reviewed the pending five TypeScript files (session.ts, session.test.ts, request-destination.ts, proxy.ts, proxy.auth-return.test.ts) against detached f34f7c21012f0f86ae46ab818b04cf41e65f91e2. Scope and requirements are recorded in docs/handoffs/2026-11-16-backend-phase5-ownership.md. No ULW plan found; fallback report path applies.

CRITICAL: none.
HIGH: none remaining. Initially reproduced TS2345 at src/lib/auth/session.test.ts:76: untyped heterogeneous header fixtures were not legal HeadersInit. The owner annotated the fixture; reviewer reran semantic diagnostics after that change.
MEDIUM: none.
LOW: none.

Reviewed callers and the matcher: portal, API and clocker routes go through the proxy. Commerce allow/pass-through paths sanitize the auth marker; denial paths return a terminal response. No ended-session reader found on the public pages outside that matcher. Public root layout does not require a session. The marker is navigation only; session authority and mutation proof remain separate. The framework strips its RSC transport query before invoking the proxy under the repository's default normalization (installed next/dist/server/web/adapter.js and server/internal-utils.js). POST uses the same request-owned derivation. Existing recovery marker and role checks are intact. No hosted, browser or Server Action end-to-end result claimed here.

Verification by reviewer: fresh Vitest invocation of the two changed suites passed 18/18; TypeScript project semantic diagnostics for all five changed TypeScript files returned zero after the fixture correction. git diff --check passed. Observed executor artifacts /Users/josek0514/.codex/visualizations/2026/11/16/01a1e554-32a4-75e1-b3f2-a5ac5dde811c/auth-regression-red.log (11 failures, 7 passing) and auth-regression-green.log (133 passing across six files); broader run is executor evidence.

Consulted requesting-code-review, remove-ai-slops, and programming. No remaining violations of the two code/test perspectives: tests exercise redirect semantics and request-header forwarding, and validation reuses the existing allowlist at each trust boundary. No new production extraction, type escape hatch or authentication mechanism. No implementation edits by reviewer. No release certification.
