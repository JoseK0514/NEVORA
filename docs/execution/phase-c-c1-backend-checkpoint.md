# NEVORA Phase C — C1 backend checkpoint

Date: 2026-10-05
Branch: phase-c/real-time-clock-live-operations
Starting commit: de10b131afeca6e63631c0966427bedcfe66a1e0
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc

## Status
C1 backend checkpoint locally verified. **C1 and Phase C remain IN PROGRESS.**
This is not a release candidate and not a claim that the tablet experience is connected.

## Implemented
- Owner/session-authorized device registration with one-use, 10-minute enrollment.
- Server-generated 256-bit enrollment/device tokens; only domain-separated SHA-256 hashes are stored.
- Location-bound device identity; workspace authority is derived through that location.
- Rename, revoke, and replacement/credential rotation with expected-version guards.
- Rotation invalidates the old credential immediately and preserves device identity/history.
- Redemption revalidates its issuing Owner, portal session, current location, token expiry, and one-use state after database locks.
- Device authentication returns server-only final-write proof for future punch transactions.
- Last-seen timestamps from PostgreSQL, separate from optimistic client time.
- Secret-free Owner device projections and append-only lifecycle event records.
- Historical device/punch/break preservation in the additive draft schema.
- Separate local dependency files and an owned disposable PostgreSQL runner.

## Verification actually run
| Check | Result |
| --- | --- |
| Pre-change unit baseline | 136 files / 1,401 tests passed |
| Final full unit regression | 137 files / 1,403 tests passed |
| C1 PostgreSQL / lifecycle / lock races / schema | 2 files / 32 tests passed |
| Existing foundation PostgreSQL suite | 2 files / 75 tests passed |
| TypeScript | PASS |
| ESLint | PASS |
| Production Next build, without DATABASE_URL | PASS |

The existing foundation suite uses its unchanged 0001–0010 fixture chain. The dedicated C1 suite applies the new draft after 0010, including a legacy-punch preservation scenario. No claim is made that all older PostgreSQL suites have been rerun against the C1 extension.

Observed race coverage includes concurrent enrollment redemption, Owner demotion while waiting for locks, portal-session revocation while waiting, device revocation while authentication waits, and location deactivation while authentication waits. Additional tests exercise stale updates, wrong-location attempts, spoofed actor/session pairs, audit-write rollback, replacement of a revoked device, and final-write denial after earlier successful authentication.

## RED → GREEN evidence
- Schema preservation test failed before the Phase C device schema existed, then passed.
- 20 lifecycle tests failed against the implementation scaffold, then passed against the real service.
- Malformed-route boundary test failed before validation was added, then passed.
- Partial-PostgreSQL-start cleanup test failed before cleanup handled a surviving PID file, then passed.
- A test environment typing error was corrected; final TypeScript verification passed.

Full local logs:
.superpowers/sdd/2026-10-05-nevora-phase-c-live-operations/

## Migration and environment boundaries
Draft only: db/phase-c/clocker-devices.sql.
It has deliberately not taken migration number 0011. Reconcile approved Phase B hardening before assigning the final migration order.
No historical migration was edited. No Preview, Neon, customer, or production database was used or changed.
Each SQL run created its own loopback PostgreSQL cluster/database and stopped it before returning.
The Phase C node_modules symlink to Phase B was replaced by independent copy-on-write dependency files.
No changes to development, main, or the frozen Phase B source branch were made by this checkpoint.

## Not implemented / not verified yet
- Owner-facing device setup screens and server-action transport.
- Tablet enrollment transport, HttpOnly credential cookie, origin/CSRF checks, and recovery UI.
- Device enrollment retry UX when a response is lost after successful redemption.
- Employee PINs, actual persisted punches, break types, and live dashboard integration.
- Browser, responsive, physical iPad, and final Apple-style UI acceptance for the new flows.
- Independent Codex Phase C review.
- A Phase C hosted Preview database/environment.

The current Clocker frontend was not modified; its previous demonstration behavior is not a real punch writer. Do not use it for operational timekeeping.

## Next implementation slice
Connect Owner-only device setup/actions and the protected tablet enrollment transport without exposing device credentials to JavaScript or query strings. Preserve existing NEVORA controls and approved iPad geometry. Then implement C2 employee PIN security.

## References used for implementation review
- PostgreSQL explicit row-locking semantics: https://www.postgresql.org/docs/current/explicit-locking.html
- Node.js cryptographic primitives: https://nodejs.org/api/crypto.html
- Existing application SqlExecutor / Neon batch implementation and protected workspace/session protocols.

## Recommendation
GO for continued isolated Phase C implementation.
NO-GO for a Phase C release or live/customer timekeeping.
