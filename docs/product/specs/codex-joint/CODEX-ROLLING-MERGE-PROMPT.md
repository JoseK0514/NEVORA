# Codex, in the cloud: rolling merges into the release candidate

Jose's decision, October 19, 2026: instead of merging all six branches at once tonight, merge each chat into the release candidate **as soon as it reaches zero**, and check the merged build piece by piece. This takes about two hours off tonight.

**Jose's standing approval covers:**
- merging chat branches into `codex/release-candidate`, and pushing that branch
- the post-merge items listed below

**It does not cover:**
- merging into `main` or into any `claude/*` branch
- any deploy, production or preview
- choosing between two versions of a screen in a conflict

Keep running the inspection loop from `CODEX-INSPECTOR-PROMPT.md`. This is added to it.

## The release candidate

1. Recreate `codex/release-candidate` from the latest `claude/premium-phase-1`. It replaces the rehearsal branch; keep the rehearsal's records.
2. Merge in `codex/premium-backend`.
3. `claude/premium-phase-1` keeps changing until Phase 3 reaches zero. Merge its newer commits into the candidate whenever it moves, as well as when it reaches zero.

## When a chat is ready to merge

A chat is ready when **either**:
- your own exit round on that chat reports zero in all five areas, **or**
- the chat's `ROUND.md` says `status: zero`, with the exit round named. Use this when the chat ran its exit round on the Mac. Read that round's reports on the chat's branch under `docs/product/specs/<folder>/inspection/`, and confirm they show zero.

Merge exactly the commit that reached zero. If the chat pushes again after that, merge again only after that new commit reaches zero.

## Merging

- **Order:** whoever is ready first.
- **`src/app/app/portal-premium.css`:** always take `claude/premium-phase-1`'s **latest** version. The coordinator owns that file, and other branches only carry older copies of the coordinator's commits. Don't keep an older snapshot.
- **Any other conflict:** don't choose. Leave the candidate at the last clean merge. Write both sides in `STATUS.md` under "Conflicts for Claude", with the files and the two branches. The coordinator resolves it on its branch, or tells the chat.

**After each merge:**
1. `npm ci`, `tsc --noEmit`, lint, and the full vitest suite.
2. `checks.mjs` over the merged chat's routes, plus Home, Inbox and the More sheet for every role.
3. A **combined inspection** of what this merge touched, against everything already merged. Look for:
   - two versions of the same control
   - spacing that changes between pages from different chats
   - different words for the same thing
   - the shell (header, tab bar, More sheet, sidebar) behaving differently on the new pages
   File these under `release/merge-<n>-<chat>/` on `codex/inspections`, in the usual report format, naming the chat that owns each fix.
4. Push `codex/release-candidate`. Add a line to `STATUS.md`:
   `<time> · merged <chat> at <commit> · tests x/y · checks pass|fail · combined P0/P1/P2 · <ok | blocked>`

When all six chats are merged, run one final full sweep of every page, all five areas, plus `npm run build`, the full test suite and `npm run test:dev:production`. That's the release candidate result for Jose.

## Post-merge items (yours, on `codex/release-candidate` only)

These are the only UI-file edits you may make, and only on the candidate:
1. **Profile:** wire `readManagementProfile` as `initial` in `manager-profile.tsx`, the one change described in `docs/product/specs/p35-profile/CODEX.md`. It removes a 0.029 load shift for a Manager at 320.
2. **Dead CSS:** remove the `.settings-hub*` rules in `src/app/mobile-workforce.css`, once Wave C is merged. First confirm that nothing in `src/` uses a `settings-hub` class.
3. **Lint warning:** `src/components/employee-weekly-confirmation.tsx:18` (ref cleanup, exhaustive-deps). Fix it without changing behaviour, and add a test if it's subtle.

For each one: a separate commit, tests and checks rerun, and a line in `STATUS.md`.

## Jose's phone pass, early

Jose wants to start his real-device pass on the first merged chats while the rest finish. His phone has to reach a **fictional-data** build of the candidate over **https**, because the session cookie is `Secure`. Propose the safest way in `STATUS.md` under "Device pass access", and **don't do it until Jose approves**. For example:
- a Vercel preview of `codex/release-candidate` on a separate fictional database, with no production data or secrets, and notifications captured
- or a tunnel to a local preview

Say what it costs, what it exposes, and how it's torn down. Until Jose says yes, nothing is deployed or exposed.
