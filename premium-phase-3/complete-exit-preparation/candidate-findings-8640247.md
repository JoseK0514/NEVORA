# Candidate findings

## IS-RC-UPDATES-AUTH-01 — P2

Static exact-source finding on `8640247be632ee6382c68b3b1ae3bbed532a5d65` (Claude4aaa plus exact candidate33); no browser reproduction claimed. Both Employee and Manager Updates list modes are affected.

`src/lib/communications/client.ts:12–17` preserves401/403 as `httpStatus`; `parseCommunicationLifetime()` maps401 to unavailable reason `session_ended`,403 to `access_denied`. `src/components/employee-updates.tsx:77` passes the reason verbatim. Its View at `:53,56` recognizes only `access_denied`:401 therefore becomes generic “Couldn’t load updates”/Try again with no Sign in;403 falsely says “Your session ended”. This is an integration regression in the candidate TC-B16 change, rather than a new source-owner finding.

Historical late45 proposal `IS-RC-UPDATES-AUTH-01.patch` (not applied to combined33) recognizes both reasons in the View, says “Your session ended” for401 and “Access changed” for403, and offers real Sign in for both.503 remains a retry. The historical proposed tests cross the parser-to-View contract for both modes; they have not been executed or applied to combined33. Adjacent WR14 patch separately controls primary button styling and hides redundant Refresh. Required fresh browser checks: read401/403/503 in both list modes, both engines,390/100 and320/200.
