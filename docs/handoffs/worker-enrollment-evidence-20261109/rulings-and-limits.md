# Engineering decisions and release limits

These are executor decisions under the approved scope, not policy exceptions or Production authorization. Original independent reports remain unchanged.

Ruling: preserve the explicit inline execution/opt-out rather than asking for another plan approval — the user just chose this method and delegated the design, so the brainstorming exception and user instruction override the generic writing-plans handoff question. Cost if wrong: material design choices need careful source-backed independent review and remain visibly documented; no hosted action follows without its concrete approval.

Ruling: RSA3072-OAEP-SHA256 wraps a fresh AES key; use the existing AES-GCM helper for a strict company-specific payload — preserves the current private provisioner roots and avoids a public root-export/debug route. Cost if wrong: an enrollment fails closed; cryptographic/issuer/recipient substitution cases must be independently replayed before hosted use.

Ruling: normal runtime admission expiry/revocation does not claim to recall an underlying PostgreSQL password — the existing company WORKER login is reused, and its separate compromise-rotation procedure is not automated here. Cost if wrong: describing this as full credential revocation would conceal residual access on a compromised host; test/document both facts.

Ruling: pin each public request hash independently alongside its request ID in protected issuer configuration — a database-side recipient substitution must fail even if metadata is altered. Cost if wrong: an otherwise valid request stays blocked until its expected hash is reviewed; no credential is silently sealed to another recipient. This updates task2/4 interfaces before they start.

Ruling: fresh recipient key per enrollment operation, enforced by database uniqueness — avoids cross-company or renewal reuse races and keeps revocation/custody separable. Cost if wrong: renewal needs a newly generated key/approved secure handoff; no old recipient is silently revived.

Task3: Ruling: require a fixed company-side WORKER hash/login/identity proof before publishing sealed material. The existing source-only derivation could seal an Owner-derived secret if the two issuer roots were misconfigured. Cost if wrong: issuance fails closed during company outages; no unverified derived capability is exposed. Existing store fixtures use explicit source/material proof; a separate owned-company SDK/SQL suite qualifies the production proof adapter. company-authority-red.log observed4failed18passed before this change.

Final: Ruling: Hosted A/B ACL/native-proxy/invocations excluded from offline verdict — hold action-time scoped audits and explicit staging approval — cost if wrong: an untested hosted assumption cannot be treated as certification.

Final: Ruling: CLI merge/root preservation/transfer excluded from offline verdict — official merge docs and9.3 help checked, actual stored OAuth failed invalid_grant; fresh sign-in and protected preservation checks remain gates — cost if wrong: unsafe replacement could lose roots or block staging.

Final: Ruling: Render billing/health/renewal/capacity excluded from source review — keep Blueprint unapplied, Jose responder and finite24h staging admission; no production operating claim — cost if wrong: hosting/renewal would otherwise be assumed without proof.

Final: Ruling: Real delivery/recipients/model execution excluded — initial profiles payroll-only; require separate delivery setup and explicit smoke approval; no new model calls — cost if wrong: notifications cannot be called operational from local queues.

Final: Ruling: Native/UI/WebKit/2027/VELANI/deletion excluded — preserve ownership and open release gates, no whole-product completion claim — cost if wrong: unrelated work could otherwise be mislabeled complete.

Final: Ruling: Plaintext password recall excluded — document normal admission revocation versus separate compromised-company rotation — cost if wrong: a compromised host retains the old login until rotation.

Final: Ruling: Malicious superuser/root custodian rewrites excluded — trust authorized custody while denying plausible effective privilege/hash drift in canonical admission — cost if wrong: no application can certify an intentionally rewritten trust anchor.

Final: Ruling: Hosted latency/fleet cost/crypto certification excluded — bound claims to local real crypto/ownedSQL and two selected staging companies — cost if wrong: cost and fleet service levels remain unmeasured.

Final: Ruling: Receipt invalidation solely on a later host deployment excluded — retain sealed issuing-source/identity/finite-expiry binding; do not imply new host SHA reissued it — cost if wrong: cross-deployment forced renewal is not implemented.

Final: Ruling: Prior closed findings/exactCI recertification excluded — preserve original6closed host findings and both red baselineCI attempts; require new exact-source artifacts — cost if wrong: old evidence must not stand in for changed source.

Task5: Ruling: acceptance failure was an ineligible quiet-hour test fixture, not permission to weaken notification policy — select deadline six hours after actual nextRoutineTime and pin the scanner clock while preserving the one-row/replay assertions; focused real CompanyAccess27/27. Cost if wrong: the serial full505 acceptance must still expose any genuine producer defect.

## Deferred minor items

- Owner-supplied private FIFO can block the local file helper before descriptor validation; original independent item7 remains deferred.
- Prior host minor: deliberately disabled host omits its health key; pause the observer during drain as the runbook requires.
- Prior lint minor: anonymous default export in workforcemonitor.entry.ts, one warning and no error.
