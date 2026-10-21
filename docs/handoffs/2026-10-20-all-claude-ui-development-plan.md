# All Claude UI integration into development

Jose authorized fixing the integration and merging the latest UI to development.
This is development authorization only; main, production deployments and hosted
database writes remain outside this task. Codex owns integration and verification.

## Pinned inputs

- Development: `d4b01453f7fabaa7ac739d049934527b6b366310`.
- Clean Manager/Owner and CI repairs (PR15): `87768b9ed318dc6b775bb02d99e26882f864e5c4`.
- Latest Claude auth plus Employee/Lead Signature UI: `8107dfed14938ab6b366224da0292d5a0dd17e8d`.
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
