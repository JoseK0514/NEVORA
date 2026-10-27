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
3. Add fictional employees, restrict the app database role, and configure staging-only encrypted environment variables. No SMTP, push delivery, analytics/replay or background payroll/notification workers.
4. Freeze a reviewed Git candidate and publish an immutable staging source tag, preserving all existing branches. Deploy that exact candidate to the separate protected project, with a canonical HTTPS origin.
5. Verify hosted sign-in, Owner-only administration, tablet enrollment, PIN/punch/receipt recovery, manifest and private/error behavior. Distinguish real hosted results from loopback WebKit checks.
6. Complete actual iPad Safari and Home Screen acceptance. Model/iPadOS and IP01–IP28 remain NOT RUN until real hardware is available.

## Photo activation gate

Photo settings and private review are implemented. Capture remains unavailable until a real Company-scoped platform cleanup worker, factual backup/restore disclosures and the runtime binding are verified. Do not substitute a human Owner session, a fictional provider or a successful saved preference for this evidence.

The new project's Neon point-in-time history window is0. This disables history-based restore; it is not a promise that provider recovery copies are immediately purged. No real employee photographs are authorized for staging. `pg_cron` appears in available extensions, but Neon documents that it does not run while compute is suspended; its presence alone does not establish a cleanup service.

## Rollback

Disable Clocker punch/capture flags or retain the last verified staging deployment. Preserve canonical time/receipt/audit history and do not clear browser journals as rollback. No destructive database cleanup or project deletion is authorized by this runbook. Keep staging resources isolated; shut down through their normal idle/cost limits if testing pauses. Production deployment, main merge, real employee collection and native certification require their own evidence and authorization.
