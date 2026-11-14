# Read-only privacy case and restore review

This checker makes the manual evidence record executable for review. It **does not** verify a mailbox, consume a challenge, approve a policy, delete or restore data, change a request, or activate a company. `review_ready` means the supplied operator attestations are structurally complete and mutually consistent, not that the recorded work actually occurred. `canMutate` and `canActivate` are always false. Follow the [account deletion runbook](../compliance/account-deletion-runbook.md) for the actual authorized operator procedure.

Keep real case records in the existing restricted operations store, outside Git and Jira. Include only opaque case/operator/evidence references. Do not copy names, contact addresses, passwords, challenge values, connection strings, provider payloads or document content into this manifest. The checker rejects unknown fields and prints fixed reason codes rather than supplied values or file paths.

## Run an offline review

Use Node 24 and the locked project dependencies. Select the expected environment, workspace, company incarnation, application source, operation, case reference and subject independently from the authorized current inventory. Store that exact binding in a separate private JSON file. The checker cannot establish that an inventory or evidence reference is trustworthy; the operator/reviewer must establish custody.

```sh
node --import tsx scripts/operations-case-readiness.mts --manifest /PRIVATE/case.json --expected /PRIVATE/current-binding.json
```

Exit 0: `review_ready`; exit 1: `blocked`; exit 2: invalid CLI/file input. None is execution authority. Production uses the actual UTC clock. Historical `--as-of` is accepted only for test-environment rehearsal.

The checked-in examples are fictional and cover no live person, company, policy or provider:

```sh
node --import tsx scripts/operations-case-readiness.mts --manifest docs/operations/examples/privacy-case.json --expected docs/operations/examples/privacy-binding.json --as-of 2026-11-11T12:10:00.000Z
```

## Binding and common record

The closed top-level record is `{schemaVersion:1,binding,record}`. Binding has exactly `environment` (`test`/`production`), `workspaceId`, `incarnationId` (canonical UUID), `sourceSha` (full SHA), `operation` (`completion`/`withdrawal`/`restore`), `reference` and `subjectRef` (null only for a company restore). Every binding value must match the independently supplied expected file.

Every operation record includes `policyRef`, `reviewedAt`, `operator` and `dependencies`. References are opaque ASCII identifiers of at most128 characters. Timestamps are canonical UTC milliseconds. `operator` has `primaryRef`, nullable `backupRef` and `coverage` (`attended`/`unattended`). Unattended records need a distinct backup. No assigned person or actual coverage is inferred from an identifier. Nonempty dependencies block review.

The type/record definitions and tested fixtures are in [the checker](../../src/lib/operations/case-readiness.ts) and [its regression suite](../../src/lib/operations/case-readiness.test.ts). Arrays are bounded at1000 entries and each CLI input at64KiB.

## Completion evidence

`requestState` must be `processing` or `completed`. `inventory` must account for exactly these scopes once each: access, profile, work_records, communications, payroll, photos, advisor, providers and backups. Every item has `scope`, `disposition` (`removed`/`deidentified`/`retained`/`not_applicable`), `evidenceRef`, `basisRef`, nullable `endAt` and nullable `hold`.

A retained category needs an approved basis reference and either a future end/review date or an owned hold with `authorityRef`, `ownerRef` and future `reviewAt`. The checker supplies no retention period and does not approve the cited basis. `not_applicable` needs recorded inventory evidence and a basis; it must not hide an unreviewed category. Actual schema/object/provider inventory still determines the complete removal manifest. The scope list is a review floor, not a full table-level erasure plan.

`providerTasks` entries have `reference`, `state` (`complete`/`not_applicable`/`pending`/`unknown`) and nullable `evidenceRef`. Pending/unknown work blocks review. If provider work is applicable, at least one completed/explicitly inapplicable task must be recorded. Actual provider receipts and backup disposal/expiry must be independently inspected.

## Withdrawal evidence

Preserve the approved method: control of the pre-request mailbox plus the matching Employee ID, a fresh unpredictable single-use challenge lasting15minutes, and request state `received`. The checker examines a **recorded verification**, not a challenge secret.

`verification` includes historical contact `contactEvidenceRef`/`contactEffectiveAt`; challenge issued/expires/verified timestamps; `challengeReceiptRef`; `consumptionEvidenceRef`; and `verifiedCaseRef`/`verifiedSubjectRef`. The identity references must match this exact case and subject. Contact evidence must precede the request, verification must fit the exact15-minute lifetime and precede the review, and the challenge must still be fresh at review time.

An opaque receipt does not cryptographically prove mailbox control, unpredictability, successful consumption or global non-reuse. Those remain the Support operator's actual evidence. The received-only conditional SQL in the runbook must still recheck current state at the actual withdrawal boundary. Processing/expired/unverified cases must not be withdrawn; the checker never restores sign-in access.

## Restore reconciliation

The record requires `companyState:suspended`, `restoredAt`, `backupCapturedAt`, `backupEvidenceRef`, `credentialRetirementEvidenceRef` and `suspensionEvidenceRef`. This supplements the existing suspended restore/credential-retirement procedure; it does not restore or reactivate anything.

`erasureRegister` contains a current post-restore `observedAt`, an authoritative `evidenceRef` held outside the restored snapshot, and `completedCases` with `reference`/`completedAt`. `reconciliations` must cover that exact set once each, with `reference`, `disposition` (`reapplied`/`already_absent`/`restricted_retention`) and `evidenceRef`. Missing, duplicate or unrelated cases block review. An empty set is meaningful only if the operator has actually verified the authoritative register is empty.

Before any future release from suspension, the database/backup/privacy owners must independently verify that completed erasures and restrictions were reapplied, privileged access was retired, current principals/keys/schema were requalified and actual provider/storage retention was observed. This checker cannot discover cases missing from a supplied register.

## Communications and release limits

The separate D04 communications archive/purge/legal-hold decision remains open. Existing immutable communication history and the owned-disposable-runtime activation hold remain unchanged. A generic privacy manifest or general retention policy does not resolve D04 or permit deleting protected history.

Current-source tests and this offline rehearsal do not certify live deletion, mailbox receipt, snapshot disposal, staffed coverage or restore safety. Those observations remain operating evidence, with exact authorized environment/source and accountable reviewers.
