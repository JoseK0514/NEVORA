# Development inspection: five corrections

This change starts from qualified development `cfea6330bf1de601059274279e5300aa024eccb0`. Jose authorized completing all five inspection findings. NEVORA is the only repository changed. No hosted service, database, provider, public signup, main, live charge or Tax activation is included.

## Application behavior

- Calendar HTTP handlers distinguish a missing session (401), forbidden access (403), and an unavailable session/calendar source (503). Write exceptions use the existing retryable result contract. A real client regression confirms that retry retains the original operation ID after an acknowledgement outage.
- Requests coverage eligibility and swap creation read one scheduling source per screen request. Each candidate gets a new command projection because planning can annotate its request. The source is held only inside that request; there is no cross-request cache. Submission guards and creation's final fresh terms read remain. Real PostgreSQL regressions compare one and three candidates, enforce constant SQL round trips, freeze source rows, exercise conflicting candidates and reject later reads after revocation.
- TypeScript now enforces `noUnusedLocals` and `noUnusedParameters`. Unused imports, helpers and bindings are removed. Authorization, hook and fixture operations retain their execution order even where their return values are unused.
- Six handwritten calendar, scheduling and transaction modules have readable formatting, checked by a separately locked Prettier 3.10.1 runtime. The application dependency lock is unchanged. Formatting does not change the onboarding transaction's normalized emitted JavaScript.

## CI and evidence

The previous sequential attendance job becomes four independent owned groups: advisor/lifecycle, attendance/remediation, corrections and Clocker. Their commands, scenario assertions, deadlines and source checks are preserved. `max-parallel: 3` bounds this matrix; it is not a repository-wide runner limit or a promised duration.

The existing protected `phase-d-attendance-ui` context aggregates all groups and rejects missing, failed, cancelled or skipped results. Partial artifacts retain the original namespaces and exact selected-file hashes, bytes and source identity. Assembly rejects stale source, altered inventories, duplicate destinations, unexpected paths and symlinks. Valid diagnostics are copied before execution completeness is checked, so failure/cancellation evidence remains available to the original always-running uploader.

All ten protected context names remain. A successful source requires **23 CI jobs plus Mobile Access**, with **25 CI artifacts plus the mobile artifact**. The original canonical artifact families and semantic verifiers remain required; three additional partial archives transport the split browser evidence. Candidate qualification and a separate actual-development qualification must both pass on the final source.

## Validation and release limits

Before candidate publication, focused calendar tests passed 16/16 and the full owned exchange SQL suite passed 178/178. Strict TypeScript checks and the bounded formatter check passed. CI contract and transport-custody controls cover both successful assembly and retention on failed/incomplete execution. Final run IDs, complete unit/build results and artifact inventories are recorded in the delivery receipt; these preliminary results do not qualify a later source automatically.

A separate reviewer examined the calendar, batching, cleanup, formatter and CI changes. Review caught and corrected failure/cancellation diagnostic retention before freeze. That assessment is a source review, not hosted acceptance or independent closure of release findings.

All 86 retained historical restore inputs and the original-key regression blob (`b424bd1a0dee0895425f8fc34b7b581db8160f29630372448eacf659e50dc0ea`) remain unchanged. The earlier bounded SCRUM-85 review and historical signer/child-receipt limits are preserved. Full SCRUM-86/FR-AUTH-001 and hosted acceptance holds remain open.

## Integration and rollback

Integrate only after the immutable candidate passes the protected checks and current-source artifact verification. Use a normal development fast-forward after rechecking its expected head and source inventory; qualify the actual development runs separately. Keep the existing three branches and held deployment configuration.

No schema migration or provider rollout is required. For rollback, create a reviewed revert on development and run the same gates. Retain failed attempts and historical evidence. Claude can consume the unchanged screen response shapes and command contracts; calendar source outages now correctly return 503 and remain retryable.
