# Private onboarding and Stripe staging acceptance

Codex's approved backend/hosted phase is complete for two fictional companies. Claude retains the UI. This is **backend and sandbox acceptance**, not a public launch or a complete rendered onboarding acceptance. Observations span November 8 local / November 9 UTC, 2026.

Application source: `a07bfcc17f0b08880de50300ed5abb5c564312ff`, tree `2a181a79613d80e93d9c81d3e7cae3c0a5569f50`. Work remains in the externally managed detached worktree, with no push, development assembly, main merge or production release. Later handoff-only commits do not change these tested application bytes.

## What was demonstrated

- Real application signup verification mail and employee invitations reached the sole approved inbox, `support@thevelani.com`. Replay did not send duplicates. Resend reported delivered for verification A/B (`01a1bd97-c526-73f9-96b7-59843dc6560f`, `01a1bda4-f60f-7261-8738-f83701af027c`) and invitation A/B (`01a1bda7-78a0-7cde-9291-52ba64acaab1`, `01a1bdad-40c5-7956-88f8-1470e6f0f939`). Signup proof was captured before SMTP; delivered-link clicking is not claimed. Employee activation used the actual delivered invitation envelope.
- The authenticated native provisioner created exactly two isolated company projects in the approved Free organization. An uncertain first create was recovered as the same operation/resource, with zero replacement create calls. Final code's read-only lookup finds both exact projects with zero POSTs.
- Both companies completed original one-use Owner activation, normal password sign-in, canonical resumable business/location/scheduling setup to READY, employee creation, invitation delivery/activation and normal employee sign-in. The backend harness calls the original handlers against real hosted databases and services; it does not render Claude's screens.
- Genuine Stripe sandbox Checkout setup completed for both. A paid a USD19 invoice using public test card4242. B's test0341 payment failed with no new paid coverage, then actual Customer Portal replacement with4242 recovered that invoice and active projection. Zero-value setup invoices granted no paid coverage. The application's original 30-day trial timestamps were retained throughout; only sandbox provider fixture trials were ended early to exercise charges.
- Genuine signed Stripe events reached the native receiver, queue and reconciliation. Final state is20 webhook receipts,20 done jobs, no pending/running jobs. Both owned subscriptions are canceled; historical positive paid coverage is retained. Controlled re-signings of the unchanged original paid/older past-due/older failed event bodies returned200 twice each with counts20→20 and unchanged trial/coverage. These are not Stripe-origin redelivery tests. Invalid signature returned400.
- Cross-company cookies/proofs/instance secrets, Employee billing, unapproved UI origins and stale authority were denied. Suspending B's source failed503 while A stayed200; monotonic restoration recovered B. Normal logout revoked Owner/billing/return authority; all final Owner and Employee sessions were logged out and remaining owned billing capabilities retired.

## Source-bound verification

| Check | Result at the final application source |
|---|---|
| Full root suite, quiet run | 11,375 passed;857 skipped;55 pending;0 failures. 754 files passed,32 skipped. Skipped/pending cases are not acceptance. |
| Focused final fix suite | 238 passed. |
| Owned PostgreSQL suites | Routing11;Owner activation13;isolation auth13;integrated commerce17;commerce88 passed. |
| Types and lint | Both exit0. |
| Six actual clean ZIP extractions | 74 files verified, SQL tampering rejected; compiled source binding rejects missing/wrong source labels. |
| Actual authority custody | Base SELECT denied42501; no base/column SELECT; owner-controlled security-barrier view exposes exactly2 current active test APP rows and zero WORKER rows. |
| Actual signed native transport | Original facts/policy/Owner200;badHMAC401;modified signed body401;authenticated oversize413;stale401;foreign company403. Unregistered target URL503 is provider routing, not a handler rejection. |

One fresh read-only whole-phase reviewer reported six Important findings and no Critical. The executor's single fix pass addresses APP-only reader custody, removal of the authority's browser-envelope root, empty-page pagination validation, exact native UI origin, compiled source identity, and missing hosted negatives. RED/GREEN and hosted receipts are preserved. There was no re-review or independent certification.

The earlier unchanged5-second runner timeout under overlapping build/DB load, its isolated90-pass run, and subsequent quiet green full run are separate preserved results. No timeout, assertion, skip or snapshot was weakened. Initial invalid pagination fixture and a reader fixture-order issue were corrected before meaningful RED/GREEN; they are recorded as test setup failures. A transient native503 before publication convergence, an old Employee cookie correctly invalidated by rotation, and a replay assertion overlapping a genuine cancellation are retained, followed by unchanged positive checks after convergence/fresh login/settled state.

## Deployed staging and final closed state

[Protected READY Preview](https://nevora-onboarding-staging-407jorlm5-josekarlo-5933s-projects.vercel.app), deployment `dpl_CStTXazvGFjC1pK6nV8zsCgAdYbJ`, project `prj_4In3h5qWpIKwdFWD2S8Ur2YdZZ9P`, team `team_Lzbw410WwXGWHTuUXuamRI1N`, target Preview/null, Node24. Source/tree metadata matches the application above. All15,385 tracked input files were checked against canonical Git blobs before deployment packaging. Root-anchored deployment-only exclusions preserve nested payroll/native modules.

Vercel Authentication remains **ALL**. A direct unsigned Preview config request redirects302 to Vercel. Safari's legitimate existing signed-in session renders `/api/onboarding/config` with `{schemaVersion:1,signupEnabled:false,locales:["en","es"]}`. No bypass/share link, cookie extraction or protection exception was used. The UI rendering is observed; HTTP status was not read from Safari's response metadata.

Only these two new actual company aliases were attached to the READY Preview:

| Company | Workspace / isolated provider resource | Registered origin |
|---|---|---|
| A | `b7f07d3e-2255-474c-9a28-10c3185f5234` / `divine-mode-79850636` / `br-gentle-firefly-bctl69xv` | `https://acceptance-a-20261108.portal-staging.nevora.team` |
| B | `fe327544-3bd5-4b27-a19b-d1cb35d55300` / `soft-meadow-67826582` / `br-polished-pine-bbrt3aiy` | `https://acceptance-b-20261108.portal-staging.nevora.team` |

GoDaddy's Safari record editor behaved inconsistently. Its supported additive TXT zone import succeeded:14→16 records; exactly those two CNAMEs point to `983c97c5e0514a63.vercel-dns-017.com.`, TTL1800. Existing apex/mail/NS records were retained; no wildcard or nameserver change. Both authoritative nameservers resolve them and Vercel created both certificates. Public HTTPS retains the302 SSO boundary. B's system resolver initially cached NXDOMAIN; a1.1.1.1-resolved request verified the actual certificate and302 without bypassing authentication. The original `signup-staging`, `company-a` and `company-b` aliases were not moved and still refer to the older isolated checkpoint. Do not use those as evidence of this source's UI.

Native functions are on project `damp-haze-17022523`, branch `br-hidden-mud-bbnc2fxk`. All six current/active deployments are completed at the final source:

| Function | Deployment | Final state |
|---|---:|---|
| stripewebhook |22|HOST=false;Stripe endpoint disabled |
| commercequeue |23|HOST=false;schedule disabled |
| commercereconcile |22|HOST=false;schedule disabled |
| provisioner |19|HOST/worker/onboarding/provider/enrollment=false;creation allowance0;schedule disabled |
| commerceauthority |11|HOST/commerce=false;26 variables;browser-envelope key absent |
| commerceapi |10|HOST/API=false;Tax=false |

Authenticated native scheduled callbacks under the final source reported `disabled`; all three schedules were then restored OFF with next_run_at=null. Closed receiver/authority/API503 and unsigned worker401 were verified. Stripe endpoint `we_1UZdvpHT1nhEuOJ29Goa80ES` is disabled with unchanged URL and11 subscribed events. Public signup, mail/provisioning processing and live payments remain off. No third company is authorized by the completed two-company allowance.

Company provisioning uses Free org `org-twilight-term-01785349`: exactly2 fictional projects,0.25CU,6-hour history, explicit positive compute/active/write/storage/transfer quotas. The existing native-function project stays in its existing Free org. **No Render service or additional paid plan was created; incremental contracted hosting cost is $0/month.** Free quotas and provider terms still apply; this is not a production sizing conclusion.

## Security custody and incident correction

Provider organization key stays only in the private provisioner. The nine-permission sandbox API key stays only in commerceapi; worker Stripe custody remains separate. Authority has the fixed APP-only routing reader and shared machine service key, with no browser-envelope root. It authenticates fixed method/path/body/company requests before body or database work; no general URL proxy/cookie forwarding was added. Native API admits only the exact approved signup UI. Runtime pools are bounded and service source labels must match the compiled artifact.

During preparation a sandbox key page auto-emitted, and later a connector validation error echoed staging provisioner configuration. Processing/schedules were closed immediately. Equivalent staging credentials and cryptographic roots were rotated; no production credential was involved. Actual old provider401/outside-org404, eight old database credentials28P01, six new company-role TLS logins, new-root decrypt/old-root failure and normal current-Owner/native positives verify retirement. Preview-only sensitive roots were rotated while isolated Production values were preserved. New immutable secret records and monotonic registry publication preserve the guards; no trigger was bypassed. Old terminal immutable request/grant ciphertext remains audit history under its retired epoch and is not resumable. Test sessions and capabilities were retired. Temporary secret-transfer files were erased; raw secrets and private handoff URLs are excluded from this packet.

## Claude handoff and remaining gates

Use [the implemented onboarding API/UI contract](2026-11-07-onboarding-backend-ui-contract.md) and [the integrated commerce contract](2026-11-08-integrated-onboarding-commerce.md). Exact sequence: verified signup/consent → original provisioning operation/polling → one-use Owner activation → normal company sign-in → canonical resumable setup → team → explicit invitations. Do not use legacy commerce signup/setup/login-link/verify; they return409/use_onboarding. READY is core setup readiness, not payroll/legal certification.

After current Owner sign-in, the company `/api/commerce/handoff` supplies a one-use billing handoff. Exchange through the native API, retain access token only in memory, and preserve original status/checkout/Portal/logout contracts. Current source/session/incarnation authority is rechecked. Native API origin is `https://br-hidden-mud-bbnc2fxk-commerceapi.compute.c-15.us-east-1.aws.neon.tech`; its configured UI remains `https://signup-staging.nevora.team`. That UI's existing alias is older source: do not point the integrated screens to this closed native backend or enable flags until a source-matched joint acceptance is prepared.

Open gates, with ownership:

1. **Claude / joint UI:** implement and integrate the real signup/setup/invitation/billing screens. Actual Checkout returned to missing `/pages/nevora-billing-return`404; backend return exchange200 does not fix that screen. Test desktop/mobile, EN/ES, keyboard/focus, loading/error/empty/success, refresh/back, two tabs, lost response, cookies and partial/unknown invitation delivery. Browser company login/cookie plumbing remains unverified by the backend adapter.
2. **Codex + Claude integration:** reconcile current development/collaboration source drift, authorized assembly, exact combined-source remote CI and source-matched deployed UI. No new branch/push/merge is included here. Reuse these fixtures where possible; creation allowance0 stays until another exact bounded run is approved. Re-enable only the required staging flags/schedules/endpoint during joint testing and restore OFF afterward.
3. **Jose / tax adviser:** decide actual registrations, merchant scope, head-office details, product classification and inclusive/exclusive commercial policy before Tax collection. Tax remains off. Sandbox Small19/Team29 prices are test fixtures, not approval of live commercial terms. Velani's existing baseline supports owner-reviewed Dashboard/Hosted Invoice Pages; the fictional USD1 unsent finalized invoice was a separate parameter/page test, not a real customer invoice or an automated client-project workflow.
4. **Release owners / Jose:** provider-origin redelivery, hosted backup/restore/production DR, broader capacity and source-specific independent release dispositions remain separate. No public launch, live Stripe/customer-data operation, native release or production approval is inferred.

Rollback is the current closed state: keep new signup/mail/provisioning/commerce processing off, schedules and Stripe endpoint disabled, allowance0; retain resources, journals and receipts. Suspend a source before retiring/restoring its credentials. Never delete/recreate a company/customer/payment to retry an uncertain operation. Only the two new aliases can be detached if this Preview is retired; do not change existing signup/mail/apex records.

Engineering supports this bounded result. Security retains least-privilege custody, current Owner/source/signature checks and SSO. Delivery/governance keep the full onboarding/Tax/live release issues open. These are implementation dispositions, not independent QA/security certification. Jose has no new decision required to preserve this closed staging handoff.

## Durable evidence

[Evidence index](stripe-evidence-20261108/private-onboarding/index.json), [execution/review rulings](stripe-evidence-20261108/private-onboarding/progress.md), [fresh review](stripe-evidence-20261108/private-onboarding/final-review.md). The archive contains complete test outputs/reports with credential-shaped test-name text redacted, actual hosted receipts, failures and backend harness sources; its SHA256 inventory is in the index. No private credentials, cookies, proof envelopes, payment URLs or raw provider secret diagnostics are included. Browser screenshots are available in the shared visualization workspace and selected public DNS proof is copied with this packet.

Jira final publication/readback: SCRUM-166 comment10123 (In Progress), SCRUM-168 comment10124 (In Review), SCRUM-169 comment10125 (To Do), SCRUM-174 comment10126 (In Progress). All four bodies were read back exactly; statuses/assignees were preserved. [Readback receipt](stripe-evidence-20261108/private-onboarding/jira-final-readback.json).
