# Independent staging preparation review

Reviewed detached 00c7f673ae9d5f177d759e0d66947095355d2ef5 against 17102418b80fc5ebcae2fe4890eb1dd8252ac8d3. Ready for provisioning decision: **after corrections**. Code quality status BLOCK. Recommendation REQUEST_CHANGES.

**CRITICAL** — None.

**HIGH / Important**
- native/staging/environment-plan.json:98–107 proposes a recurring Vercel seat plus unspecified variable usage. Its spend pause does not govern this custom environment. The approval has no operational overage limit or review interval. Before checkout, state the extra usage amount being requested, monitoring owner and interval, and threshold/action to pause this staging project. If strict invoiced maximum is required, stop until a provider-enforced limit is verified. A measured threshold can overshoot. See https://vercel.com/docs/spend-management.
- native/staging/environment.template.json:30 identifies the Vercel variable type as Secret. The installed create_project_env schema only accepts system, plain, encrypted or sensitive. Use sensitive and only the verified customEnvironmentIds entry, omitting built-in targets, and read back non-secret scope metadata before deployment. Never fall back to Preview or Production to satisfy the schema.

**MEDIUM / Important**
- docs/native/evidence/2026-11-05/staging-preparation/README.md:25 and source-export-verification.json:7–13 describe an export excluding history/automation. Its archive includes 10 .omo/evidence logs, 31 .superpowers reviews/traces and 11 .claude authoring files. Remove authoring/evidence inputs from the candidate before upload and regenerate the rehearsal/hash receipts. No sensitive data disclosure observed or alleged.
- native/staging/vercel-create-project.request.template.json:5 and environment-plan.json:15–17 specify ordinary npm ci. The rehearsal used --ignore-scripts, and esbuild, fsevents and unrs-resolver declare install scripts. Match the rehearsed flags in the hosted plan or requalify the exact command in isolation. Require Node 24.x readback before the application build.

**LOW / Minor**
- docs/native/evidence/2026-11-05/staging-preparation/README.md:25 says build results will be recorded when complete. The receipt already exists. Link the final build receipt.
- native/staging/README.md:16 selects setup development mode. That mode does not enforce certificate verification in scripts/company-setup.ts:86. Specify TLS certificate/hostname verification for the privileged hosted bootstrap URL and use NEVORA_SETUP_DATABASE_URL explicitly.

**Strengths and checks** — All ten JSON files parsed, and git diff --check passed. The two creation draft shapes correspond to the installed tool schemas, including deliberate invalid null team ID. Neon uses the current non-deprecated endpoint settings and per-project quotas at creation. Confirmed 2,842 unique tar entries exactly matched the manifest path list, and both archive and manifest SHA-256 matched the tracked receipt. Inspected npm installation/build logs and the verifier's imports/assertions. Mail/invitation, push, AI and passkey reader outputs have local validation. Payroll/Clocker were checked by flag value and independently traced to readers. Separate installer/runtime identity, read-before-create retry handling, fictional fixtures, and separate future approvals for inert first deploy and canonical-domain exposure are appropriate. New Vercel auth protection and preview exceptions are available without another add-on per https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan.

**Skill check** — Consulted OMO programming and remove-ai-slops. The reviewed diff introduces no production code, test suite, parsing, validation or abstractions. Neither skill perspective found a diff violation. External verification assertions that only check manifest literals establish configuration intent, not behavior or cloud state. No new test is warranted for prose.

**Declined to judge** — Hosted acceptance, actual resource billing, account permissions, raw credential custody, domain delivery, device signing and store readiness require separately authorized actions. No provider action, secret access, source edits, index/ref changes, new deployment or test build by this reviewer. Existing provider observations and local build logs are historical evidence; provider account state was not reread. ULW status returned ULW_LOOP_PLAN_MISSING. External report location follows this task's instruction to preserve the repository.
