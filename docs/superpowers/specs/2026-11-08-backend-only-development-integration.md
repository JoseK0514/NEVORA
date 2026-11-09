# Backend-only development integration

Jose authorized moving remaining backend logic into development while Claude
retains UI ownership. Source: collaboration
`d349b66196c847fdb46852a3db0c0630463295c5`; destination base:
`e2872f30ea8548b1310ea4a9b25813352decf82a`.

Transfer the Employee Requests deduplication and previous-week timecard reads.
Prepare the optional coverage-end/clock helpers without changing existing callers.
Keep authorization, source expiry, canonical readers, action identities and
unavailable states intact. Every action snapshot must respect every source's
remaining lifetime, including the additional timecard period.

Do not edit/import UI components, pages, styles, navigation, presentation copy or
UI harnesses. In particular, hold the new `readInboxCount` clock activation until
Claude's Home/Inbox callers use the same clock; otherwise the badge and Home can
disagree. Additive optional helper arguments remain backward compatible.

Test actual request reads and timecard aggregation against fictional owned SQL;
pin clock/window and source-lifetime regressions with deterministic tests. Review
the whole change once, reconcile the exact source inventory and push only a
normal fast-forward to development after checks. No new branch, main/production
change, deployment, migration, provider send or secret operation is authorized.

All other collaboration changes stay held. The original native worktree, phone
testing state, local operational records and Claude's branch remain intact.
