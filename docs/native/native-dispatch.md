# Native notification dispatch

The native worker uses separate native installation/delivery tables and preserves Web Push state. Provider acceptance does not prove device delivery or display. Dispatch is bounded to the existing batch/concurrency/lease/attempt/lifetime policy. Native Retry-After can exceed an hour; a provider delay reaching source expiry expires the delivery instead of sending early.

Manual invocation after explicitly approved environment/provider configuration:

```sh
npm run notifications:worker -- native-dispatch
```

Default configuration returns `disabled:true` before database/provider IO. No daemon, scheduler or feature flag is installed or enabled here. Native registration, provider readiness, delivery opt-in and test-recipient allowlisting are independent gates. Existing business notification production still depends on the application's `PUSH_FEATURE_ENABLED`/environment/origin and Web Push public/encryption readiness; native dispatch does not silently change those producer gates. `NATIVE_PUSH_ORIGIN` must equal the configured portal origin. Test dispatch requires its native test-delivery flag and explicit account allowlist.

Configure each platform's intended sender before dispatching that platform's records. If only one provider is configured, the other platform returns terminal `provider_configuration`; it does not fall back to another provider, environment or Web Push token. Provider credentials and token encryption keys belong in the approved secret store, never in this document or app bundle.

The adapter obtains its server credential before the attempt-bound handoff callback. The callback repeats current canonical source/recipient/preference/expiry/quiet-time checks and installation/browser-session/generation admission. Token invalidation and all delivery completion use the current generation and lease. Network acceptance followed by an unknown database commit retains its lease for bounded recovery; retries are not exactly-once delivery.

November 4 verification uses disposable loopback PostgreSQL, fictional Employee/Owner accounts, ephemeral signing keys and fake APNs/FCM/OAuth IO. No real provider socket, customer message, production migration, external account setting, signing or distribution is part of this evidence. See `evidence/2026-11-04/phases-1-2/progress.md` and `server-verification.json`. Platform capability integration and the older Android accessibility gate remain separate work.
