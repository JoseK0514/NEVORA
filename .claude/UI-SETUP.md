# Claude UI setup

Additional Owl-Listener UI design/testing skills were installed separately; see
[the selection, verification, and usage notes](OWL-DESIGN-SKILLS.md).

Open this folder in the **Code** tab of Claude Desktop using **This computer**:

`/Users/josek0514/Desktop/NEVORA-UI-READINESS`

Start with `/nevora-ui-readiness` and describe the screen or issue. Personal UI
skills are installed in `~/.claude/skills/`. Use `/skills` or the slash-command
menu to inspect them. Most broad style alternatives are manual commands; only a
small selection of consistency, accessibility, motion, and responsive skills can
load automatically. Existing Claude skills are preserved.

`CLAUDE.md` routes this project to its own current `DESIGN.MD` and `.21st` design
context. No NEVORA executive, delivery, governance, or independent oversight
skills were transferred. The repository's pre-existing files remain in place.

## Tools and connections

- UI/UX Pro Max includes its local Python search scripts and datasets.
- Playwright includes a shell wrapper using `npx @playwright/cli`; its paths have
  been adapted for Claude. No Codex REPL feature is required.
- Impeccable includes its launcher and references; its pinned engine may use the
  existing user cache or obtain its official release on first invocation.
- 21st CLI design/build/review instructions and Superdesign instructions are
  available. Their service/account status is separate from skill installation.
- Figma, Mobbin search, and image-generation tools have not been connected.
  The `mobbin-design` skill is a local design-language reference, not Mobbin search.
- No credentials, tool permissions, hooks, or account connections were copied.

## Verification and rollback

Migration manifest and script:
`~/.claude/migrations/2026-10-15-ui-transfer/manifest.json` and `migrate.py`.
The manifest records source and installed hashes, copied files, existing files,
and omitted skills that need a different runtime, connection, or missing files.
Run the migration script with `--verify` to check copied files against the record.

To reverse the transfer, first check for later edits, then move only directories
marked `installed` in that manifest to a backup folder outside `~/.claude/skills/`.
Keep all entries marked `preserved-existing`. Also move this newly added
`CLAUDE.md` and `.claude/` directory aside if no later work depends on them.
No original Codex skill or existing Claude skill was modified by the transfer.

## Setup verification (2026-10-15)

- All 46 transferred personal skills pass the migration hash verification.
- `npx skills@latest list --global --agent claude-code` lists the transferred skills;
  its project-scope equivalent lists `nevora-ui-readiness`.
- Claude Desktop's Code tab is set to this checkout on **This computer**. Its
  slash-command menu visibly recognizes `nevora-ui-readiness` as a project skill.
  No design prompt was submitted.
- UI/UX Pro Max returned a result from its local UX dataset.
- Impeccable's engine probe returned `impeccable-engine 0.1.14`.
- Playwright CLI and 21st CLI help commands succeeded. Superdesign reports
  version `0.14.0`. These checks do not certify external account authentication
  or an application's browser behavior.
- The `frontend-design` upstream file is retained unmodified so the premium
  resolver can verify its tested digest. The project design baseline still
  governs all visual work.
- Python helper syntax and the direct bundled reference links were checked.
- Only the new `CLAUDE.md` and `.claude/` setup files are untracked in this
  checkout. Branch `NEVORA-UI-READINESS` was retained. No commit, push, app-code
  change, deployment, or production-data test was performed.
