# R12 hours-export artifact identity and custody

Local baseline `4efc4011a`; implementation owner: this delegated checkout. Migration
`0059_payroll_export_business_identity.sql` is additive. Order/test allocation and
the generated onboarding checksum manifest are updated; the coordinator must merge
them with independent 0058/0060 additions and regenerate the final combined manifest.

## Contract

One workspace's exact finalized canonical model plus exact CSV bytes identify one
business artifact. Operation IDs, actor changes and equivalent mapping-profile
aliases cannot create a second identical receipt. A new attempt with a fresh ID
is refused as `nevora_export_ALREADY_GENERATED`; HTTP409 is
`{state:'already_generated'}` with private no-store headers. The original actor's
exact operation still recovers the original verified bytes, including after a
reopen, under current Company authority. Changed command contents still conflict.

PostgreSQL computes a SHA256 identity from model/CSV values, indexes the lookup
and serializes matching writes with a transaction advisory lock. A before-insert
trigger also prevents direct inserts from bypassing dedupe. Existing immutable
receipts, including historical duplicates, are retained; no destructive backfill
or unique-index creation over old duplicate records. Source/profile/finalization
checks remain, and SQL additionally rejects duplicate employee rows. Only READ
COMMITTED fresh writes are supported: repeatable/serializable snapshots are refused
as `nevora_export_ISOLATION` rather than trusting a stale post-lock lookup. The
owned tests use that supported mode, and the isolated workspace transport explicitly
requests it. The single-company driver still inherits the database default; that
hosted default is not claimed verified here. The database guard refuses an
unsupported setting, and the coordinator must qualify transport parity during R14.
No global transport/time-token refactor is included.

The export projection also preserves complete-read paging when revalidating a
large roster, fixing a real 301-person consumer failure without changing the
existing 1–100 selected-person export bound. Period population/manifest and
duplicate-person safeguards are untouched.

## Provider/operator custody and supersession

This is exact artifact dedupe, not proof of payment or provider submission. It does
not globally dedupe differently split employee batches or differently mapped CSVs.
A changed finalized revision/model or different output is a distinct artifact;
there is **no automatic provider replacement or supersession**. Before using one,
the operator must reconcile the previous manifest, external submission and any
provider-approved replacement process. R13 separately refuses unsupported correction
money instructions. Never infer that a second CSV means a second payment occurred.

Keep the original operation ID, CSV/canonical file hashes, period-manifest version,
and external handoff record together. Recover an uncertain response with the exact
original command/actor; do not mint a new ID. On `already_generated`, stop generation
and recover/reconcile the existing immutable export through the authorized operator
workflow. Do not edit/delete receipts, alter whitespace/mappings to evade identity,
or regenerate and re-import merely because a browser lost its response.

Claude integration contract: the existing client already clears retry on HTTP409
but currently shows a general revision-conflict notice. Its held UI integration
should recognize `already_generated` and explain recovery/reconciliation instead
of suggesting that refreshing creates a new artifact. No styling/UI file changed.

## Evidence and release gate

Artifacts: `/Users/josek0514/.codex/release-completion-20261111/r12-r13-r16/`.
`r12-sql-red`: four expected failures (fresh-ID, concurrent-ID, cross-actor/equivalent
profile, and lost paging). `r12-isolation-valid-write-red` reproduces missing
isolation refusal. `r12-sql-isolation-final`: all14 actual SQL checks passed,
including direct insert prevention, exact retry, races, reopen and301-person source.
`r12-period-authority-sql`: 29 existing Company/period/export SQL checks passed
(before the narrow isolation guard), including final-current-authority, rollback,
manifest bytes and population scope. `r12-http-final`:132 focused checks passed.
Full package TypeScript passed. Final static/manifest and combined full qualification
remain recorded separately; no full default/build rerun claimed here.

CTO/CISO: durable artifact safety, current authority and immutable history retained.
Product: no fabricated payment/replacement policy. Governance: local-condition only;
independent/combined review, staging/operator acceptance and later authorized CI/dev
remain separate. No Actions/push, hosted/native/production change, real payment,
provider call or new dependency occurred. Rollback must first hold exports; reverting
the application alone leaves database dedupe in force, while removing that control
would reopen duplicate generation and is not an automatic rollback recommendation.

Primary API reference checked during implementation:
[PostgreSQL17 binary-string functions](https://www.postgresql.org/docs/17/functions-binarystring.html).
