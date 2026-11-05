# Native account setup — November 5, 2026

Owner: Codex/root. Scope: Apple/Xcode and Google/Firebase account preparation for the approved Employee/Owner internal beta. This records observed portal state; it is not device, provider-delivery, signing or release certification.

## Google Play

- Company account: `support@furbrandpr.com`; organization: VELANI LLC.
- Developer account ID: `5727569194145379847`.
- Jose reported paying the registration fee and completed identity/organization document steps directly in Google. Codex did not pay, obtain document files or audit a payment receipt.
- Saved About you details show **Trader** and **Website verified** for `https://www.thevelani.com`. Jose completed these declarations/verification through the UI. Codex's earlier trader review and Search Console property draft were not submitted and were closed after the saved states were verified. No DNS or website-content change was performed by Codex.
- A fresh home page offered **Create your first app**. The created app dashboard's latest full accessibility state has no account-setup publishing notice. Individual document-review decisions were not separately inspected; do not infer more than these observed states.

Created app record:

| Field | Observed value |
| --- | --- |
| Name | NEVORA Development |
| Package | `com.velani.nevora.development` |
| Play app ID | `4975670290730158697` |
| Type | App |
| Download price | Free |
| Default language | English (United States), en-US |
| Result | App dashboard visible; release setup still required |

[App dashboard in the company Chrome session](https://play.google.com/console/u/0/developers/5727569194145379847/app/4975670290730158697/app-dashboard).

Google confirmed **Package name available** before creation. Jose then explicitly answered **“I confirm all three declarations; create the app”** to the prepared record and its Developer Program Policies, Play App Signing Terms and US export-compliance certifications. Codex checked the three approved declarations and submitted Create app; the resulting **Dashboard | NEVORA Development** was observed. This records Jose's declarations, not a new independent legal or policy audit.

Codex did not select or explicitly generate/export a signing key; signing-key configuration has not been inspected. No binary was uploaded, no release created, no testers invited and no public/internal distribution performed. The record uses the current development identity; it does not select a production package identity.

The embedded verification flow initially produced overlapping dialogs and unavailable automated controls. Standard `/Applications/Google Chrome.app` successfully exposed the document upload form after Jose signed into the company account. Chrome was brought to the foreground for Jose's direct submission and left on the new app dashboard. Do not repeat the registration payment or document submission simply because an old tab retains a stale banner.

## Firebase

- Project: **NEVORA Native Development**, ID `nevora-native-development`.
- Company account accepted the approved Owner invitation after Jose explicitly accepted Firebase Terms for that account. The original owner remains; no owner removal was authorized or performed.
- Spark/no-cost plan observed; no billing upgrade. Google Analytics unlinked during setup.
- General settings confirm Android app **NEVORA Android Development**, package `com.velani.nevora.development`, under the company session.
- Two earlier config-download attempts timed out. No local downloaded configuration, server credential, new SDK dependency, enabled native enrollment or delivered FCM notification is claimed. Existing pinned dependencies, default-off flags and backend/session authority remain unchanged.

## Apple

Last observed: **VELANI LLC (Pending)**, **Your documentation is in review**. Xcode 27.0 (27A266a) is installed, NEVORA's project is open, and Jose's account is signed into Xcode. It exposes a **Personal Team**, with **0 Provisioned Devices**. The organization team, signing identities and TestFlight access remain unqualified pending enrollment/configuration. No reenrollment or Apple payment was performed by Codex.

## Evidence and next gate

Private UI proof is outside Git at `/Users/josek0514/.codex/native-runtime/nevora-account-setup-20261105`:

- `google-play-nevora-development-created.jpg`
- `firebase-android-app-registered.jpg`
- `apple-enrollment-pending.jpg`
- `xcode-personal-team.jpg`

Other prepared-review screenshots in that directory may contain business contact information. Do not copy them or identity/contact details into repository evidence. No password, OTP, identity document, payment credential or signing private key is stored here.

Product scope remains the Employee/Owner internal beta using the development identity. Engineering retains the existing shared UI and provider architecture. Security retains default-off delivery, protected credential custody and isolated test data; governance retains the source-inventory, hosted/device and distribution gates. No waiver or production authorization was requested or inferred.

Next: select protected development signing/provider custody and an approved isolated HTTPS/backend/database environment; prepare the signed candidate and qualify controlled physical-device workflows. Actual enrollment/sends and internal upload/distribution still require their corresponding explicit authorization. Apple organization signing additionally awaits enrollment approval. Phase3 remains in progress; source inventory reconciliation remains required before development integration.

Only handoff documentation changed locally. `git diff --check` is the applicable repository check; application tests/builds were not rerun for these account/UI changes. No application code/configuration, push, merge or deployment occurred.
