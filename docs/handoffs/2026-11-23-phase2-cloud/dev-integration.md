# Development integration (Nov 23, 2026)

`development` (b5264836, 48 Codex commits since 1f6602cb on Nov 21) is merged into
`claude-codex-collab-nevora` as history only: the merge took no file changes, so the release candidate
(6b79dd25, QA-passed) is unchanged. `development` is now an ancestor of the shared branch, so the release
merge into `development` will be a fast-forward. The content of the 48 commits is ported on purpose, listed
below.

Each commit was tried on its own on top of 6b79dd25 (`git cherry-pick -n`). CLEAN means it applies as is;
CONFLICT means it touches lines we have since changed.

## A. Join snapshot: nothing to port

| Commit | Result | What it is |
|---|---|---|
| a70dccf4 | CONFLICT (132 files) | Codex's squashed copy of our branch as of Nov 22. Our branch is the newer version of the same work. |

## B. App fixes: port all four (UI work)

| # | Commit | Result | What it does | UI work on our redesign |
|---|---|---|---|---|
| B1 | 6e34589e | CLEAN (4 files) | Location-limited Manager with nothing they may approve: Time off empty state reads "No requests you can review" / "An Owner can review requests outside your approval permissions." instead of "You're all caught up" (English and Spanish copy). | Check the new empty state sits under the tabs with the gap from 397f37d0; capture 390, 390 at 200%, 1440. Spanish lines go to the staff branch list. |
| B2 | 063aa49d | CLEAN (7 files) | Edit person keeps an old-format phone number that wasn't changed, instead of refusing to save it; server accepts the stored value unchanged. | Confirm our Edit person and Team forms pass `preserveLegacy` and the current phone; no visual change. |
| B3 | 58c8c769 | CONFLICT (1: team-forms.tsx) | Follow-up to B2: the phone pattern applies only to an edited number. | Resolve in team-forms.tsx on top of B2. |
| B4 | ae91c1b3 | CONFLICT (10) | A location-limited Manager's Home actions and Inbox count use their own locations (`X-Nevora-Action-Center-Scope: assigned`, `readActionCenterForCurrentScope`) instead of company-wide. | Port the API, service and inbox-count changes; pass `scoped` from our redesigned Home and Inbox. No visual change; counts become correct for scoped Managers. Its test-file edits are partly superseded. |

## C. Test-harness waits: compare, keep the stronger version

Browser-test reliability only, no product change. Most conflict in `readiness-ui-browser.integration.ts` and
the QA scripts, which we changed today too (4ecde955, 80d63a2e6, 15fb4720, 156a1735).

| Commits | Result |
|---|---|
| 11948fbc, 2b126ac3, a4182b72, ae718469, 9888f2c5, d9a66975, 15d899af | CLEAN: apply, then run the readiness tests |
| b5a42125, a3c91e4a, 3886fe67, 8138068a, 119f680f, 3e8fd30a, f9126a48, 6496df41, 456646c5, ed0a33b6, 2f77ad7e, af53dffa, 31d32fa9, 598c3dd6, 7cf538fb, f24e2002, 275f2646 | CONFLICT (1–2 files each): take a wait only where ours lacks it; keep our https harness, reload wait and navigation-cancelled-read rules |

## D. Guides and release records: nothing to port

16961b80, e968343a, cf85f969, 67de6bd9, dd734fd7, 48cd8ad1, cf069bee, 6de868b9, 0c4e4da2, 137c45be, 1182869a,
1106be22, 3d5a9237, b5264836 (guide rebinds); ef2ed3de, 0da81549, 9dd32aff, 1bfea6fc, 34421943 (custody and
handoff records). Superseded by one final guide rebuild after B and C.

## Order

1. B1–B4 (one session), tests and captures.
2. C (QA session), readiness tests in both browsers.
3. Publish "What this measures" for this week's draft (QA 21:55: form and row detail sit over the ring).
4. Guide rebuild on the final tip, full QA gate, then merge into `development` (fast-forward) and `main`.
