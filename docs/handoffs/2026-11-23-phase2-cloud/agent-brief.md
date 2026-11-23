# Brief for every screen agent (NEVORA Phase 2, Nov 22, 2026)

You redesign ONE screen (or one tight pair) of NEVORA (Next.js 16, React 19, TypeScript, Postgres) to a premium,
consistent standard. Jose reviews your result in his page queue and approves or sends it back. Quality matters more
than speed: Jose has already sent back a screen because it was a generic look-alike instead of the real Direction B.

## Read first
- `CLAUDE.md`, `DESIGN.MD`, `.claude/skills/nevora-design-os/SKILL.md` (and its `references/density.md`,
  `references/audit.md`, `references/voice.md`), `docs/design/voice.md`, `docs/design/component-picks.md`.
- The page done gate at the end of `.claude/skills/nevora-design-os/SKILL.md`. Your screen must pass all five points.

## Rules that came from Jose's reviews today
1. **Direction B for real.** Reuse the existing Direction B components and screens (`src/components/owner-b/*` such as
   `home-b.tsx`, `team-b.tsx`, `b-kit.tsx`; `src/components/employee-b/*`; `manager-weekly-roster.tsx`; the Corp
   components in `src/components/corp/corp.tsx` that the Direction B layers restyle). When a role should get "the same
   screen another role has", render THAT screen's component with this role's data. Never assemble a look-alike from
   generic parts. Compare your result side by side with the other role's screen.
2. **Each fact once; no line that is always true; no explanation of how the screen works.** Plain words. No paragraphs
   about access ("company-wide access is required…"). The place a person works is always visible; a filter when they
   have more than one place.
3. **Title band:** on phones, a Corp tab-root page needs `CorpNav phoneOnly` (with the title) plus `CorpTitle wide`, and
   `ScopedReadFrame` must WRAP the `CorpPage` (not sit inside it), or the phone band rules miss the title and it shows
   twice. On desktop the first block after the title is lifted into the band: the company Schedule puts a print-only
   `<p className="mws-print-title">` first for that reason (see `src/app/app/schedule/page.tsx`).
4. Text sizes in rem (200% text must scale). Spacing on the 4/8 scale. Buttons and fields per the component picks
   (Solid teal main button; white raised cards; outlined fields; Phosphor bold icons).
5. Same server reads, permissions, form actions and data contracts. No new server behaviour unless your task says so.
6. **No repeated wording; alignment and buttons are critical** (Jose, Nov 23): see point 4 of the page done gate. List
   every visible string; measure left and right edges at every width; report both.
7. Screen-reader names: don't put aria-labels on rows that differ from their visible text.

## Build and check
- Work in your worktree. Make sure it is at `claude-codex-collab-nevora`'s tip: `git -C /home/user/NEVORA rev-parse
  claude-codex-collab-nevora`; detach there if not. `ln -s /home/user/NEVORA/node_modules node_modules`.
- `npm run typecheck` (or `npx --no-install tsc --noEmit -p .`), `npx --no-install oxlint --config .oxlintrc.json <your
  paths>`, and the tests beside what you change (`node scripts/run-rstest.mjs <paths>`). Update tests that assert old
  wording; add tests for the new screen. Note: test filters also match other agents' worktree copies under
  `.claude/worktrees/`; judge only failures in your own paths.
- **Screenshots, production build, fictional data:** see `README.md` in this folder: `tools/ui-scan/desk.sh` (Owner,
  Manager `OWN-ELENA`, Lead, Employee, public pages) and the location Manager scaffolding
  `tools/ui-scan/zz-scan-scoped.tar.gz` (`zz-scan/mgr.ts` captures as Daniel `OWN-DANI` limited to `loc-2` Condado,
  with measurements, axe and overlap checks), run with `run-scoped.sh`. Extend `mgr.ts` for your routes and profiles
  (Owner `QAOWNER`, Manager `OWN-ELENA`). The harness refuses uncommitted app source: commit first. Captures follow
  `faster-plan.md` (AFTER only, 390, 768 and 1440).
- Look at your own screenshots before reporting; fix what's broken and capture again.

## Deliver
- Commits on your session's work branch (see `README.md`) with clear messages ending with exactly:
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01N2UNZFBxnmqY4hGAbQjzz3
  No model names anywhere else. Push only your own work branch.
- Report: commit hash(es) and worktree path; what changed and why (short); before/after words, button styles, axe,
  overflow at each width; the Impeccable audit in the format of `references/audit.md`; the PNG paths of the after
  captures at 390 and 1440 (and before); anything you couldn't do and why. Don't remove your worktree; the lead will.
