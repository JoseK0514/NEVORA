# Password policy and account emails — implementation handoff

Scope is Jose's approved roadmap Tasks 5A/5B. Other roadmap modules are outside this branch.

Base: `origin/development` at `22107a24272f2347bbb59a3da1f54319632772a5`.
Branch: `codex/nevora-password-emails-20261117`.
Owner: Codex implementation/backend; Claude owns subsequent visual acceptance and the existing integrator owns joined development qualification.

Development is the primary operating/acceptance release, held to production standards. This feature branch has not been integrated or deployed. Main/production require Jose's approval. Local fixtures are synthetic and use invocation-owned PostgreSQL, loopback SMTP and browser origins; no real messages or customer data were used.

## Delivered behavior

- One server policy enforces at least 15 Unicode code points, long phrases/spaces, a 1,024 UTF-16-unit resource cap, a pinned local common/breached-password corpus, and current Employee ID/company-name values and predictable derivatives. Whole values are screened; unrelated phrases containing company words remain allowed.
- All supported enrollment paths use that policy: employee invitation, email/assisted/initial-password reset, initial Owner activation, operator company setup/bootstrap, and commerce company setup. Specific EN/ES reasons leave a valid invitation/reset form usable. No composition rules or periodic rotation were added; existing first-use temporary-password replacement remains.
- Existing persisted passwords verify with their original bytes and scrypt format. There is no forced migration or mass reset.
- PB-022 invitation, reset and password-change messages now have branded HTML and an equivalent English/Spanish text fallback, official wordmark, teal action, canonical company/name and existing app terminology. Reset says 15 minutes, invitation says seven days; actual deadlines come from issued proofs. Delivery never extends expiry. Links remain complete workspace-bound fragments, with existing origin/recipient/staging/TLS/deadline restrictions and failed/unknown handling.
- Employee/operations guides describe the new rules; all six published manuals are regenerated with exact source binding, preserving the publication gate.

## Architectural and policy decisions

1. Only password/email work is implemented. Cost: the rest of the feature roadmap remains unfinished.
2. Screening uses a pinned local list rather than an external per-password query. It contains 10,908 eligible digests from the reviewed million-entry SecLists/xato corpus; shorter entries already fail the minimum. Cost: newer/out-of-corpus breached passwords are not detected until refresh. Provenance, license and reproducible import are in `src/lib/auth/blocked-passwords.md`; refresh is an engineering maintenance responsibility.

The NIST basis is [SP 800-63B-4 section 3.1.1.2](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver). This implements the selected password requirements; it does not certify the full application against NIST.

Initial Owner policy context is read only after the existing SQL admission function validates the grant. It uses the unique inactive Owner profile in that bound workspace and fails closed if ambiguous. APP retains no direct access to private grant tables; restricted-role integration tests cover this boundary. There are no schema or privilege changes.

## Verification

Qualification is still running; final results and review will be appended before delivery. Early failed test runs are retained as evidence, including regression RED runs and test-fixture errors. Test assertions/timeouts and release/source guards are preserved.

Evidence directory: `/Users/josek0514/.codex/visualizations/2026/11/17/01a1e94c-85f6-7150-8838-c78bbe9df886/password-email-qa/`.

## Next release gate

The integrator should reconcile against the current development head and qualify the joined source. Claude should review PB-022 desktop/mobile previews and app vocabulary. Local SMTP/browser checks do not establish real inbox/client rendering, hosted delivery or physical-device acceptance. Those require the existing authorized recipient/environment workflow. No production promotion is authorized by this handoff.
