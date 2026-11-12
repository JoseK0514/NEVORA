# Incoming recovery patch for the sole SCRUM-190 finisher

November12,2026. Base: eee76416ec8d06435e73c3ecde9a77752ec0d446. This is a local detached patch, not a second NEVORA integration/publication.

Jose asked this chat to finish its non-overlapping part of60/147/73/156/157/158 and hand UI work to Claude. Read-only ownership check establishes “Finish NEVORA SCRUM-190 handoff” (01a1d175-7de0-7a80-b607-5418fde6ed50) as the active integration/hosting finisher. Its checkout/runtime/CI were not touched.

## Cause and fix

The current gate redirects Clocker documents but returns raw402/503JSON for GET /app documents. The earlier local04fe4616 recovery commit did not fully land in development; it is now preserved at refs/codex-recovery/commerce-recovery-04fe4616.

- Actual HTML or Sec-Fetch-Mode:navigate GETs under /app now303 to exact /app/billing with only reason=subscription_required or billing_status_unavailable.
- /api and /app/api requests, writes and explicit JSON/RSC reads retain the JSON402/503 contract, including callers with navigation-like headers.
- No original query/return path is forwarded. Redirects are same-origin, no-store and no-referrer.
- Exact GET /app/billing bypasses commerce-binding resolution, matching its existing gate exception and preventing an unavailable binding from redirecting its recovery page forever. It does not bypass page/session/role checks. Writes and descendants remain gated.
- Existing strict Clocker recovery handling is unchanged. No private status field, role grant, billing plan, endpoint or environment changed.

## Evidence

Before the fix:22 new tests,14 failed/8 passed; failures reproduce raw document JSON and recovery-binding dependency. After the fix:76/76 tests across6 files, including all22 new controls, access/cache lifetime, recovery exceptions, tablet keys and authenticated Owner status. Scoped ESLint and project typecheck pass.

The old local dependency folder lacked the already-declared @neon/functions package. The exact existing0.11.0 installation was linked into this checkout only; no package/lockfile changed. Initial typecheck failures and RED receipts remain in the external six-release audit evidence.

The full default unit suite, source-bound manuals, build, candidate/post-push Actions and hosted acceptance belong to the sole finisher's next combined candidate; they were not duplicated or certified here. No hosted window, send, charge, quota change, runtime operation or CI dispatch occurred.

## Integration and Claude boundary

Import the reviewed patch into the current combined source; do not replace it with EEE or operate another candidate in parallel. Re-run affected checks, source/manual/inventory gates and full required candidate/development checks. Regenerate source-bound artifacts rather than relabel an older bundle.

At the inspected development source, the /app/billing and /clocker/access/paused UI page files are still absent. Reconcile the held existing UI under169. The shared app layout still mounts operational AppShell loaders/pollers and parallel sheets around recovery content; Claude must adapt recovery composition to current company/session binding without weakening guards. Earlier04fe recovery-boundary/layout is reference only, not a blind single-company port.

The corresponding detailed Claude handoff and source-bound Velani fixtures live in VELANI-SHOPIFY-WEBSITE docs/handoffs/2026-11-12-six-release-codex-to-claude.md. Six overall issues stay open until their UI/business/device/hosted criteria are evidenced. Development is the operating/acceptance line under Jose's November12 policy; main/production still needs separate approval.

