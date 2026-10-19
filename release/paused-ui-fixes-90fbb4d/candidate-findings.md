# Candidate findings before the final correction

Exact immutable source `90fbb4de7dde5c6d0661e74cec3340459a7a10c3`. Fictional loopback preview; every tested mutation held/answered in the browser, none reached the application. This report records observed defects, not final acceptance.

| ID | Severity | Measured state | Cause and minimum correction |
|---|---|---|---|
| IS-RC-DELETE-01 | P1 | Manager, Chromium, 320/200, 1440/100/200 and 844/100/200: Enter on Delete sends one intercepted POST; pending native disabling moves focus off the button. The later repeated-key snapshot records MAIN#main-content. At320/200 the button holds248×88px, so this is distinct from the repaired size defect. | `src/app/app/schedule/edit/delete-shift-button.tsx`: retain focus with `aria-disabled` and refuse pending clicks. Keep the existing ActionForm synchronous capture guard (`guardSingleSubmit`) so repeated Enter/click sends no second operation. Recheck both engines, double activation and failure recovery. |
| ST-WA-7 / ST-WA-8 continuation | Existing P1 repair | Reserved geometry holds, but at320/200 the shorter pending text sits22.5px above the button centre. Swap has the same visible detail. | Centre grid items inside the existing label reservation; preserve intrinsic reserved size. Fold into each original finding commit before publication. |

Evidence: [completed cases and assertions](targeted-states.json), [case log](targeted-run.log), and matching `crops/` files. The first changing-accessible-name locator attempt is preserved separately under `attempts/`; it is a harness failure and does not substantiate these findings. This report uses only later completed measurements.

Measured focus clarification (runtime inspector): the initiating Delete button has `focused:false` and `disabled:true` in every completed Chromium pending sample. The later screenshot snapshot records `MAIN#main-content` as active after the repeated Enter probe. These records prove focus leaves Delete; they do not establish BODY as the element immediately after native disabling. At 320×844/200%, both idle and pending bounds are x36, y631.515625, 248×88px. The pending text range is y632.515625–673.515625, placing its centre 22.5px above the button centre. Five Chromium samples cover 320/200, 1440/100/200, and 844/100/200; all geometry deltas are zero.

Additional completed Chromium candidate findings:

| ID | Severity | Reproduction and measured result | Minimum correction |
|---|---|---|---|
| ST-RC-CALENDAR-01 | P2 | Employee, 390×844 at 100%, Profile calendar disclosure, keyboard Create link with its POST held. Idle bounds x52/y457.5, 128×52px; pending x52/y457.5, 112×52px. Width shrinks 16px. Focus, single-operation protection, exact-command retry after failed/newer reads, and HTTP401 recovery pass. | Reserve both Create/Replace and Saving labels in the same centred grid. Preserve operation identity and current busy guards. |
| ST-RC-CORRECTION-01 | P1 | Employee, 390×844 at 100%, My time → missing-time correction, valid fictional start/end/reason, keyboard Send request with POST held. Idle x51/y720, 143×44px; pending x51/y768, 117×44px. The new Try again control above the form adds 48px while Send narrows 26px, moving the pending action into the bottom navigation area. Focus, double-activation guard and HTTP401 recovery pass. | Keep the first-send retry control hidden until that send settles, while preserving an already visible retry during a retry. Reserve both Send request and Sending labels. |
| ST-RC-ACK-01 | P1 | Employee, 320×844 at 200%, Updates detail after checking reviewed, keyboard Acknowledge with POST held. Idle x36/y620.6875, 272×107px; pending x36/y671.6875, 258×64.5px. The action shrinks 14px horizontally and 42.5px vertically, then moves 51px. Pending focus, one intercepted POST despite repeated activation, persistent polite status region, locked review checkbox and HTTP401 recovery pass. The 390/100 sample holds its geometry. | Reserve both Acknowledge and Confirming labels so wrapping and intrinsic button dimensions remain stable. |

Supporting crops: [Calendar pending](crops/chromium-calendar-retry-auth-AUDIT-E-390x844-t100-default-create-pending.png), [Correction pending](crops/chromium-correction-auth-AUDIT-E-390x844-t100-default-send-pending.png), [Updates pending at 200%](crops/chromium-updates-ack-auth-AUDIT-E-320x844-t200-default-acknowledge-pending.png). Exact numeric boxes, assertions, safe request metadata and post-failure screenshots are retained in `targeted-states.json`.

Availability continuation under ST-P3-24: Chromium 320×844/200% holds the reserved 248×132px bounds in both attempts, but Saving… is centred 44.5px above the button centre (`align-items: normal`). The 844×390/200% sample is centred. Centre the existing reserved label grid without changing its reservation. The failed draft, explicit Reset, feedback reveal/focus, second identical failure, and single-operation guard otherwise pass.

Timecards continuation under IS-78: completed 390×844/100% hidden/offline cases clear stale count and lock Refresh/View period, including programmatic submit. A mocked read HTTP401 clears private content and offers a real Sign in link, but says “Sign in again to view your timecards.” rather than the explicit ended-session distinction. Preserve the HTTP401 reason in that message.

Harness scope: a blocked `POST /__nextjs_original-stack-frames` in the Calendar case is a Next development diagnostic request, not an application mutation. No tested application mutation reached the server. Timeoff landscape and initial Management Profile attempts that did not reach their setup precondition remain incomplete and are excluded from product findings.

| ID | Severity | Measured state | Minimum correction |
|---|---|---|---|
| TC-RC-ASSISTED-01 | P1 | Manager and Owner, Chromium 390×844/100%, `/app/account-recovery`, ready legacy controls `#assisted-employee` and `#assisted-attestation`: both have a 1px rgb(215,217,220) edge on rgb(255,255,255), giving **1.4143:1** contrast against the required 3:1. No recovery code is requested. | Scope `.assisted-field input` and `textarea` to the existing `var(--nv-field-border)` token. Keep all labels, validation and recovery behavior. |

TC-RC-ASSISTED-01 concerns the currently rendered legacy assisted form. TC-WC-28 is related in contrast category but addresses future Wave C kit markup; its separate source repair is not a runtime pass for these candidate legacy controls. Evidence: the `field-contrast` records and Manager/Owner ready crops in this exact candidate run.
