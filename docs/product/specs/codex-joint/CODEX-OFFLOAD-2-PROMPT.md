# Codex, in the cloud: five more items for the October 20 release

Same project, same rules as before: push only `codex/premium-backend`, never merge into or push to a `claude/*` branch, never deploy. Use fictional data only, and never print a password. Don't edit UI files (`src/components/**`, page JSX in `src/app/app/**`, `.css`) except where an item below says so. Work from `claude/premium-phase-1` at the latest pushed commit. Report each item in `docs/product/specs/codex-joint/README.md` as it lands, with the branch and commit.

## 1. A smaller Inter font

`public/fonts/typeface/inter/variable.ttf` is 876 KB. It loads after first paint and re-wraps text.
- Make `public/fonts/typeface/inter/variable.woff2` with fontTools (`pyftsubset`). Keep the full weight axis (100–900), Latin and Latin Extended (the app will add Spanish later, so keep á é í ó ú ñ ü ¿ ¡), and the punctuation the app uses: – — · ’ “ ” …, U+00A0 (no-break space) and U+2011 (no-break hyphen).
- Report the old and new sizes.
- This one item may touch two UI files:
  - In `src/app/typeface-theme.css`, list the WOFF2 first in Inter's `src` and keep the TTF as the second source.
  - In `src/app/app/layout.tsx`, preload the WOFF2 (`type: "font/woff2"`) instead of the TTF.
- Leave the "Inter Fallback" @font-face as it is.
- Prove nothing changed visually: render `/login` and `/ui-preview/home` before and after and compare screenshots.

## 2. Server text that matches the screens

The UI now rewrites these on screen. Fix them where the server writes them, so emails, push notifications and any other reader get the same words. Update the tests that pin the old strings.

| Where | Now | Should be |
|---|---|---|
| `src/lib/action-center/intelligence.ts:285` and `src/lib/action-center/project.ts:14` | `Casey Rivera · 2026-10-19–2026-10-25 · Resolve recorded-time exceptions before finalizing.` | `Casey Rivera · Oct 19 – Oct 25 · Fix recorded-time issues before finalizing.` (workspace calendar dates) |
| `src/lib/data/employee-home.server.ts:153` | `Time off pending`, `denied`, `cancelled`; `Time correction rejected` | waiting, declined, withdrawn; declined |
| `src/lib/data/employee-home.server.ts` (exchange labels) | `Shift request pending` | `Shift request waiting` |
| `src/lib/data/shift-change-views.ts:23` and its integration tests | `Designated Lead` | `Designated lead`, and `No designated lead` |
| any notification or email text | "callout", "call-out" | "Unable to work" |

Words to avoid in anything a person reads: missing, missed, denied, rejected, callout, cutoff, exception. Use instead: not sent yet, declined, Unable to work, availability deadline, issue.

## 3. Two test-data gaps

- **payroll-qa-b** is described as "a lead with pay statements", but My pay shows "No published statements yet". Find out why in the fixture (`src/test/integration/payroll-fixture.ts` or the seed), and give it at least two published statements on fictional data.
- **The Profile read** for the employee accounts failed on every load during one inspection (Profile showed "We couldn’t confirm your current information."), while other pages loaded. Check whether it's load (a timeout) or a real error in the profile read, under the same parallel load as before. Fix it on your branch if it's a server bug.

## 4. Rehearse tonight's merge

This is a rehearsal only. The real merge waits for Jose's go.
- Create `codex/release-candidate` from `claude/premium-phase-1`.
- Merge into it, in this order: `claude/p35-profile-6cdee8`, `claude/p35-wave-a-1283c8`, `claude/p35-wave-b-808dfd`, `claude/p35-wave-c-93e13c`, `claude/p4-desktop-240fe0`, `codex/premium-backend`. Use each branch's latest pushed commit.
- Conflict rule: in `src/app/app/portal-premium.css`, keep `claude/premium-phase-1`'s version, then append any rules the other branch added that aren't already there. For any other conflict, don't choose. List it with both sides.
- Run `npm ci`, `npm run build`, the full vitest suite, `tsc --noEmit`, lint, and the screen checks (`scripts/ui-checks`, as in the cloud-checks prompt).
- Push `codex/release-candidate`. Report:
  - the conflicts, with how each was resolved or left
  - test and build results
  - any check failures, each named with the chat that owns the page

Repeat this whenever Jose says a branch has new pushes.

## 5. Phone checklist for Jose

Write `docs/product/specs/codex-joint/DEVICE-CHECKLIST.md`: about an hour on a real iPhone (Safari, VoiceOver) and an Android phone (Chrome, TalkBack), on a fictional preview.
- One short section per role: Employee, Lead, Manager, Owner.
- Each step: where to go, what to do, and what Jose should see or hear. For example: "Swipe right through Home. You hear 'Hi, Jordan', then the next shift, then 'Published'."
- Cover:
  - sign-in
  - the tab bar and the More sheet
  - one form per role (send, then cancel)
  - an error (turn on airplane mode, then off)
  - text size at the largest setting
  - landscape
  - dark mode, to check it stays readable (dark mode isn't designed yet; just check nothing is unreadable)
- No real data or real notifications.

Claude reviews it before it goes to Jose.
