# App Privacy / Data safety working draft

Owner: Codex/root; VELANI LLC/Jose approves final declarations. **Not submitted or legally certified.** Scope includes the hosted portal shown inside the native app and any enabled SDK/provider, not only Swift/Java collection. No analytics, replay or provider delivery was enabled during preparation. An empty native collection declaration must never be translated into “no data collected.” The packaged iOS manifest currently covers required-reason/tracking metadata only; it omits collected-data keys pending final environment review.

## Data inventory and draft form mapping

| Data used by the product | Source/evidence | Draft disclosure and open verification |
| --- | --- | --- |
| Name, email, phone, employee/workspace IDs, account role and profile | `src/lib/legal/policies.ts`, employee schema, session/account routes | Contact info / User IDs, linked to the user, app functionality and account management. Workplace may supply these; not all fields are optional. |
| Availability, shifts, time-off/exchanges, attendance, timecards and approval history | Current Employee/Owner portal and authoritative server tables/actions | App activity / Other data types as the final forms define; linked, required for enabled workplace functions. Workplace labels/assigned locations are not permission-based device GPS collection. |
| Pay statements, wages, payroll calculations and exports when enabled | Current payroll/time/pay UI and server document authorization | Financial information, linked, app functionality. Audit the final enabled employee/payroll profile fields for physical addresses, tax identifiers or payment-account data before final selection; do not infer absence from a few screenshot fixtures. No bank/payment integration was added here. |
| Workplace updates, notes, requests, acknowledgements, support content | Communications/actions and support routes | User content and associated identifiers, linked for authorized workplace functionality. Review any free-text personal/sensitive content supported by the shipping features. |
| Session/auth/security/access information | Cookie session server; native compatibility route emits no profile/token | User/account identifiers and security-related activity. Verify actual application/hosting logs, request metadata/IP, redaction, destinations and retention in the chosen environment before final diagnostic/usage selections. Server-side web data remains in scope. |
| Push installation key fingerprint, installation generation and provider token **only when explicitly enabled/enrolled** | `native/ios/App/NativeCapabilitiesHandler.swift`, Android capabilities/runtime, `src/lib/native-push` | Device/installation identifiers and notification delivery functionality, linked through server authority. Permission is optional. Actual APNs/FCM enrollment/delivery remains unverified and disabled. Declare according to the exact shipping configuration and SDK documentation. |
| Passkey credential/public-key data where enabled | Existing web/server passkey implementation | Account authentication identifiers. The app does not receive Face ID/fingerprint templates. Association and real-device passkey flows remain a gate. |

No advertising, cross-app advertising tracking, location sensor, contacts, camera or microphone feature was enabled by this preparation. This is a bounded implementation statement, not proof of provider-side settings or deployed instrumentation. Apple/Google form vocabulary differs: validate each mapping against the actual current questionnaire and complete SDK data disclosures.

## Recipients and purposes

Existing policy operator/contact are VELANI LLC / `support@thevelani.com`. Source policy lists Vercel hosting, Neon database, transactional email and browser push services. Hosted resource selection, logging/retention and runtime email provider must be verified for the actual candidate; none was configured here.

Native APNs/FCM are separate transports. Before enabling them, review explicit Apple APNs / Google Firebase Cloud Messaging descriptions and Google Firebase SDK data behavior, then update the policy processor wording/declarations consistently. Proposed native addendum for review: “If you enable native app notifications, Apple Push Notification service or Google Firebase Cloud Messaging processes the app’s device registration and delivery information to provide those notifications. Notification previews use generic text; opening a notification requires current account authorization.” This is draft text, not a deployed policy change or a verified provider promise.

Workplace-authorized users can receive data according to roles. Evaluate the store’s definitions/exemptions for service-provider processing and user-directed sharing separately; do not set a blanket ‘no sharing’ answer just because there are no advertisements. No provider terms or final store declarations were accepted in this work.

## Permissions and platform metadata

Actual merged Release Android manifest was inspected:

| Permission | Purpose / behavior |
| --- | --- |
| INTERNET | Configured portal/backend network requests. HTTPS required in Release. |
| POST_NOTIFICATIONS | OS notification permission; contextual/optional, provider setup default-off. |
| ACCESS_NETWORK_STATE, WAKE_LOCK, C2DM RECEIVE | Firebase/AndroidX transport declarations in the merged artifact; declarations do not establish actual provider enrollment. |
| App-scoped DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION | AndroidX receiver protection with signature scope, not user data access. |

No camera/microphone/location/contacts/advertising-ID permission was found in that artifact. Backup and cleartext are false; Release is not debuggable. The launcher activity and its constrained HTTPS links are exported intentionally; the messaging service is not. Review merged components on every candidate, including dependencies.

iOS uses WebKit, UserNotifications and Security/CryptoKit platform services, with no third-party native SDK currently linked. Native permission prompts are notifications when configured/enabled. UserDefaults is used only for app-private opaque enrollment-generation metadata; CA92.1 is declared in the bundled privacy manifest. No App Group, tracking domain or cross-app tracking is configured. Inspect the final archive/SDK inventory and generate its privacy report before upload; omission of collection keys is not a no-data report.

## Retention, support and account deletion

Existing source policy facts are populated (policy version2026-11-04). They describe a30-calendar-day account deletion target, employer record-retention rules,90-day security/access-log retention,24-month privacy-request retention and seven-day database restore history plus restricted recovery snapshots. These are existing approved policy statements, not newly verified hosting/deletion operations or a native-staging backup guarantee.

Public source routes exist at `/privacy`, `/terms`, `/support`, `/account-deletion`; authenticated deletion is `/app/account/delete`. Actual app origin and public URL reachability are pending. The user reauthenticates, requests deletion, receives a reference and loses account/session access. This does not prove all data has already been purged. `docs/compliance/account-deletion-runbook.md` remains manual; live fulfillment, provider-token/installation revocation and external log/backup handling require an authorized operational rehearsal and traceable completion. Do not advertise automatic instant deletion. Support mailbox deliverability/access is not verified by a source email string.

## Final form gates

Before submission: reconcile actual data fields/features/providers; verify HTTPS/encryption and public URLs; prove the support/deletion process; complete retention and sharing answers; review age/content questions for the real workforce audience; inspect final dependency and privacy reports. For export questions, record actual OS TLS/signature/key-storage use and follow the current platform questionnaire—no exemption or legal certification is assumed here. No analytics/replay consent expansion is approved.

References: [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/), [Apple required-reason API values](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype), [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en), [Firebase Android data disclosure](https://firebase.google.com/docs/android/play-data-disclosure), [Google deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
