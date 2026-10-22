# Owl-Listener UI design and testing skills

Installed 2026-10-15 from `Owl-Listener/designer-skills`, commit
`9a6930cf84a822eb458624bd11c61aac5bbdf224`.

## Installed selection

75 skills were installed as independent global Claude Code skill folders under
`~/.claude/skills/`, with their upstream contents preserved:

| Repository group | Skills installed |
| --- | ---: |
| ui-design | 19 |
| interaction-design | 22 |
| design-systems | 10 |
| prototyping-testing | 10 |
| visual-critique | 7 |
| Selected UI/testing helpers from other groups | 7 |

The seven helpers are `usability-test-plan`, `design-qa-checklist`,
`design-debt-audit`, `handoff-spec`, `design-token-audit`, `ux-writing`, and
`information-architecture`.

No leadership or executive collections were installed. `design-system-governance`
and the surrounding organizational, strategy, program-management, and team
process skills were excluded. A selected UI helper can originate in a broader
repository group without installing that group's other skills.

## Use in Claude Code

Start a new local Claude Code session to refresh the skill menu. Invoke the
skills directly, for example:

```text
/critique-brand-consistency Review this screen against DESIGN.MD and the existing CSS tokens.
/critique-typography Review this screen's typography against the approved design.
/accessibility-audit Audit the rendered screen and report issues without editing.
/design-qa-checklist Build a UI verification checklist for the affected screens.
```

These are standalone skill commands. The repository's plugin workflow commands,
such as `/visual-critique:critique-screen`, were not installed by this skill-only
operation. Existing project `DESIGN.MD` and route-specific design decisions remain
the visual source of truth. When a critique asks for brand files that do not
exist, identify the gap rather than inventing a brand rule.

## Verification and recovery

- Claude Code's skill listing discovers `critique-brand-consistency` and the
  installed selection; `design-system-governance` is absent.
- All 75 copied skill folders match the pinned source files byte for byte.
- All 226 files already present in `~/.claude/skills/` at installation time match
  their pre-installation hashes.
- The five core groups passed the local static skill scanner with zero findings
  and no executable scripts. This was a static check, not a certification of
  future model behavior. Repository-wide scanner hits were unrelated GitHub
  issue-template comments and an optional maintenance script, neither installed.
- No design prompt was submitted to Claude. Its existing `/criti` draft was
  preserved. Runtime use of every skill was not tested.

Manifest, pinned source checkout, installer log, and verification utility:
`~/.claude/migrations/2026-10-15-owl-ui/`.

```bash
python3 ~/.claude/migrations/2026-10-15-owl-ui/install.py --verify
```

For rollback, verify that none of the installed folders has later edits, then
move only the 75 folders named in `manifest.json` out of `~/.claude/skills/` to a
backup location. Preserve every pre-existing skill. The installer did not modify
Claude permissions, copy credentials, register plugin marketplaces, install
hooks, or connect external accounts.

This setup adds documentation only to the UI readiness checkout. Its branch was
retained; no application-code change, commit, push, or deployment was performed.
