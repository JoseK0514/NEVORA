# VELANI staging isolation and acceptance proposal

**HOLD: proposal only.** No VELANI source/environment/database/schema/role/deployment/theme was changed. This is outside the current workforce pilot and needs a separately authorized implementation by the VELANI owner. Do not request or read Production secret values to implement or prove it.

## Verified boundary

November 10 read-only Vercel CLI API metadata, explicitly scoped to `team_Lzbw410WwXGWHTuUXuamRI1N`, identifies `velani-ai` (`prj_E1Vl2AEpTlJlBam4MTKG7oEHB7x2`) as GitHub `JoseK0514/VELANI-SHOPIFY-WEBSITE`, root `services/velani-ai`, Node24, Preview authentication enabled. Its Production target was READY at `d89350bd4019bc2746373bba8b75ff70d05039c8`; the listed Preview at `6bb6dd5eb198290b2a90c0e300cbdf99761ef677` was BLOCKED. These are provider metadata, not runtime checks or authorization.

One sensitive `DATABASE_URL` entry, `EG9ch4r43fMYlpzs`, explicitly targets both `production` and `preview`, without a branch selector. That proves shared configuration custody and fails safe mutation admission. The value was neither decrypted nor compared. The separate sensitive `CLIENT_HUB_DATABASE_URL` entry (`okbCwWID8SoMnkEd`) targets Production only in the inspected metadata. There is no proven Preview client-hub binding or enabled journey. Isolating only the AI database is insufficient. Inventory **all** database bindings and integrations from the exact candidate before admission.

Read-only inspection of the published `d89350bd` blobs confirms:

- `services/velani-ai/scripts/migrate.ts` uses sorted checksum-bound migrations and defaults to `DATABASE_URL_UNPOOLED ?? DATABASE_URL` for administrative work. It does not itself require a staging target. Never invoke it under ambient project credentials.
- Migrations `001_initial.sql` through `004_client_hub.sql` are the VELANI schema at that source, distinct from NEVORA company/control migrations.
- `scripts/seed.ts` upserts/archives reviewed first-party knowledge documents; it is not an isolated synthetic business-data seeder. Do not run the default seed as a test without reviewing its inputs and target.
- Client hub startup needs its own database URL, Resend custody, session hash key, Turnstile keys and allowed origins when enabled. The AI service separately needs its database, model/API settings and session custody. A fake key or configured request limit is not proof of zero live-model spending.

## Proposed implementation, after separate authorization

1. VELANI owner freezes a reviewed candidate and creates a clean detached checkout from that project's actual development line/approved source. Reconcile active UI/theme ownership before changing it. Never apply NEVORA migrations or workforce credentials here.
2. Select an existing demonstrably empty isolated non-production target, or request an approved new empty project/branch/database with a reviewed cost/expiry plan. **No Production clone, restore, branch-from-Production, customer export, shared-schema carve-out or credential reuse.** A separate schema inside the Production database is not this proposal's isolation boundary. Obtain provider IDs, ownership and empty-database evidence without reading Production data.
3. Prepare a dedicated protected staging Vercel project (or an explicitly isolated Preview binding only after its full inherited/shared variable inventory is reviewed). A separate project is preferred because the existing `velani-ai` variable intentionally serves Production too. Leave that existing shared entry and Production deployment untouched. Keep public aliases/theme publication unchanged.
4. Use a private operator-only direct staging migration credential, apply the frozen VELANI migrations into the empty target and record ordered filenames/checksums. No bootstrap script may fall back to an existing DSN. Create separate restricted staging application identities scoped only to the required AI/client-hub tables. Review exact grants; no owner/admin credential belongs in a runtime. Roles/secrets/grants are future approved operator work, not created by this packet.
5. Configure both `DATABASE_URL` and `CLIENT_HUB_DATABASE_URL` from approved staging-only stores, each bound to the selected empty target and restricted role. Do not add `DATABASE_URL_UNPOOLED` to the runtime. Use new separately approved staging-only session/hash material and a staging origin allowlist; do not recover it from Production. Secrets must be non-revealable where supported.
6. Keep `CLIENT_HUB_ENABLED=false`, queue/scheduled delivery inactive and model/SMTP/Resend provider calls unavailable. Current AI startup requires API settings; if the selected hosted candidate cannot start with outbound work closed, hold hosted acceptance until the owner supplies a reviewed disabled/mocked adapter. Do not install a live API key or use an unbounded model call just to satisfy startup. Local dependency-injected provider simulations are already the safe acceptance path.
7. Seed only a reviewed, explicit fictional fixture manifest: `example.invalid` contacts, fictional request bodies, opaque QA references, no customer identifiers and no real knowledge/customer/message copies. Stamp fixture ownership/run ID and cleanup rules privately. A fixture loader must assert expected staging database/role/schema/source before writes. Run with a minimal explicit environment, never `.env` auto-loading from a shared checkout.
8. Prove runtime identity from an authorized private operator observation of the actual connected database/role and candidate deployment; compare to the approved nonsecret provider IDs. Inspect all inherited database/queue/provider bindings. Verify the restricted roles cannot access another database, public/customer tables or owner operations. Do not connect to Production as a negative test. No public diagnostic endpoint exposing DSNs/credentials is proposed.

## Acceptance record and stop conditions

| Layer | Required evidence |
|---|---|
| Source/schema | Frozen repository/commit/tree, migration hashes and empty-target preparation receipt |
| Environment isolation | Project/deployment + database/branch/role IDs, explicit staging-only bindings for **both** data paths, restricted grant review, runtime identity; metadata key names alone are insufficient |
| Local contract | Actual VELANI unit/repository/queue/validation tests with injected Turnstile/mail/model adapters; duplicate submit/idempotency, lease/retry/unknown outcome, cleanup and PII-minimized logs |
| Protected hosted UI | Source-matched unpublished theme/form -> server validation -> fictional staged request/outbox -> receipt; invalid/expired captcha, same-operation lost response, unsupported origin, throttle and provider-unavailable recovery. User-visible success must match stored state |
| Real providers | Separate finite approval and budget before real Turnstile/provider delivery/model work; simulator acceptance does not count as two-email inbox delivery |
| Cleanup/rollback | Disable staged ingress/queue, drain, remove only stamped fictional fixtures per retention/custody receipt, retire staging credentials/resources under approved plan; never restore or delete Production |

Any inherited Production binding, unexpected customer rows, unknown runtime identity, provider-enabled egress, missing source label or non-private dashboard blocks mutation immediately. Capture only sanitized metadata and report the owning boundary; do not explore customer contents to diagnose it. Rollback pauses the new staging target and retains its evidence; it does not rewrite the existing shared Production/Preview variable. Production publication remains Jose's separate decision.

Required next authorization is the **bounded isolation implementation**, including chosen empty target/cost, operator and credential/grant plan. Hosted mutation and real two-email delivery require their own subsequent acceptance authorization. Nothing in the workforce pilot or this delegation supplies it.
