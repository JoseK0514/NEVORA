# Interim recovery UI code/security review

codeQualityStatus: WATCH
recommendation: REQUEST_CHANGES
blockers: Guarantee owned application/database teardown if browser cleanup fails.

Scope: uncommitted recovery UI/layout/proxy and owned browser fixture delta over9d11 in the root-owned worktree. Jose's bounded interim UI authorization is recognized; Claude's subsequent redesign remains separate. No source edits made.

## CRITICAL
None.

## HIGH
None established. No demonstrated session, role, money-write or redirect authorization bypass in the inspected patch.

## MEDIUM
1. src/test/integration/commerce-recovery-browser.integration.ts:73-76 performs browser closes sequentially before app.close inside the same finally. If any browser.close rejects, remaining browsers, owned Next/database teardown and evidence emission are skipped. This is a real cleanup leak on the failure path the owned harness must handle. Attempt browser cleanup independently, guarantee app.close regardless, preserve the original test error, and report secondary cleanup failures without falsely claiming ownership closure. Correct before the owned run.

## LOW / verification limits
The planned browser test uses genuine local sessions and actual unavailable/handoff-failure endpoints, but restricted/paid/invalid/denied status responses are explicit bounded presentation fixtures. It does not prove a successful server billing handoff, a payment, hosted commerce, or provider interaction.

Current browser scenario does not exercise retained healthy layout -> recovery -> ordinary workspace transitions or delayed status/handoff completion after unmount. Static rendering tests verify branch selection but do not run useEffect reload/abort behavior. Those remain browser acceptance scenarios to drive before declaring cached-layout navigation and cancellation verified. Code inspection found the expected controls, but is not runtime proof.

## Code observations
Proxy strips caller-supplied x-nevora-recovery-route and sets it only from an admitted exact GET pathname, including when commerce is disabled. Existing JSON/RSC/HTML negotiation remains intact. App layout requires current session and native-role admission before recovery rendering; exact recovery paths skip operational workspace/proof/loaders and parallel sheets. Non-recovery paths keep their normal checks. Billing page independently requires a session, mounts private client reads only for Owner, and returns bounded contact-Owner copy otherwise. Existing status and handoff APIs retain current session/Owner binding, origin and final identity checks; client availability never grants authority.

The client status read uses no-store/same-origin, strict existing CommerceStatus projection, a12s abort and active flag. Refresh clears old status, errors become unavailable, and revocation removes controls. Handoff is a click-only POST with one in-flight controller; successful navigation requires the same active controller and an exact HTTPS trusted-origin /pages/plans#handoff token destination without query/userinfo. It does not invoke checkout/payment directly or claim payment success. The page remains a point-in-time status view until refreshed; no continuous revocation/freshness guarantee is established.

The recovery boundary removes operational shell/sheets on client recovery entry and hides children pending a full reload when leaving a recovery-first layout. Whether this works across actual cached Next layouts remains a browser gate. Payroll recovery views remain responsible for their own authorization; existing page checks were inspected. Paused Clocker is public generic copy only, with a strict local bounded location key and no status request or arbitrary query echo. Shared Signature tokens are available from root layout; layout/style acceptance is still pending the browser run and later Claude redesign.

The owned fixture adds only an opt-in commerceEnabled boolean without provider credential/binding injection; browser interception blocks off-origin HTTP(S). It cannot certify live billing. No production activation, real mail, charge, tax or provider work was performed.

## Evidence and skill perspective
Read current diff/new files, canonical status/handoff routes, status parser, app/root layouts and design guidance. Inspected work/recovery-layout-red.log:7 layout/header controls fail before correction. Independently reran proxy/layout/recovery suites:79/79 passed. git diff --check passed. No DB/browser run started by this reviewer.

Programming and remove-ai-slops perspectives were loaded earlier in this session and applied. New tests assert authorization/presentation/route behavior; they do not delete failures, pin prompts or merely mirror implementation constants. The route marker and boundary abstractions serve separate server/client layout seams. Boundary URL validation is justified for a money-adjacent handoff; no unrelated production parsing was added. The cleanup defect above remains the material quality issue.

Approval does not cover candidate/development CI, source freeze, native/host bundles, hosted acceptance, independent audits or main/production. Root retains integration/hosting custody.
