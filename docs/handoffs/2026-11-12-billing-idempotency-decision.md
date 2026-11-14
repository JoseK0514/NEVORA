# Strict durable billing operations — approved decision

Jose explicitly approved “Yes, implement the stricter rule” after a recommendation
that identical actor/request/key recover the original billing operation while a
changed actor, language, plan or action conflicts. This supersedes the intentional
legacy Checkout language/open-intent reuse behavior; keep historical tests/results
and qualify the new stronger contract. No replacement key may bypass an unresolved
provider action. No browser return or URL creation proves payment or entitlement.

Scope: existing NEVORA commerce Checkout, Portal and plan-change services, their
catalog persistence/least-privilege migration and fictional regression tests.
Preserve Cloud authority/account hardening, Step2 original trial and onboarding
recovery admission, approved Clocker continuation, existing recovery UI, original
customer/company bindings, plan policy and Tax-off default. No new UI or provider
activation is part of this implementation. Development publication remains owned
by the sole finisher and requires exact combined gates.

The request receipt must bind normalized accepted input, action, current server
actor and immutable installation identity. Reject unknown body keys and changed
actor/body/action for the same company/key with409. An identical completed retry
must use its stored result; an uncertain retry must retain original prepared
provider parameters/key and all prior outcomes. Do not recompute an intervening
plan/subscription/language as a new operation. Keep unrelated companies separate.

Persist each external mutation's parameters before calling it, including initial
customer creation. Retain results across process/reply/local commit uncertainty.
A post-provider authority failure withholds private presentation but must not roll
back an already obtained durable outcome. Recheck current actor and original
installation/customer/subscription binding around awaited work and lock waits.
Known terminal results, provider acceptance and unknown outcomes stay distinct.
Never delete/reset an uncertain operation or automatically produce a new charge,
subscription, customer, Checkout or Portal session to recover it.

Use existing server crypto, SQL locks and Stripe SDK. Technical creation/retry
lifetime is at most the existing one-hour billing handoff lifetime and never
extended by retries. A completed expired URL reports an expired operation;
unresolved expired work reports reconciliation required, with its receipt retained.
Stripe's API-v1 idempotency keys can be pruned after24hours, so provider retention
alone cannot authorize a later create. [Official Stripe reference](https://docs.stripe.com/api/idempotent_requests).

Prepare a reviewed additive catalog migration and current schema/principal grants;
application build/start must not migrate automatically. No production migration,
new resource/credential, real provider call/payment/send or hosted-packet extension
occurs during local implementation. Any final hosted schema step must be explicitly
reconciled with the original finite packet before effects. Main/production require
Jose's approval. Owner session-loss/reconciliation and historical old operations
without an actor receipt must fail closed rather than inventing attribution.
