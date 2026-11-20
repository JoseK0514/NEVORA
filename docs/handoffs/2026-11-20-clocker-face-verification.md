# Clocker face verification backend handoff

Base Development source is `eb23572d63e037b3a7c239c7734e7ee98cb3ff09`. Migration `0077_clocker_face_verification.sql` is additive. The base migration order and generated bootstrap manifest include it. The current Development migrations `0075` and `0076` precede it.

Codex owns the backend and deployment. Claude owns the Owner and shared-tablet UI. Development acceptance starts with fictional data and one registered iPad workspace. Using employee data requires approval of the notice, retention and deletion procedures, the licensed model, and the pilot.

## Private UI contract

All calls are same-origin POST with the current session, `x-nevora-clocker: 1`, and private, no-store responses. JSON requests use `application/json`. Unknown and extra fields are rejected.

| Surface | Operation | Fields beyond `operation` |
| --- | --- | --- |
| Owner `/api/clocker/face-verification` | `policy` | None |
| Owner | `save` | `expectedVersion`, `enabled` |
| Owner | `enrollment`, `view` | `employeeId` |
| Owner | `request`, `approve`, `remove` | `employeeId`, `expectedVersion` |
| Tablet `/api/clocker/{location}/face-verification` | `self` | None |
| Tablet | `withdraw` | `expectedVersion` |
| Tablet | `skip` | `command: {commandId, verificationId}` from the original punch |

- The policy response has `version`, `enabled`, `available` and `alertsEnabled`. Use the latter two to distinguish unavailable and shadow mode from an available alerting service. Request a fresh policy or enrollment read after an uncertain response and use its version for the next write.
- The enrollment response has `employeeId`, `revision`, `state`, `expiresAt`, `canCapture` and `verificationActive`. The tablet's `self` read can include the current `notice` with `version`, `en`, `es` and `retentionDays`. Use the saved employee language. Offer Accept and Decline, keep the camera closed until acceptance, and use the server version that the employee read. Decline can use `withdraw` for the pending request.
- Send the accepted reference as a bounded JPEG body, 640px max dimension and 512 KiB max encoded size. Set `x-nevora-face-enrollment-version`, `x-nevora-face-notice-version`, and `x-nevora-face-consent: 1` alongside the normal Clocker header. Read back `captured`, then the Owner confirms the preview with `approve`. Use one-time preview object URLs and revoke them when the review closes. `view` returns a private JPEG or 404.
- If `verificationActive` is true, offer the employee a visible way to skip that comparison. Send `skip` after the ordinary punch succeeds and before sending its optional photo. The skip call is idempotent for that punch. If the skip cannot be confirmed, continue on the existing path that records the punch without photo evidence. The original punch owns the time receipt.
- Errors are `INVALID_INPUT` (400), `ACCESS_DENIED` (403), `CONFLICT` (409), and `UNAVAILABLE` (503). Never display a device or worker error as a mismatch.
- The Owner inbox returns type `CLOCKER_FACE_REVIEW` with the generic label **Punch photo needs review**. Its protected open route redirects to `/app/settings/clocker/photos/review?deviceId=…&commandId=…`. Wire that route to select the exact record using the existing Owner detail action. The browser should see the ordinary missing/expired evidence state if it is no longer available.

## Isolated evaluation

- The runtime uses the existing fictional staging photo binding and a dedicated 32-byte encryption key supplied through the existing secret store. The matching worker uses a separate workspace-bound Neon role. Grant it schema usage and execute on `clocker_face_worker(text,text,text,text,text,uuid,text,text)` only. It needs neither direct table reads nor write access. The app principal has no platform attestation or alert-insert privilege.
- Use `npm run clocker:face-worker -- --check` with an absolute `NEVORA_CLOCKER_FACE_PYTHON` and an absolute, read-only `NEVORA_CLOCKER_FACE_MODEL_MANIFEST`. The manifest contains `detector` and `recognizer` objects with absolute `path` and `sha256`, and the two evaluated thresholds `mismatchThreshold` and `matchThreshold`. The executable loads the hashed artifacts locally and prints the model revision. A normal scheduled invocation additionally needs the scoped `NEVORA_CLOCKER_FACE_WORKER_DATABASE_URL`, the face key and the existing staging photo binding. It produces only aggregate outcomes, maximum claimed queue age and cleanup counts.
- Benchmark candidate model files from the pinned [OpenCV Zoo snapshot](https://github.com/opencv/opencv_zoo/tree/48b10fa505aeb51fbd127fc60a5c660040e823b7). YuNet `face_detection_yunet_2023mar.onnx` has SHA-256 `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4`. SFace `face_recognition_sface_2021dec.onnx` has SHA-256 `0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79`. Preserve model rights and provenance evidence before hosted use. A successful model load does not establish rights or an operating accuracy rate.
- Stage the platform in shadow mode with `alerts_enabled=false`. Verify current photo cleanup attestation, scheduled face cleanup, bilingual consent, and custody of encrypted references and backups. Test physical iPads across representative people and lighting. Measure wrong-person misses, false alerts on genuine punches and the proportion without a usable photo separately. Compare the observed false-alert rate with the planning target of one per 1,000 genuine punches before proposing alerts.
- The Owner switch fences pending work and clears templates. The private cleanup worker continues while the switch is off and purges expired or inactive enrollment records. Keep it running if any enrollment remains. Before restoring a backup, keep the face binding disabled and reconcile expired and revoked enrollments from the authoritative deletion records. Activation and the worker cadence belong to the separately approved staging or pilot deployment.

## Release gate

The backend contracts and local verification are separate from the combined UI acceptance. Claude needs to complete the Owner enrollment and settings screens, tablet consent and skip controls, and exact-punch navigation. The physical-iPad evaluation and model rights review gate an employee-data pilot. Main and production require separate release approval.
