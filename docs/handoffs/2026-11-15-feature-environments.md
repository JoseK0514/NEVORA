# Product feature environment observations — Nov 15

The typed opt-in registry is `src/lib/feature-flags.ts`. Only exact `true` enables a boolean. Origins, admission/workspace modes, credentials, schema readiness and role authority retain their existing independent validation. A true flag is not proof of a healthy transport or an authorized release.

| Capability | Environment variable | Checked example | Local synthetic evidence | Hosted development | Main/production |
|---|---|---|---|---|---|
| Statements/payroll | NEVORA_PAYROLL_ENABLED | false | Existing import-model tests; customer activation held | unobserved | unobserved |
| Commerce gate | NEVORA_COMMERCE_ENABLED | false | Access, authority and billing-status tests | unobserved | unobserved |
| Commerce API | NEVORA_COMMERCE_API_ENABLED | false | Hosted-adapter configuration tests only | unobserved | unobserved |
| Onboarding | NEVORA_ONBOARDING_ENABLED | false | Configuration tests | unobserved | unobserved |
| Onboarding provider | NEVORA_ONBOARDING_PROVIDER_ENABLED | false | Configuration tests | unobserved | unobserved |
| Provisioning worker | NEVORA_PROVISIONER_WORKER_ENABLED | false | Runtime remains separately validated | unobserved | unobserved |
| Onboarding mail | NEVORA_ONBOARDING_EMAIL_ENABLED | false | No external send | unobserved | unobserved |
| Invitation delivery | NEVORA_INVITATION_DELIVERY_ENABLED | false | Owned loopback SMTP/database capability tests | unobserved | unobserved |
| Mobile access | NEVORA_MOBILE_ACCESS_ENABLED | false | Registry and existing configuration tests | unobserved | unobserved |
| Mobile support | NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED | false | Still requires mobile access too | unobserved | unobserved |
| Owner advisor | NEVORA_OWNER_ADVISOR_ENABLED | false | Still requires independent provider/data approval | unobserved | unobserved |
| Punch API | NEVORA_CLOCKER_PUNCH_ENABLED | false | Still requires configured clocker origin and PIN key | unobserved | unobserved |
| Legacy clocker renderer | NEVORA_CLOCKER_UI_V2 | false | Still consumed by current development source | unobserved | unobserved |
| Public-page web analytics (added Nov 18) | NEVORA_WEB_ANALYTICS_ENABLED | false | Allowlist/redaction and flag tests; also needs Vercel project Web Analytics and counsel-reviewed policy | unobserved | unobserved |

The example is checked by `src/lib/feature-flags.test.ts`. It does not describe a deployed environment. This chat has not read or changed hosted flag configuration; every hosted value above is intentionally unobserved. Populate those cells only after the owning hosting service identifies the exact deployment/environment and returns a safe nonsecret flag observation. Never copy a complete environment or secret values into this table.

`.env.example` explicitly closes onboarding admission and leaves commerce origins blank. The registry preserves current admission defaults in code; a configuration example does not silently change legacy runtime behavior. The legacy renderer flag remains documented until Claude's reviewed UI integration establishes its removal. Historical Oct 30 evidence is unchanged.

Payroll calculation mode is now enforced locally at service, worker, native capture/financial-write and capability boundaries. The checked example is `external`; absent or invalid modes select external. Hosted calculation mode remains unobserved. Feature enablement must not accidentally reactivate native calculations because native database tables exist.

Before development acceptance, verify the current flag matrix, delivery transport, exact combined UI/backend source, CI and hosted behavior. Promotion to main/production still requires Jose's approval. No feature activation, real email or paid call was made by these tests.
