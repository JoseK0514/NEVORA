# Sandbox credential and reconciliation follow-up review

Reviewed detached 7c0bf76a33bb8c7e32393836f33f24bea325c3ce against aa296e0fd34a7e10b2ad9e221012fa3d6070fe76. The six-file Git diff matched .omo/evidence/neon-credential-acceptance-20261108/review.diff byte for byte. No ULW plan or review notepad was supplied. All probes used synthetic in-memory configuration. No provider requests were made.

## Critical

None found.

## Important

- HIGH — services/hosted/neon/capabilities.ts:21 and :36. Unknown credential names escape both readiness enforcement and diagnostics. POSTGRES_URL carrying a username and password matches neither expression. I passed this alias alongside all correct inert overrides to createWebhookHandler and received HTTP 400 invalid_signature. An active PGPASSWORD on the same route returned HTTP 503 not_ready. The receiver can thus process signed traffic while holding an extra database credential. Check every deployment-supplied name against a positive role policy and distinguish verified ordinary runtime metadata. Test a credential-bearing PostgreSQL alias outside the existing naming patterns. The regex predates this change, but the new diagnostics duplicate the gap and the explicit credential-policy requirement remains unmet.
- HIGH — services/hosted/neon/capabilities.ts:10–16, services/hosted/neon/README.md:22. The published deployment-name allowlist includes NEON_TELEMETRY_TOKEN and NEON_TELEMETRY_ENDPOINT. A retained user-defined override of these passes precisely the documented control intended to keep the telemetry credential provider-injected. I confirmed approvedCapabilityNames('stripewebhook').has('NEON_TELEMETRY_TOKEN') returns true. At deployment, distinguish the user-variable policy from runtime injection and reject operator-defined overrides of all six provider-owned names. Runtime name checks alone cannot attest origin.
- MEDIUM — services/hosted/neon/capabilities.ts:22. Undefined skips the exact-value check. Removing every inert override from the otherwise bound receiver still reached HTTP 400 invalid_signature. This does not demonstrate a usable credential when the variables are absent, but readiness cannot establish that the required deployment overrides exist. Require the documented sentinels on every hosted role and exercise omission through the HTTP entry point.
- MEDIUM — services/commerce/stripe.ts:380 and :388. The cursor writes expires_at but the reader uses its key regardless of expiry. A sweep after seven idle days can resume from the stale position and renew it for seven more days. A malformed expired key continues to fail every tick. No tracked commerce cleanup consumer was located. Honor expiry when interpreting the locked existing row and prove a resumed sweep starts at the first eligible business with the old row still present. The current grants are sufficient to overwrite that row.
- MEDIUM — services/hosted/neon/capabilities.test.ts:7. Both the accepted environment and the entire negative-case list derive from the production override map. Dropping an alias from that map drops it from all these cases and changing a sentinel to an unsafe value changes the expected accepted environment in lockstep. Use an independent synthetic fixture of the observed provider names and expected sentinels.

## Minor

- LOW — services/hosted/neon/capabilities.ts:21 and :36. The detector is duplicated for enforcement and diagnostics. A shared name-classification predicate would avoid different answers for newly introduced credential aliases.

## Evidence

Inspected the executive operating model, engineering/security/governance guidance, plans and handoffs, both `programming` and `remove-ai-slops` skills, the full diff, normal handler gates, principal grants, schema, tests, cursor selection and reconciliation effects. The skill checks found the implementation-mirroring test and duplicated classifier above. The restricted-role real-Postgres test covers a meaningful production failure, rotation, wrap and continued audit-read denial. The validation of the stored cursor checks an actual SQL boundary. Under cooperating reconcilers the selection transaction serializes cursor updates with its advisory lock and commits its work before per-business network operations. Existing principal grants suffice. The HTTP entry-point probe exercised local router and configuration decisions only.

Evidence under .omo/evidence/neon-credential-acceptance-20261108 includes reconcile-grants-red.log (audit permission denied), reconcile-final-green.log (74/74), injected-capabilities-green.log (78/78), receiver-config-red.log, reconcile-types-final.log, and reconcile-lint-final.log. The final root log showed invocation without completion when inspected. No test suite was rerun for this review.

## Declined to judge

- Actual deployment user-variable names, values, provenance, live credential permissions or provider-internal telemetry token scope. No secret store inspection or external calls.
- Hosted receiver delivery, signed replay, queue retries, trial activity, rollback state, actual function schedules, platform proxy authentication and newest hosted reconciliation. These are separate operational checks. This report validates only the code and local evidence specified above.
- Final root-suite completion, production release authorization, independent certification, real-money billing/tax, customer communications, full A/B onboarding journeys, expansion to other environments and production performance/load or SQL query plans.
- Unchanged UI, SSO, Claude integrations and earlier out-of-range changes except when necessary to establish normal entry and role behavior. No review of external service billing, infrastructure configuration outside the tree, or third-party provider internals.

## Verdict

codeQualityStatus BLOCK. recommendation REQUEST_CHANGES. Blockers are an undetected credential-bearing environment alias and a deployment-user policy that accepts provider-only logging credentials. The missing exact override and unenforced cursor expiry also need resolution to meet the stated acceptance criteria. No production or independent certification is implied.


## Executor dispositions after this review

The report above is retained unchanged. Its BLOCK verdict describes 7c0bf76; no independent re-review or release certification is claimed. Codex addressed the findings in dd47ca674 and the observed TERM metadata adjustment in 4ba940075.

| Finding | Disposition and evidence |
| --- | --- |
| Unknown database/credential aliases | Positive deployment-name and runtime-name policies replace heuristic credential regexes. POSTGRES_URL and arbitrary unknown names fail before signed enqueue. The shared classifier also powers value-free diagnostics. |
| Provider-only logging credentials in deployment policy | approvedCapabilityNames excludes provider-owned branch/execution/logging variables. deploymentCapabilitiesAllowed rejects them; runtime injection is checked separately. Actual four-role deployment name inventories match their explicit private snapshots; no provider token was read/copied. |
| Missing inert overrides | Every exact sentinel is mandatory on every role. Eleven independently specified omission cases fail through the HTTP handler before enqueue. |
| Expired retained cursor | Locked SQL read checks expires_at using the database clock, restarts at the first eligible business and overwrites the retained row. Both valid and malformed expired rows fail before the fix and pass afterward. Active malformed cursors still fail closed. |
| Implementation-mirroring fixture | Independent expected sentinel maps exercise accepted values, active aliases and omission; the production map must equal the independent fixture. |
| Duplicate classifier | One positive runtime-name classifier drives enforcement and diagnostics. |

Final application source: 4ba940075a323cae6f2ba0c036991257deb57325, tree e9a5ed92d7bc86b499f89bc848fb2da08d105055. Handler/configuration tests92/92, owned commerce/PostgreSQL+SDK76/76, integrated onboarding-commerce17/17, root11258 passed/857 skipped/55 pending/0 failures. Types/lint pass. Four actual ZIPs verify70 files including62 canonical SQL assets and reject canonical tampering. No assertion, timeout, grant, schema or SSO control was weakened.

Hosted receiver delivery and worker evidence are documented separately in neon-credential-acceptance.json. Provider-internal logging credential scope remains unattested and is a production gate. Full A/B Owner, private provisioning/mail/ingress, Claude UI and independent release acceptance remain open.
