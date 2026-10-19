# Static browser fixture contracts

Pinned review source: `a21650de50374683d52e32b883d7f419d7344f22` (Claude `4aaa793` plus exact candidate 33 `b68f250`). **Preparation only.** [verify-static.mjs](verify-static.mjs) reads frozen source and decodes fictional protocol values in memory; it starts no browser/preview, performs no network request and changes no application data. The old de8 static result remains historical; the decoder/selector script must run again on this SHA after the hold. No current-SHA static protocol or browser result is claimed. It is not a rendered UI result.

## Request and reply boundaries

| UI | Browser request | Minimum consumer contract |
|---|---|---|
| Branding / Features | JSON POST `/api/workspace-presentation` | 401/403 ended session, 400 invalid, 409 conflict, Features 409 `{state:"busy",message}`; other successful status is accepted. Branding/Features actions are buttons outside a form. Only change one section in the repeat-activation case: changing words and modules intentionally creates two sequential operations. |
| Logo | JSON POST `/api/workspace-presentation/logo` | Success `{result:{assetId}}`; 400 may supply `message`; failed upload uses generic recovery. Logo GET stays loopback and needs a fictional image reply. No upload is sent to the server. |
| Company policies | JSON POST `/api/company-policies` | 400 invalid, 409 stale, 401/403 session; successful status accepted. Retained retry freezes fields and reuses the request. Custom mode needs threshold and valid company-local effective time. |
| Assisted recovery | JSON POST `/api/manager/account-recovery` | `{state:"issued",employeeId,proof,expiresAt}`; employeeId must equal the submitted ID, proof must match `[A-Za-z0-9_-]{43}`, expiry must parse. 401/403, expiry, blur and offline are separate states. Codes are fictional and never credentials. |
| Clocker receipt | JSON POST `/api/manager/clocker-recovery` | `{state:"ready",commandId,observedAt,validForMs,receipts}`; same commandId, valid timestamp, 1–15000ms, at most 100 rows. Each row has employeeId/name, action, time, tablet, location and timeEntryId. Empty is ready with zero rows. Invalid shape must become failed read rather than false empty. |
| Settings/Positions actions | Next Server Action POST to current route | `ConfigurationResult`: error/success/updatedAt. Held or locally aborted requests cover pending/failure; fabricated success uses the actual Flight action envelope below. |
| Break actions | Next Server Action POST | `{ok:true,breakType}` or `{ok:false,error,refresh}`. BreakType has id/version/name/category/targetMinutes/active. Create needs a nonempty Classification (`REST`, `MEAL`, `OTHER`). |
| Device actions | Next Server Action POST | `{ok:true,device,setup?}` or `{ok:false,error,refresh}`. Device includes id/name/locationId/version/state/lastSeenAt/enrollmentExpiresAt. Setup is `{code,expiresAt}`. REGISTER requires a Location selection; destructive dialogs must start on Cancel. |

[fixture-contracts.mjs](fixture-contracts.mjs) supplies these values and a `text/x-component` action envelope (`a` is a promised result; `f:""` means no router patch). On the old de8 preparation only, twelve result envelopes were round-tripped through the installed React Flight decoder without a browser. The build ID is omitted rather than fabricated. This validates serialization; live Next client rendering still requires a measured run.

## Browser-only list states

RSC **client-navigation** models may replace exact client-component props while preserving module/action references. Never rewrite HTML and then count a hydration mismatch as a UI result. `transformClientFlight` requires exactly one matching props model; absent/ambiguous matches are hard gaps. Eighteen synthetic model transformations passed old-source static checks; their current-SHA re-execution is held.

| Component | Typed props/state fixtures prepared | Explicit limit |
|---|---|---|
| Break types | initialTypes empty, mixed active/archive,60 long rows | Unavailable read is rendered by the server page before the client component; setting a fake `available` prop would test nothing. |
| Devices | initialDevices empty, all five device states,60 long rows; inactive locations | Unavailable read is rendered by the server page. |
| Positions | positions empty/large/mixed; available=false | UI has a real available flag, so the read-failure fixture can exercise its real branch. |
| Policies | empty/large/scope history with exact revision shape | Server read failure is outside these client props. |
| Branding | empty/large history and no logo | Server failure is outside these client props. Preview tabs and colour changes are local UI interactions. |
| Features | waiting Time off blocker (`timeOff`), unavailable payroll capability, module-off state | Server failure is outside these client props. The module ID is case-sensitive. |
| Locations | Native q/status query and unknown-location variants | First-run empty, server read failure and changed company vocabulary are server-rendered branches. A query no-match or invented client prop is not an equivalent proof. |

The server-only cases remain prerequisites for a faithful browser-response fixture or another root-reviewed local test mechanism. No server data or application/backend source has been changed to force them. They must be resolved and observed before a complete zero exit; this document does not waive them.

## Selectors and state probes

The selector registry is exported from `fixture-contracts.mjs`; source assertions cover all thirteen route/component families. Branding uses `#brand-hex`, `#brand-picker`, `#brand-logo-file`; it validates hex on blur. Features uses `input[name="word-preset"][value="retail"]` and has no required-field validation. Policies reveal `#policy-lateness-threshold` and `#policy-lateness-effective` after `#policy-lateness-mode= configured`. Positions distinguishes `#new-position-name` from the opened `.wc-editable` row. Recovery uses exact visible labels, with `#assisted-attestation` reserved for field-edge checks.

The standard jobs preserve normal views; policy form jobs additionally capture the held repeated send and body hashes for ST-14; forty recovery loading-back jobs capture both roles with from=settings. Four extra form jobs recheck ST-13 at 320×568/200 in both engines. Keyboard/disclosure and per-control idle/hover/focus observations are bundled with existing motion jobs. The pending/failure probes hold and abort every POST locally. No setting, Save, Add, archive, revoke, recovery, upload or sign-out operation reaches the server.

## Passive baseline collection

[after-check-collector.mjs](after-check-collector.mjs) uses the Phase3 collector model. Its only page hook is `Page.close`, called after the pinned unchanged checker executes `results.push(record)`. It adds no init script, route handler, early wait, click, style or measurement condition before the checker record. Original checker JSON is copied unchanged.

After the record, it collects geometry/type/colour facts for all 960 cells. [collection-policy.mjs](collection-policy.mjs) additionally captures top/middle/bottom viewports for the 240 required judgment cells. Scroll/capture changes happen only in that cell's closing phase. Collector hash, exact SHA, preview lineage, intended route and actual URL are recorded separately. A missing crop or collection error remains a supplementary gap even if the automated checker passes. Expanded disclosures, keyboard, hover/focus and mocked outcomes stay in active state jobs; passive collection does not pretend to cover them.

## Combined-source additions

The active probes record notice body clamp/scroll dimensions separately from the outer feedback scroll cap, Hub pseudo-element divider inset, and Branding history title/meta boxes. Claude’s inner clamp and candidate’s outer cap both remain. The first and repeated Policy sends are separate snapshots, preserving the same request body hash. WR-10 and ST-14 remain unapplied proposals and cannot be closed by their historical source status. New local AL-17/18, ST-18, WR-25, TC-28/29/30 repairs all require measured rechecks.

Initial fixture setup is an awaited ownership-verified beforeListen callback, using runtime_setup’s current generic pre-listen helper. It includes all base/payroll/extra accounts and optional large data, then canonical initial Branding history with default brand restored. It runs once per new database and never after inspection starts. No fixture has run during preparation.
