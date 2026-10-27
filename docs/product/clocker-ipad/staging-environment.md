# Isolated Clocker staging — October 27, 2026

Jose authorized an isolated HTTPS staging environment on October27. This is a continuation of integration Task10, not production authorization. The approved tablet design and Company Owner-only controls remain unchanged.

## Environment custody

- Repository: private `JoseK0514/NEVORA`; local branch `codex/clocker-ipad-integration-20261027` based on development `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`.
- Vercel: new project `nevora-clocker-staging`, ID `prj_ZDa9qtpAxFhex2Jld8VFGV6nCTsy`, existing team `team_Lzbw410WwXGWHTuUXuamRI1N`. Vercel authentication protects all deployments. Existing Hobby plan; no upgrade.
- Neon: new project `nevora-clocker-staging-20261027`, ID `billowing-smoke-15461949`, branch `br-divine-sky-b850lcfn` (`clocker-synthetic-only`), database `clocker_staging`, PostgreSQL17, aws-us-east-1.
- This is a new root database, not a data branch. Before installation, `current_database()` returned `clocker_staging` and the public schema contained zero objects. Existing preview and production databases were not copied or modified.
- Compute is bounded to0.25CU with five-minute auto-suspend. Project quotas:3,600 compute seconds,1GiB transfer,512MiB logical storage. These may stop staging rather than silently increase spending. Existing Launch account; no subscription added.
- Fresh setup used the authoritative migration order through0040 and final Company-access adoption, atomically. Company ID `294cb63c-8af8-403f-a9bc-b8c88674b2a4`; location ID `135ce64c-9153-4e0d-abc2-933b2098e718`; location key `clocker-staging`.
- All people are fictional; contact addresses use `example.invalid`. Staging-only keys and credentials are private; never put their values in Git, screenshots or this handoff.

## Deployment and test sequence

1. Reconcile source inventory against fetched origin without changing its six-branch ceiling. PASSED62 classified sources/six active branches.
2. Install the empty database with the existing atomic company installer. PASSED.
3. Added two fictional employees, a SQL-created restricted app role (`clocker_staging_web`, no memberships/admin/BYPASSRLS), and staging-only encrypted environment variables. No SMTP, push delivery, analytics/replay or background payroll/notification workers.
4. Initial candidate174c9bef published under immutable `staging/clocker/2026-10-27-174c9bef`. Explicit Vercel target `staging` uses preview-only configuration. Canonical protected HTTPS origin: https://nevora-clocker-staging-qa.vercel.app .
5. Initial14 actual hosted checks passed across Chromium/WebKit: Owner sign-in, PIN setting, enrollment, geometry/launch metadata, ClockIn/ClockOut receipts, and employee Owner-only denial. Final expanded hosted run passed20checks (19feature checks plus one explicit cleanup of a prior aborted fictional session). Both engines reconciled a lost committed response using its original action. Chromium used synthetic camera pixels through the actual deployed Sharp decoder; Owner private image read/removal passed. A separate11-check synthetic-fixture run prepared automatic retention acceptance.
6. Complete actual iPad Safari and Home Screen acceptance. Model/iPadOS and IP01–IP28 remain NOT RUN until real hardware is available.

## Photo activation gate

Photo preferences are restored Off, with all four event options available to the Owner. There are no image bytes remaining in staging and no open test time entries. Migration0041 now provides platform-only, Company-scoped cleanup with its own restricted `clocker_staging_cleanup` SQL login. That role can execute cleanup but cannot read private photo tables. The web role can read lifecycle status but cannot write it or execute cleanup. Real SQL role tests verify these boundaries. No human Owner session is used by the worker.

A bundled Neon Function (`clockerphotocleanup`, deployment2) is deployed on the isolated branch, with a branch-scoped schedule trigger `trigger-bcb71ecd-ca37-4ad6-877d-dc37a219bffb`. Actual scheduled runs completed at13:11:01 and13:12:01UTC on October27. The initial minute cadence was changed to hourly; readback confirms enabled and next run14:00UTC. Ordinary POST and forged `X-Neon-Trigger-Invocation-Id` POST both returned403. Neon documents that ingress strips client-set X-Neon headers: https://neon.com/docs/compute/functions/triggers/schedule . The worker never accepts Company identity or SQL from HTTP input.

Cleanup locks one configured Company, handles bounded batches, records append-only idempotent outcomes, and preserves canonical punch/time/receipt history. Capture requires a successful cleanup within75minutes and an operator attestation that has not expired. Quota exhaustion, scheduler failure, missing metadata or expired attestation closes new capture. Current staging attestation expires November3,2026 at13:09:11UTC; it must be reverified rather than silently renewed. Production capture has no binding and remains unavailable.

The new project's Neon point-in-time history window was read back as0. This disables history-based restore; it is not a promise that provider recovery copies are immediately purged. No snapshots or real employee photographs were created. Any approved restore requires capture paused and cleanup/current custody reverified before collection resumes. `pg_cron` was deliberately not used because it does not run while Neon compute is suspended.

Verification so far:572 current Clocker SQL tests/42files, targeted platform3tests,328 focused unit tests/25files, typecheck and targeted lint passed. One fresh continuation review found no blocking defects; its two minor type/test findings were addressed and the four platform unit tests passed again. The review excludes final deployment and physical acceptance. Report: reviews/2026-10-27-staging-code-review.md .

Staging Owner sign-in: employee ID `CLOCKEROWNER`. The unique random password is stored as encrypted `NEVORA_STAGING_OWNER_PASSWORD` in this Vercel project's preview environment; never paste its value into Git or chat. The application database and PIN keys are staging-only and private. An unused API-created `clocker_staging_app` role is not connected to the application or worker; Neon-created roles inherit administrative membership, so a restricted SQL role was used instead. No destructive role/project deletion was performed.

## Rollback

Disable Clocker punch/capture flags or retain the last verified staging deployment. Preserve canonical time/receipt/audit history and do not clear browser journals as rollback. No destructive database cleanup or project deletion is authorized by this runbook. Keep staging resources isolated; shut down through their normal idle/cost limits if testing pauses. Production deployment, main merge, real employee collection and native certification require their own evidence and authorization.

## Final deployment and operational result

- Integrated application: candidate `469aa56e419fef3d5757584ea032831981453857`, tag `staging/clocker/2026-10-27-469aa56e`, Vercel deployment `dpl_8dVeorn7WS4cQAqTd6qFeDH78qUe`, READY, explicit target `staging`. Canonical alias resolves to this deployment and all-deployment Vercel authentication is still enabled. Subsequent branch changes correct only the acceptance driver and handoff documentation; the deployed application source is identified here exactly.
- Worker deployment2 bundle SHA256: `e721432c50bcd264cb3c41872018b144a1794e598e59ca55bf1c37b928846e93`. It completed a real scheduled run after activation. Ordinary and forged-header POSTs still returned403.
- Automatic retention acceptance: a real UI-generated synthetic image was shortened to immediate expiry, then the platform scheduler removed its bytes. Command `ac9e1992-f8a6-4d86-b9a7-ab47a30c4e5e` changed from stored/bytes present to expired/bytes absent. Receipt fingerprint stayed `0a16d51eac6bded2254ba928e14779ca`; no time-history rewrite or repeat punch occurred. Worker totals confirm one expired photo removed. Latest verified cleanup13:31:01UTC. Hourly cadence restored; next14:00UTC.
- All transient test browser stations are retired through authenticated Owner controls after verification. Their device/time/audit history is retained. A real iPad needs its own new setup code.
- Evidence: this task's `outputs/clocker/staging-20261027/`, including `verification.json`, hosted/SQL/unit/ingress logs and tablet screenshots. No credentials or actual employee photographs are included.

## Access and next gates

1. Open `https://nevora-clocker-staging-qa.vercel.app/login` using the Vercel account authorized for this project. Use the staging Owner ID and encrypted password location above.
2. On the Owner's own device, open Settings → Clocker devices and create a setup code for the physical iPad. On that shared iPad, open `https://nevora-clocker-staging-qa.vercel.app/clocker/clocker-staging` and connect it. Keep the Owner portal session off the shared station.
3. Run `ipad-acceptance.md` in both Safari and a real Home Screen installation. Every physical IP01–IP28 row remains NOT RUN. No universal minimum iPadOS or native camera/sleep/wake/storage guarantee is inferred from Mac WebKit.
4. The Vercel connector can deploy/configure this project but its runtime-log read returned403. No authenticated Vercel CLI is available locally. Runtime-log access must be corrected through the connected account before claiming operational log inspection; successful browser/SQL evidence is not substituted for log access. Build/deployment status is verified separately.

Product position: Owner customization and the approved tablet foundation are retained. Engineering/security position: isolated fictional data, restricted principals, exact-command recovery and platform cleanup are verified within the stated checks. Release position: physical acceptance and runtime-log access remain open; no production authorization or native certification is claimed. The local integration branch and source tags remain recoverable; no shared development/main branch was pushed or merged.
