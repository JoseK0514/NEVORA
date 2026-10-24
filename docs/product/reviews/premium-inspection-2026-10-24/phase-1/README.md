# Phase 1: make every tap instant on phone (Oct 24, 2026)

Built on `development` at `a62aeec7`, on top of Phase 0. Measured on a local production build (`next build` / `next start`) with fictional data, Chromium, phone at 390 px. These are interface changes only: no server, data, authorization or API contract change.

## What a tab tap looked like before

Owner and Manager pages went through three different screens:

1. An old-design shimmer placeholder (teal band, cards and a grid). React 19 holds a placeholder for at least 300 ms, even though Schedule's data arrived in 38 ms.
2. The access frame's text panel, "Current view needs a fresh check". The frame re-checks access after the page arrives and then fetches the page a second time.
3. The page.

## Result

| Tap (Owner) | Before (1×) | After (1×) | Before (4× CPU) | After (4× CPU) |
|---|---|---|---|---|
| Schedule | 411–420 ms | 115 ms | 452 ms | 205 ms |
| Today | 452 ms | 177 ms | 455 ms | 195 ms |
| Team | 416 ms | 126 ms | — | 125 ms |
| Inbox (title; its list then loads in place) | 338–476 ms | 28 ms | 343 ms | 54 ms |
| More | 344 ms | 33 ms | — | 42 ms |

What you see now:
- the tapped tab turns teal at once (about 35 ms);
- one static Quiet page shape appears (about 40 ms);
- then the page (about 125 ms).

See `after-*-tap-filmstrip.png`. Scrolling still shows 0 long tasks and 0 slow frames, at 1× and 4× CPU.

## Changes

| Change | Files |
|---|---|
| Quiet tab bar and More load their pages ahead of the tap (full prefetch). The access frame still checks every page when it opens. | `app-shell.tsx` |
| The tapped tab lights up while its page loads (`useLinkStatus`). | `app-shell.tsx`, `quiet-shell.css` |
| One static Quiet loading shape (nav row, large title, 64pt rows) replaces the old placeholder and the frame's checking text in the Quiet shell. The text stays for screen readers. | `quiet/quiet.tsx`, `route-skeleton.tsx`, `scoped-read-frame.tsx` (one attribute and the shape only), `quiet/quiet.css`, `quiet-shell.css` |
| The shell looks for added or removed bars once per frame instead of on every DOM change, and re-measures only when they change. | `app-shell.tsx` |
| Spinners exist only while something is working (they used to run forever, hidden, on 41 buttons). | `signature/sig-button.tsx`, `components.css` |
| The 14 gsap page entrances are removed, so gsap is no longer in the app bundle. | the 14 motion wrappers and components |
| Static loading placeholders (no moving shimmer or sheen). | `portal-motion.css`, `signature/components.css` |
| Solid bars instead of live blur. The scroll-driven shadow becomes a static hairline. | `portal-motion.css`, `premium-clean-manager.css` |
| iOS vertical bounce is back; sideways drift stays blocked. | `portal-gusto.css` |
| Inter loads once as woff2. Five duplicate TTF declarations (876 KB each, plus a text reflow) are gone. | 5 CSS files; `app-error-screen.css` now tries woff2 first |

## Checks

- **Unit tests:** vitest 9,601 passed, 0 failed, 801 skipped. Typecheck and eslint clean.
- **New regressions:** Quiet skeleton, tab prefetch and pending feedback, idle spinner, no gsap imports.
- **Browser:** Chromium phone timings and filmstrips; Owner, Employee light and dark, and desktop captures with no visual change except the static header hairline.

## For Codex: the remaining server time

1. **The access frame fetches each page twice.** On mount it reads `/api/company-access/operational-authority`, then requires a page observed *after* that read, so it always calls `router.refresh()` or `replace` for a second server render.
   - Hosted, that is an extra authority round trip plus a second full page render on every tab tap.
   - Idea: let the page's own render carry the authority observation, or accept a page rendered within N ms of a fresh authority read, so one render suffices. This is a security decision for Codex.
2. **The frame also refreshes the open page about every 10 s** (65% of the 15 s validity window): one server render every 10 s per open Owner or Manager page.
3. **Server waterfalls:** `cache()` for `getSession`, `requireSessionMutationProof` and `getWorkspace`, plus `Promise.all` in Home and Schedule (plan 1B).
4. **Preloads run the layout's session reads.** Every Link prefetch, including the automatic loading-state ones for in-page rows (10–20 per screen), renders `/app/layout.tsx`, which reads session, workspace and proof.
5. **Not changed:** polling. Notifications are polled at 30 s and the inbox count at 60 s, reused within 20 s; both are tied to the privacy design.
6. **Two identical "Schedule update" notifications** (one per published week). The label should name the week; that is server data.
7. **Hosted settings** (Jose and Codex): the Vercel preview toolbar, Neon autosuspend, and cold starts.

## Not covered

- **WebKit after sign-in:** Safari's engine drops the Secure session cookie on plain-HTTP localhost.
- **A real iPhone on the hosted preview:** needs a fictional test account there.
- **The GitHub cloud run.**
- **The CSS diet (plan 1C):** waits for Phase 2.
