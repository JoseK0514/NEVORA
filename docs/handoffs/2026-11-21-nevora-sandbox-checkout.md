# NEVORA Development Stripe sandbox checkout

The protected Development test on November 21 used Vercel Preview `dpl_duAxjN5GPcwZHJahXzCpry6C3bJk` from green Development commit `62d791ad702f6b9590f037e3de647062291d42b7`. The relevant billing code matched Development `1f6602cb94a8f54f87cbb3a12083c2bf7dd9ee78`. Vercel request records for the Owner handoff, workplace billing status, and central plans route returned HTTP 200 on that Preview. The workspace was Fictional Acceptance A in the isolated test registry. [Preview](https://vercel.com/josekarlo-5933s-projects/nevora-onboarding-staging/duAxjN5GPcwZHJahXzCpry6C3bJk)

## Hosted observations

- The protected English billing page exchanged the Owner's one-time handoff and loaded the current trial, coverage, headcount and Small plan. The Development API allowed the protected signup origin and denied the published Velani origin. The webhook receiver rejected an unsigned POST.
- The Checkout action and retry retained one operation and one Stripe sandbox session. Stripe issued a Checkout session URL under `/g/pay/`; the browser accepted only `/c/` Checkout URLs and showed the retry state even when the API had returned HTTP 200. The test continued using the same directly verified Stripe URL. Stripe completed setup and redirected to the configured protected return route. This trial setup collected no payment.
- The first signed delivery, `evt_1UeJGCHT1nhEuOJ2aXuytTfO`, arrived after the temporary database caps restored and received HTTP 503. A short recovery window at the same approved caps let Stripe redeliver the event, and a second resend checked duplicate handling. Both returned HTTP 200. The catalog recorded one receipt and one job, completed on its first attempt. Stripe and NEVORA both showed the resulting Small subscription `sub_1UeJJNHT1nhEuOJ21mVd2a6d` as trialing. The original application trial and paid-through dates remained in place.
- The return page first showed unavailable while the database was closed. On a fresh Owner handoff after processing, the billing page showed Manage billing in Stripe. The hosted run verifies provider processing and the post-webhook projection. A clean browser redirect and return on a deployed patched release remain to be verified.

## Checkout fix and closure

The browser accepts the observed `/g/pay/cs_test_…` and `/g/pay/cs_live_…` Checkout path shape only on HTTPS `checkout.stripe.com`. Existing Stripe Checkout and Portal destinations still work within their previous boundaries. Regression tests cover the successful redirect, malformed paths, and a foreign host. The owned billing browser suite exercises the new path through the one-session retry.

The Stripe sandbox receiver and Neon queue were disabled after the test. The protected aliases were restored to their prior deployments, and original Neon caps were read back at 21,600 active seconds and 5,400 compute seconds for the control project and 7,200 active seconds for Acceptance A. The sandbox subscription remains as evidence. Public signup returned `signupEnabled=false`. Production authorization remains with Jose. [Development CI](https://github.com/JoseK0514/NEVORA/actions/runs/44924527159)
