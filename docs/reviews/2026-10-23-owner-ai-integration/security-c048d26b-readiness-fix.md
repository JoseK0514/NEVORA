# Independent confirmation readiness code review — c048d26b

Candidate: `c048d26b5bee0ba888ce1c66f3af253524ada0b7`, clean HEAD verified.
Diff base: persisted regression `52e7872255a5a01ae6a08d25b71a5fcac56204a5`.

codeQualityStatus: **WATCH**
recommendation: **APPROVE** the bounded readiness correction by code review and inspected RED/GREEN evidence.
blockers: **[]** in inspected correction. Independent QA/UI execution acceptance, real application/full Attention and mandatory cloud gates remain separate.

## Scope and implementation

Only `src/components/employee-weekly-confirmation.tsx` and one preparing-status CSS rule change. Inspected complete diff/current component, operation-keyed caller in schedule/page.tsx, persisted harness, and actual installed React19.3.0 external-store implementation. No runtime, tests or build were launched by this reviewer; no source/index/HEAD was changed. Diff whitespace check passes.

Server snapshot is false, and each component instance begins with a false readiness ref. SSR and initial hydration therefore display the noninteractive preparing status rather than an actionable form. Stable getSnapshot returns a cached primitive; subscribe is stable until router identity changes. The subscription installs actual blur/pagehide/visibility/focus handlers before marking ready and notifying React. This is a real lifecycle boundary tied to form availability, not a test-only flag.

The installed React implementation uses getServerSnapshot during hydration, installs the subscription as an effect, checks snapshot changes on notification and schedules a store rerender. A constant false server snapshot is stable even though its function is inline. No uncached object snapshot or unconditional render-time mutation is introduced.

Existing clear() increments the generation and records blocked; already-hidden setup invokes that before readiness notification. Blocked takes rendering precedence over ready. Readiness means listeners are installed, not authorization or document visibility. I found no demonstrated need to change readiness to a visibility-derived value: the retained hidden-at-setup regression observes no form appearance in either pinned engine/React version. Preserve that regression for future scheduler/library changes; this is not a claim about arbitrary future React ordering.

Cleanup resets readiness, increments generation and removes the exact registered handlers. StrictMode cleanup/setup can re-arm without leaving preparation stuck. Router identity replacement re-subscribes; it does not clear an existing blocked result, so it cannot restore retired intent. Cleanup/setup is synchronous within the React effect lifecycle, while the component's existing generation fences responses spanning it. Actual unmount discards local readiness/result state; the production caller keys the component by operationId, preserving the established new-canonical-intent boundary.

Submission, original operation identity, unknown/unavailable retry eligibility, response generation comparison, committed canonical refresh and server action are unchanged. Readiness adds no authorization bypass, business mutation, hidden retry or success fabrication. A late response after clear/unmount still fails the original generation comparison. The change does not promise to replay an event fired before any listener existed; when the document is still visible after a synthetic early pagehide, later armed exposure is expected by the narrow invariant.

## CSS and privacy boundary

The single quiet status rule uses existing tokens, 44px minimum height and no autofocus, spinner/timer or click target. Final mobile geometry/large text/layout/focus remains UI review scope. JavaScript-disabled or failed hydration stays preparing; this is an honest readiness limitation, not a fabricated command result.

Withholding the form does not erase intent from RSC/serialized props or private schedule content and does not replace server authorization. No stronger secrecy, physical-device or BFCache guarantee is supported by this patch.

## RED/GREEN artifacts inspected

`engineering/attention-persisted-ssr-red/attention-intent-readiness-custody.json` identifies clean52e78722 and unchanged source, actual old component hash `a8f618b4a550860c2a0ff0401fc7f11500459708036ed0518f9918ab10126e69`. Original createRoot controls pass in both engines. SSR controls fail in both: one initial authority field with zero listener; early detachment timeouts15,005ms/15,001ms, followed by separately recorded armed positive controls7ms/11ms. Both browsers close. The failed SSR path does not reach final runtimeErrors/external assertions, so missing final fields are not claimed as zero.

`engineering/attention-persisted-ssr-green/attention-intent-readiness-custody.json` identifies clean c048d26b, tree `4de3cd91952fb759334213f5ce024093134990ad`, sourceUnchanged=true and passed. Both original and SSR controls pass in Chromium/WebKit. Both SSR authority counts are zero; armed clearance is2ms; hidden-at-setup has zero form-attachment observations; StrictMode, router rearm, unmount/remount and no-autofocus assertions complete. Runtime errors=[] and externalRequests=0; both browserClosed=true. Independently recomputed component SHA256 matches receipt: `5924fcc4691f0a19eb4b744d4a4893ed162c7d118c1c0ff13dc7c964fbf87ae3`.

These are inspected executor receipts, not an independent runtime replay. The parent reports process exit0 and closure; report custody corroborates browser closure. No result is relabeled as real Next/PostgreSQL or historical-cloud evidence.

## Findings and skill perspectives

CRITICAL: none new.
HIGH: none new.
MEDIUM: none new.
LOW: no new blocking code observation; broader readiness/hydration/physical-browser limitations remain explicit.

Reapplied loaded programming/remove-ai-slops criteria. The single per-instance readiness state and framework subscription replace the previous lifecycle effect at the shared component seam; no redundant caller patches, new production parsing, speculative generalized store, type escape or test-specific product interface is added. SSR/retirement tests exercise observable behavior and previously reproduced failure. The use of useSyncExternalStore is justified by synchronization with the actual lifecycle subscription and hydrated server snapshot, not solely by suppressing lint. No assertion, original deadline or error acceptance was weakened.

## Release disposition

Approve this exact bounded product correction. Independent QA/UI should own their final replay and finding closure. Require actual current-source Attention14-cell application behavior, ordinary confirmation/retry/conflict/revocation/late-response behavior and mandatory exact-candidate CI before release integration. The historical WebKit lifecycle event timing remains unproved and distinct QA-AT01 unavailable-alert cause remains unresolved unless independently dispositioned; a local pass cannot self-close either historical claim. Hosted coordination/database/deployment approval, actual acceptance, new inference budget and production authorization remain separate. All earlier reports are preserved; only this new external review was written.
