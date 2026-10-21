# All Claude UI integration into development

Jose authorized fixing the integration and merging the latest UI to development.
This is development authorization only; main, production deployments and hosted
database writes remain outside this task. Codex owns integration and verification.

## Pinned inputs

- Development: `d4b01453f7fabaa7ac739d049934527b6b366310`.
- Clean Manager/Owner and CI repairs (PR15): `a405b6080c5d0ca4086965bc6c37bf76713b511b` (includes `cb4cc5ca` and the original `87768b9e` input).
- Claude auth plus Employee/Lead and Clocker Signature UI: `b0632ce63104197c728bd062c168b28771ac4687` (includes `8107dfed`). This is the frozen Claude input; later changes need their own candidate.
- Policy pages/deletion requests: `d0b6d1f5e12f8602b947ad18cc40e04fc1180a6a`.
- Matching passkey server: `48ededa576f3951054dbf6d9394d10670b831c60`.
- Latest release-integration `898e99d4` is already included through auth/Manager inputs.

## Controls and verification

Preserve email-invitation activation; do not restore the retired ID/phone
activation. Preserve Company Access admission/response checks, notification
authority keys, native payroll worker startup, existing payroll/legal wording
and approved policy facts. Keep passkeys off by default and production migration
approval separate. Verify deletion requests cannot be bypassed by passkey login.

Use fictional users and owned loopback PostgreSQL only. Review all merge
conflicts, run types/lint/full units/build plus affected SQL and real browser
flows, then require hosted checks on the final combined SHA. Resolve test-driver
mismatches with evidence; never remove scenarios or weaken authorization,
privacy, concurrency, error, contrast or timing requirements to get green.

The existing verification chat owns PR15 and its CI repairs; this task uses a
separate descendant worktree and preserves that work. Reconcile development
again before merging the final candidate. Independent acceptance remains with
the independent reviewers; local/hosted test passes do not authorize production.

Evidence is outside Git under this chat's `all-ui-development-20261020` folder.
Final handoff will record exact checks, merge SHA and any remaining release gates.

## Integration repairs and observed evidence

The combined migration revokes sessions and passkeys atomically when deletion is
requested and fences an in-flight password login. Three real PostgreSQL
regressions failed before the fix; all 34 passkey SQL/service/route tests then
passed. Migration 0034 is a prerequisite for 0035. No hosted migration was run.

Browser and unit regressions also exposed an auth language switch enabled before
hydration, lost native statement viewing, stale private statement details during
loading, and a legacy Profile grid constraining the new layout. Those application
defects were repaired. Existing Schedule and Home assertions now use the actual
Signature semantics while preserving authorization and loading privacy checks.

Types, lint and all 66 release engineering checks passed at `368abce9`. Targeted
auth/policy checks passed (73), Schedule/language checks passed (33), and the
unchanged private statement regression tests passed (7). The initial full unit
run recorded 9,149 passes and four failures: three addressed integration
regressions and an unchanged 5-second typed-backfill timeout under local load.
That entire 68-test backfill file passed alone at its original limits. A final
full hosted run is required; these targeted reruns are not a full-suite pass.

The owned browser runs use fictional data and local PostgreSQL. At `6c72e7d6`,
the combined Chromium/WebKit run passed all 40 recorded journeys with zero page
errors, including native WebAuthn registration, removal confirmation focus,
removal, discoverable sign-in and deletion receipt/session/passkey revocation.
Public/authenticated screens were checked at 320/390/768/1440 pixels. Physical
Face ID has not been tested. The D1.3 attendance browser run also passed all 46
checks on that source; its temporary database was stopped.

Hosted validation on the earlier combined candidate `368abce9` passed 9,154 unit
tests (523 files), types, lint, production build, and both dependency audits with
zero vulnerabilities. Existing default-suite skips were retained. Subsequent
CSS, Clocker and driver changes still require the complete final hosted run.

Real mobile regressions were reproduced: bottom navigation obscured Home Refresh
and Profile Sign out. Restoring bottom clearance and native scroll padding made
the original keyboard/contrast assertions pass at 320/375 pixels; the final full
matrix remains mandatory. The new Profile passkey row also explicitly resets its
inherited flex direction, eliminating an oversized empty card. The combined
browser run verifies its bounded height. No assertions or scenarios were removed.

Driver repairs preserve the original requirements: held attendance responses make
privacy clearing observable without timer sleeps; Company Access's parent pause
replaces the unmounted child state; role-based controls avoid ambiguous new
section labels; schema equivalence includes 0034/0035 on both upgrade/fresh paths.
Contrast measurement now supports dark text on light backgrounds while still
rejecting a foreground crossing the background range (new red/green regressions).
Home's fresh-generation wait requires a visible fresh fact, including when its
semantic parent uses display:contents, and rejects the former location text.

The Profile calendar cleanup originally hid all unroled paragraphs, including the
private-link disclosure and refresh/connection caveat. The existing calendar
browser scenario reproduced this; the hide rule now targets only the redundant
introductory paragraph. Native request verification reads the Signature form's
visible one-day heading instead of the retired form's summary aside. The PR15
repair merge retains its explicit Manager grants, operational retirement checks,
cancelled-document response handling, and exact receipt command validation.

PR16: https://github.com/JoseK0514/NEVORA/pull/16. The final merge gate is all
mandatory hosted checks on the combined candidate, plus reconciliation with the
current development head. Production, independent acceptance and physical-device
testing remain separate gates; passkeys remain off by default.
