# Batch02 — Access in short touch landscape

Verified locally at393c8440; no rollout enablement or release acceptance.

Cause: both the form-selection hook and three mobile CSS blocks used width alone; desktop CSS still applied on844×390 touch screens. Native captures confirmed the old sign-in form and Welcome primary action below the fold.

RED atfe521b1a:120 native layout cases and24 rotation observations,142 failures across Chromium/WebKit/Firefox. The exact failed log and captures remain in access-landscape-red.

Repair: use the existing Employee condition (width≤767 OR height≤500/landscape/coarse) for the hook, all mobile Access CSS blocks and Quick guide. The desktop block uses the complementary condition. Hide only the decorative Welcome illustration in short coarse landscape. Preserve the official wordmark, approved portrait/desktop appearance, single form owner, in-memory field custody and existing authorization. Access rollout/support flags stay off by default.

First replay at6d04a2cf passed all120 layout cases and396 guide contrast samples; three rotation expectations wrongly required the login card wrapper to disappear on desktop. Login intentionally keeps an unstyled server wrapper, unlike Recovery. The revised assertion checks actual border styling instead of DOM absence, retaining one-form, unique-field and field-value assertions. Before-copy preserved in the ignored execution workspace. Added native input-to-password keyboard and visible-focus checks. No timeout, exception gate or business assertion relaxed.

Full GREEN at393c8440:3/3 Access tests;18 real journey checks;66 authenticated Home guide samples;396 native guide samples (minimum5.42085:1);120 public landscape cases in both theme choices/100–200% text;24 unsent-field rotation checks through844/1440/320/390. Zero failed layout/runtime/window checks. Owned Next/SMTP/Postgres closed normally.

Default10,219 passed/0 failed/801 pending; full nonincremental TypeScript, ESLint, owned startup and source-bound build exited0 with unchanged source. BATCH-02-RESULTS.json pins the receipts.

A dedicated Mobile Access workflow checks out the exact candidate, installs the pinned runtime and three native engines, and runs the complete suite with external runner.temp artifacts. Its upload excludes the application mirrors and environment files. Source configuration is not an Actions pass; actual CI evidence will be recorded separately after push.

External artifacts: outputs/release-1-20261029/{access-landscape-red,access-landscape-green,batch02-access,batch02-static} under the design task root. Physical devices/AT, final same-SHA journeys, policy-dependent work and independent Release1 inspection remain open.
