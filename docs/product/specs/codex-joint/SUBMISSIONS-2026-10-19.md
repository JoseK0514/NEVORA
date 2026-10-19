# Cloud HTTP submission checks, October 19

Actual Next development server bound to loopback, actual sessions/server actions/routes, real owned PostgreSQL 17.11, explicit local email/push capture. Application base `c94d17c`; copied-file SHA-256 manifest records the exact fixture inputs (including the in-progress tooling additions), with the sole application transport substitution in `src/lib/db.ts`. Sessions are actual seeded SQL sessions supplied as opaque cookies; password-entry/login UI is not exercised. This is backend HTTP/state/delivery evidence, not on-screen interaction, hosted Neon, a merged final RC, physical-device or production-provider certification.

The dedicated Vitest probe is **1 passed**, containing **12 passing checks**: ten submission/delivery scenarios and two negative reset guards. It restores the full seed dump before every scenario and once at the end: **11 verified resets**. Each restore runs in one transaction with exit-on-error, and the baseline row fingerprint is compared after reset. Server and cluster were stopped; the final baseline matched. A withdrawal retry also preserves the original terminal receipt.

| Scenario | Server returned | Actual saved/captured evidence |
|---|---|---|
| Submit, then withdraw time off | Next action HTTP 200 + submitted framework redirect; structured `withdrawn` | PENDING then CANCELLED by the same employee; retry keeps first reviewed timestamp |
| Manager approve | Next action HTTP 200 + filtered Inbox framework redirect | APPROVED, reviewed_by AUDIT-M, reviewed_at persisted |
| Manager decline | Next action HTTP 200 + filtered Inbox framework redirect | DENIED, reviewer/timestamp persisted |
| Save availability | Next action HTTP 200 + saved framework redirect | Prior windows replaced with Monday 09:00–17:00 |
| Request correction | HTTP 202 pending | Request plus immutable REQUESTED event with result.status=pending; recorded punch stays unchanged |
| Publish update | Audience preview HTTP 200, command HTTP 200 committed | One location-announcement revision and canonical two-person audience |
| Copy week | HTTP 200 complete + operation ID | Seven shifts in the new DRAFT week and durable copy receipt |
| Swap | Actual swap page HTTP 200 lists Riley; proposal/accept action HTTP 200 pending/completed | Exact reviewed RSC target terms submitted; both assignments exchanged in SQL |
| Recovery | HTTP 202 generic accepted | One private .eml; decoded reset proof hashes to the exact unconsumed database proof; mode 0600 |
| Push | Real protected dispatch endpoint HTTP 200, accepted=1 | SELF_TEST captured as local JSON and delivery row provider_accepted; no provider contacted |
| Reset guards | Changed ownership manifest and changed connection string each rejected before restore | Original custody restored; baseline data fingerprint unchanged |

**A1 now has live server proof:** `/app/exchange/swap?sourceShiftId=audit-next-0-1` rendered Riley’s offered weekend shifts instead of the empty state. The probe takes target terms from the actual RSC response, proposes via the same `shiftChangeAction` entry point and accepts with Riley’s real cookie. A browser selection/compare animation/focus check remains Claude’s job. This confirms the cloud seed repair; the original seeder mirror was supplied in a later coordinator merge and confirms the missing availability/rule settings. The focused swap regression passed again against that later shared source; no Mac database was selected.

**Response contracts:** Next fetch-style server actions return HTTP 200 with framework redirect metadata; this probe does not misreport those as native HTML-form 303 responses. Withdrawal’s operation identity is `TIME_OFF_WITHDRAW:<request UUID>`, not a new random UUID per retry. Its UI result is `withdrawn`; the existing stored status is CANCELLED. Corrections store status in immutable events, not a status column on requests. No existing contract was changed for these tests.

**Local capture controls:** only NODE_ENV development, explicit capture flag and exact loopback origin/request are enabled. The runtime generates ephemeral test VAPID/encryption/worker material and restricts test delivery to the fictional accounts. Raw delivery switches remain off; capture supplies the outbound transport. Push uses real enrollment persistence, encrypted subscription material, source/current-session checks, worker authorization, leasing and delivery completion. Capture verifies display payload while intentionally replacing provider HTTP/encryption delivery; it does not prove provider acceptance. Email runs the real recovery route and Nodemailer stream .eml transport, not an SMTP server. Nothing was emailed/pushed to a real person.

**Ownership/reset:** `scripts/lib/premium-owned-snapshot.mts` is intentionally restricted to this cloud harness. It checks the canonical root beneath the explicit evidence directory, ownership.json root/evidence/identity, exact `nevora_exchange_test_premium_<12 hex>` name, loopback address, no password/query/hash in its owned URL, current database name/OID/comment, pinned connection URL/database name, the cluster PID file’s data directory/port, and the new cluster owner marker supplied by the wrapper. All checks repeat before each snapshot/restore; pg_restore never drops/recreates the database. It accepts no arbitrary application URL. This is not a command for selecting or resetting any existing Mac preview. Apply any future Mac reset implementation through its own PREVIEW_OUT/ownership policy.

**Reproduce:**

```sh
NEVORA_TEST_PG_BIN=<local bin> \
NEVORA_PREMIUM_EVIDENCE=<absolute external directory> \
node scripts/premium-release-postgres.mjs \
  node_modules/vitest/vitest.mjs run --config vitest.premium-submissions.config.mts
```

The harness generates a private password in `<runtime-root>/access.json` (0600) and never prints or commits it. Captures, proof material, subscription secrets and dumps remain outside git. Do not upload the raw capture folder as a public artifact. Raw safe result summaries and logs are under `/workspace/nevora-release-evidence/2026-10-19/submissions-owned-final/` and `submissions-owned-final.log`.

Earlier failed probe runs are retained. Those were harness assumptions about Next redirect status, event storage, client-selection-dependent hidden fields, quoted-printable MIME and the deterministic withdrawal identity. Their corrected checks still assert canonical response content, saved rows, authority, capture and reset; no server rule or assertion was bypassed to obtain success. Coordinator: repeat only the actual on-screen choose/compare/submit/result/focus/keyboard side, with final candidate data and the same reset isolation. These cloud results do not replace that visual acceptance.
