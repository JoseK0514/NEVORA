# Replacing main with development (Nov 26, 2026)

Jose, Nov 26, 2026: "Main will get deleted and will copy development."

## What main is

- `main` (46d6dc769) is the original **Fuel Scheduler** prototype: 152 commits from Sep 27–30, 2026, plus a README
  edit on Nov 9.
- It shares **no history** with `development` or `claude-codex-collab-nevora`: `git merge-base` finds no common
  commit. Development starts from its own first commit on Nov 19.
- So main can't be merged or fast-forwarded. It can only be replaced.

## Was anything on main lost?

Checked the four behaviour fixes on main (Sep 30):

| Main commit | Fix | In Collab |
|---|---|---|
| a1e6a3154 | Validate untrusted schedule dates | Yes. `isValidIsoDate` and `isValidWeekStart` are in `src/lib/date-utils.ts`, and the same test is in `date-utils.test.ts`. |
| 4428e1c8c | Reject archived schedule templates | Yes. The `active = true` reads are in `src/lib/data/schedule-templates.ts`, and the same test is in `schedule-templates.test.ts`. |
| 17f7d5bdd | Prevent duplicate workflow submissions | Yes. A request ID is the insert key in `src/lib/data/requests.ts`. |
| c6b4d2c9b, d8adaf9b2, 40a48168a, d0e78d2be | Mobile, navigation and name-display fixes in the Sept UI | Superseded. Those screens were redesigned (Direction B). |

The other commits are the September premium-UI passes, artwork and docs. All of them are superseded by the current
design. Nothing needs porting.

## Steps (Jose or Codex, with full push access; this session can't push tags)

1. Keep main's history:
   `git push origin 46d6dc769:refs/tags/archive/main-fuel-scheduler-2026-09`
2. **Before step 3,** check what deploys from `main`, such as Vercel production or any other hosting. Resetting main
   ships the current development code there.
3. Point main at development (only after development has taken Collab, with Jose's go):
   `git push --force-with-lease=main:46d6dc769 origin origin/development:main`
4. Update the README's branch section if it still describes the old workflow.
5. Then run `2026-11-26-retire-branches.sh`. Update its screens-final tip first, because the branch has moved since the
   script was written.
