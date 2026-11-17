# Disabled device alerts Navigation review

WATCH · REQUEST_CHANGES. MEDIUM at scripts/phase-e-navigation-browser-scenarios.mjs:254–258. The selector checks uniqueness only after filtering the legacy presentation to its expected disabled state. A disabled Direction B view plus a visible enabled legacy view would still report one, with legacy actions outside the assertion scope. Count both structural renderers without filtering by state, then require legacy data-device-state=disabled when selected. The explicit action regex omits Retry turn off, which invokes onTurnOff, and Add to Home Screen, which invokes onInstall. Both disabled views have no visible device-action buttons. Check that outcome in their device content. Keep the Back link available.

The positive title/chip and local notifications explanation match EmployeeAlertsB in src/components/employee-b/account-b-client.tsx:181–208. The legacy title and paragraph match src/components/employee-mobile/device-alerts.tsx:19–32. Both views receive the same state at lines 68–70; responsive CSS hides companion content. The predecessor browser failure report for navigation-corrected-1 shows the exact hidden heading and 15-second timeout. Profile/inbox guards and runtime listeners are untouched.

Compared 4a757bb3f to 88e256af0. No HIGH, CRITICAL or LOW findings. Previously consulted remove-ai-slops/programming perspectives favor an independent state assertion over prefiltering to the passing case. No heavy suite or tracked edit.

## Follow-up at 9d04f7a7f

CLEAR · APPROVE. The structural selector now counts both visible browser renderers before evaluating disabled state. The legacy branch requires its disabled marker; the Direction B branch requires its own exact disabled message, Unavailable chip and in-app explanation. Counting all visible buttons within the selected renderer also catches retry-turn-off and install controls. The Back link remains available.

The notification row now requires the exact guarded href containing the encoded fixture notice ID. The server projects that path only for a deliverable, current, unexpired notice with an allowed destination (portal-notification-list.server.ts:79–80). The browser list carries item.href; its client click rechecks the notification open through an authenticated read before navigating (employee-mobile/messages.tsx:46). The test still clicks the real link, checks the final request ID, tab=my and request hash, verifies stored private text is absent, and compares read_at before and after. No remaining findings in the bounded diff. No heavy suite or tracked change by the reviewer.

### Downstream source comparison at 9d04f7a7f

The alert and notification diff remains CLEAR. Four MEDIUM pre-existing driver issues affect later scenarios.

- At line 384 the paused profile must show four redacted values. The Employee ID joined Name, Locations and Time zone in employee-mobile/profile-view.tsx lines 25–28.
- At line 428 the Owner waiting row exposes Decline and a staffing-dependent Approve or Review. Select the real primary row link by its exact pending request href and q-row class, and retain the focused form, native approval, toast and persisted decision. See time-off-waiting-list.tsx lines 42–49 and 69–72.
- At line 428 the Employee's visible decided row uses a link with the exact requestId and filter=decided and an Approved chip. The old ID points into retained legacy markup. See employee-b/timeoff-b.tsx lines 57–61.
- At line 449 the labeled Reason (optional) textbox is a three-row textarea with maxLength 250. Preserve the native text entry, no submit and keyboard traversal. See employee-mobile/timeoff.tsx line 94.

The editable and closed-week phone Availability controls at lines 432–436 match employee-mobile/availability.tsx lines 52 and 64–100. The width condition admits only the phone form in the 390px mutation scenarios. This continuation used source inspection only.

### Continuation at 19d91065d1835ad24fef489573f22bc5a35ea159

CLEAR / APPROVE for the diff from 9d04f7a7f. CRITICAL, HIGH, MEDIUM and LOW findings remaining in this diff: none.

The paused-state assertions at driver lines 384–389 check four exact labeled placeholders in both presentations. The visible B fields, including the paused Employee ID, match account-b-client.tsx lines 58–63. The keyboard path at line 454 selects the real maxLength=250 textarea in employee-mobile/timeoff.tsx line 94 and retains native focus and key input.

Owned-app-fixture.ts lines 65–74 assign and publish actor A's source shift on the submitted source date. The amber conflict at driver line 433 therefore exercises the conditional Review link, one Decline and no direct Approve in time-off-waiting-list.tsx. The native primary-row click still opens the exact request, and the protected decision, readback, toast and database assertions remain. Employee readback now checks the visible decided row by exact request ID, filter and current Approved chip.

Consulted the programming and remove-ai-slops review criteria. The independent fixture and observable UI and persisted outcomes supply meaningful failure conditions. No production changes or needless new test abstraction. No heavy suite run in this review. Browser results remain a separate gate.

### Lead profile entry at 133ab1e8b7f18809cb9d7a0815ca39e5fa0d789e

CLEAR / APPROVE. No CRITICAL, HIGH, MEDIUM or LOW findings. Driver line 248 counts the exact device-alerts href structurally and separately while visible. Profile page.tsx line 14 derives the Lead prop from the authenticated role. EmployeeProfileB lines 78–81 render exactly one such link in the Lead card. Employee-b.css line 167 hides the card by default and employee-b-desktop.css lines 67–69 restore display at 768px. The destination still independently verifies its disabled presentation and zero visible device-action buttons. The change makes no activation claim.

Inspected navigation-corrected-4 per-cell JSON: Chromium Employee 320 passed, Lead 375 failed the predecessor's zero total count with one actual link. The programming and remove-ai-slops criteria found no unnecessary production logic or tautological test. Reviewed source only. A passing full replay at this revision remains unverified.

### Proposed Owner admission on navigation-corrected-6 source

WATCH / REQUEST_CHANGES. MEDIUM in proposed-owner-review-admission.patch at the owner-login call site, new hunk starting at line 444. After successful sign-in directly into the pending list, the call site immediately hard-navigates to the same URL. Approval assertions consequently use a second document, and departure can interrupt the first document's staffing read. Remove that repeated goto and settle and exercise the seeded row on the admitted page. Admission already retains the network-idle wait.

Response listeners are installed before the native click. A single monotonic 15-second deadline covers route, completed successful shell response bodies, and visible list. Diagnostic state is initialized before the first login. The route and unroute share their predicate reference. Existing default logins remain intact. The earlier 390px failure points to login's own network-idle at 133ab1e8b line 43. Its saved login attempt failed on /app; the exact request preventing idle remains unidentified.

CRITICAL, HIGH and LOW findings: none. Programming and remove-ai-slops perspectives identify the redundant second navigation. Reviewed the external proposal only.

### Applied Owner review admission at 90c2c0aa9d81e5f7b635278942d91e97ae073507

CLEAR / APPROVE against cb5cf5c6c. The previous MEDIUM is resolved. The Owner's real sign-in lands on the exact pending requests URL. The original network-idle check, three completed 200/ready shell responses and visible waiting list share the original 15-second bound. The seeded conflict and native approval now follow in that same document. The subsequent navigation back to the pending list follows approval and independently checks that the approved row has left it. Default Home login checks, refusal and persistence assertions remain intact. The ownership note correctly distinguishes the failed Owner login wait from the unidentified request preventing idle.

CRITICAL, HIGH, MEDIUM, LOW: no open findings in this diff. The programming and remove-ai-slops perspectives identified no further redundant navigation or implementation-only assertion. Source review only; runtime acceptance requires the separate replay.
