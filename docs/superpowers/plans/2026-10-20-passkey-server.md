# Passkey Server Implementation Plan

**Goal:** Implement Jose's October 20 JSON endpoint contract on a private feature branch from `codex/verify-preview-33`, with fictional local PostgreSQL verification and no production changes.

**Architecture:** SimpleWebAuthn performs cryptographic verification. PostgreSQL owns expiring single-use, browser-bound challenges, credential revocation, counters, rate limits and audit events. Passkey sign-in composes the existing password session guards and cookie behavior into one transaction with the credential update.

**Tech stack:** Next 16, TypeScript, PostgreSQL, @simplewebauthn/server 14.0.3, Vitest, Node crypto-generated WebAuthn fixtures.

**Spec:** Jose's endpoint/storage/security/test contract in this conversation. Jose additionally approved counterless 0-to-0 credentials; nonzero counters must strictly increase.

## Constraints and review focus

- Base SHA: `06e85d7af995969b17ac0118897ce7e79ddf4614`. Push only `codex/passkey-server-20261020`.
- All database mutations use a new owned loopback test cluster and fictional accounts; no cloud, production or real providers.
- Flag defaults off. Local RP is localhost. Production requires explicitly configured HTTPS origin and RP ID; request headers never select a production RP.
- Preserve password session lifetime, cookie attributes, credential-reset fencing and installation handoff.
- Existing password sign-in has no limiter. When passkeys are enabled, both methods share a database-backed login budget (10 per account and 300 global per 15 minutes); options/management have separate bounded budgets. Flag off preserves the existing password path.
- Registration and management require the current session, checked again inside the write transaction. Registration challenges bind that session and credential revision.
- Authentication challenges are single-use even on verification failure; expired or superseded responses must not consume a newer challenge.
- Removal, disablement and password reset must serialize with session issuance; lost-counter races cannot issue a second session.
- Origin, RP hash, user presence, user verification and discoverable userHandle must all verify; cookies/credential bytes never appear in JSON audit payloads.

## Tasks

- [x] Add failing config/validation, JSON route and real signed registration/assertion tests, using owned PostgreSQL.
- [x] Add migration 0035 for passkey users/credentials/challenges, login limits and audit events; revocation triggers cover disablement and credential replacement.
- [x] Implement WebAuthn service/storage, strict HTTP boundaries and all six route paths. Extract shared session construction without changing password behavior; share enabled login limits.
- [x] Verify required cases plus challenge expiry/binding, wrong RP/signature/userHandle, missing user verification, concurrent replay, counter rollback, scope isolation, audit and reset/remove races. Run password/session regressions, full unit suite, typecheck, lint and build.
- [x] Update the production migration plan and UI handoff with browser API/version, request examples, flag/domain prerequisites, limits and exact evidence. Commit the implementation and prepare the authorized own-branch delivery; leave integration and iPhone acceptance to Jose.

Implementation: `df5796d5`; owned HTTP runner correction: `1d1494fc`. [Handoff and evidence](../../product/specs/codex-joint/PASSKEY-SERVER-HANDOFF.md). The final owned SQL/route rerun passed all 31 tests after the runner correction; real Next HTTP, full unit suite, typecheck, lint and production build passed. Delivery must push only `codex/passkey-server-20261020` and compare its remote SHA with local HEAD before reporting completion. No production migration, deployment, UI merge or other-branch push belongs to this delivery.
