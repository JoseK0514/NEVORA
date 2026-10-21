# Passkey server and UI handoff

Owner: Jose for integration, domain choice and production authorization. Server branch: `codex/passkey-server-20261020`, based on `codex/verify-preview-33` at `06e85d7af995969b17ac0118897ce7e79ddf4614`. UI integration target: `claude/auth-premium`. No UI files are changed here.

## Contract

All bodies are JSON. Use same-origin requests and keep cookies between options and verify. Options accept `{}`; no employee ID is needed for login. Send only the fields below. Credential IDs/public keys/flow tokens are never returned by the management API.

| Method/path | Request | Success |
|---|---|---|
| POST `/api/auth/passkey/login/options` | `{}` | `PublicKeyCredentialRequestOptionsJSON` |
| POST `/api/auth/passkey/login/verify` | `{response}` | `{redirect:"/app"}` plus the normal `fuel_session` cookie |
| POST `/api/auth/passkey/register/options` | `{}`; current session required | `PublicKeyCredentialCreationOptionsJSON` |
| POST `/api/auth/passkey/register/verify` | `{response,name}`; same current session | `{passkey:{id,name,createdAt,lastUsedAt}}` |
| GET `/api/auth/passkeys` | Current session required | `{passkeys:[{id,name,createdAt,lastUsedAt}]}` |
| DELETE `/api/auth/passkeys/:id` | Current session and metadata UUID required | 204, no body |

`createdAt` and non-null `lastUsedAt` are ISO timestamps; a new credential has `lastUsedAt:null`. Names are trimmed, 1–80 characters, with control characters rejected. Maximum ten active passkeys per employee. Deleting an already removed key belonging to the same employee is idempotent; other employees cannot list or remove it. Removing a passkey prevents future sign-in, following the existing session lifecycle for previously issued sessions.

Errors have exactly `{error:code}`. Feature disabled/invalid RP configuration: `not_supported` (404); absent session: `not_found` (401); invalid Origin/fetch metadata: `not_found` (403); malformed body: `not_found` (400); invalid/replayed/expired proof or removed key: `not_found` (404); disabled account: `account_disabled` (403); exhausted budget: `rate_limited` (429); storage/service failure: `unavailable` (503). Wrong HTTP methods handled by Next may use its normal 405 response. Responses are private/no-store. Do not infer provider availability or account existence from a generic error.

Browser cancellation does not make a verify request. Map the browser's `NotAllowedError` to the UI's `cancelled` state; map unsupported platform capability to `not_supported`. Keep password sign-in available.

## UI library

Server is pinned to `@simplewebauthn/server@14.0.3`. Use `@simplewebauthn/browser@14.0.0`; versions were checked against the official package/documentation during implementation. Install it on the UI branch. [Official browser API](https://simplewebauthn.dev/docs/packages/browser).

```ts
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

// optionsJSON comes directly from the matching options endpoint.
const response = await startRegistration({ optionsJSON });
// POST {response, name} to register/verify.

const assertion = await startAuthentication({ optionsJSON: requestOptionsJSON });
// POST {response: assertion} to login/verify, then navigate to result.redirect.
```

Call the browser API from a user action; do not transform its response. The server requests discoverable credentials and requires user verification. The operating system chooses Face ID, Touch ID or another supported authenticator; the server cannot promise a specific biometric. Counterless synced credentials allow 0-to-0, as Jose explicitly approved; once either counter is nonzero, the new value must strictly increase.

## Configuration and controls

- Default off. For local Next development, apply `0035` to the local database, set `NEXT_PUBLIC_NEVORA_PASSKEYS=on`, restart, and open `http://localhost:<port>`. RP ID is `localhost`; `127.0.0.1` is intentionally not accepted for the passkey request origin.
- With `NODE_ENV=production`, including Vercel previews, explicitly set `NEVORA_PASSKEY_RP_ID` to the intended DNS hostname and `NEVORA_PASSKEY_ORIGIN` to its exact HTTPS origin. The hostname must match; no custom port/path/query/credentials. The public flag is a build-time input, so activation requires rebuilding as well as matching runtime configuration. No production domain was selected or configured here.
- Five-minute, server-stored, single-use challenges bind an opaque HttpOnly SameSite=Strict flow cookie; registration also binds the current session and account/credential revision. Starting a newer ceremony supersedes the old one. A stale response cannot consume the newer challenge.
- POST/DELETE require exact Origin; fetch metadata, if present, must be same-origin. JSON request size is limited to 64 KiB. Authenticated list checks Origin if present. Do not send cross-origin API requests.
- Sign-in uses the same 14-day hashed-token employee session, HttpOnly/SameSite=Lax cookie, secure cookie in production, active-account/credential guards and installation handoff as password sign-in. Counter update, session insertion and sign-in audit commit atomically after cryptographic verification.
- The base password path had no rate limiter. With passkeys enabled, password and passkey verification share 10 attempts/account and 300 global per fixed 15-minute bucket. Ceremony options/verify share 30 attempts/browser flow (login) or employee (registration), and 300 global per bucket. Removal has a separate 30/employee, 300 global budget. Old buckets are cleared after 24 hours; no IP collection is introduced. Flag off preserves the prior password path.
- Disabling an employee or changing/deleting their password credential revokes all their passkeys in the same database transaction, including manager resets. Reactivation/replacement does not revive them. Register/remove/sign-in/revoke events are append-only; failed cryptographic proofs never issue a session.

## Evidence and release gate

Only fictional users and newly created, marked, disposable loopback PostgreSQL databases were used. No cloud/production credentials, database mutations or outbound deliveries were used. [Migration and rollback plan](DEPLOY-RUNBOOK.md#passkey-migration-0035-october-20-addition).

- Default suite: 449 files passed, 7,387 tests passed; 27 files/801 tests skipped by the repository's existing gates. No assertions or skip gates were weakened.
- `npm run test:passkeys:owned`: 31 tests passed across real PostgreSQL service and route suites. Actual generated EC keys, signed WebAuthn assertions and the installed verifier are used, with no cryptographic-verification mocks.
- Covered register/sign-in/remove; wrong origin/RP/userHandle/signature; missing user verification; challenge expiry, replay, supersession and browser/session binding; disabled and reactivated accounts; reset/removal races; monotonic/counterless counters; concurrent same-counter sign-in; rate limits shared with password; ownership boundaries; immutable audit; all six route paths and default-off behavior.
- Typecheck, ESLint and `npm run test:dev:production` passed. The production build scanned 2,423 artifacts with development-only markers absent. No UI/component/style/assets files changed.
- `npm run test:passkeys:network`: one real Next HTTP scenario passed against committed application source at `1d1494fc` (production application code is identical to `df5796d5`). All six route paths returned the expected responses: register 200, anonymous list 401, discoverable login 200 with the normal session cookie, authenticated list 200, replay 404 and removal 204. Source/mirror custody checks passed and the owned app/database/cluster were stopped. The first attempt stopped safely on a fixture database-prefix mismatch; the runner mapping was corrected before this passing run. Three focused owned-runtime helper tests also passed.

Evidence directory (local, outside Git): `/Users/josek0514/.codex/visualizations/2026/10/20/01a158ce-f75b-7f20-b4ef-879a40e11945/passkey-server-20261020`. Reproduce the SQL/HTTP suites with `NEVORA_TEST_PG_BIN` pointing to the existing PostgreSQL binaries and `npm run test:passkeys:owned`; real HTTP additionally needs an external `NEVORA_PASSKEY_NETWORK_EVIDENCE` directory and `npm run test:passkeys:network`. Both commands use the existing owned PostgreSQL runner (whose log prefix says Payroll) and clean up only the cluster they created. Never supply a production database URL.

Engineering position: shared session construction preserves existing password guards, while writes serialize with revocation and counter changes. Security/governance position: default off, explicit RP/origin, no raw credential material in audit, production migration and activation remain Jose's decision. Delivery position: the server branch is ready for UI integration with the local checks above passing. Independent QA, hosted Neon transport and iPhone/simulator Face ID acceptance are not certified by these local tests. Next gate: Jose integrates both halves, runs the device flow, chooses the final RP/domain and separately authorizes any production migration/activation.
