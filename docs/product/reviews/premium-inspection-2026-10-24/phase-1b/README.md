# Phase 1b: server speed (Oct 24, 2026)

Jose moved the server items from Codex to Claude: "you will have to handle everything". Built on top of Phases 0 and 1 (`5e2dd7a8`). Measured on a local production build with fictional data (Chromium, phone, Owner).

## What changed

| Change | Files | Rule kept |
|---|---|---|
| **One read per request.** Session, mutation proof, workspace and operational authority are each read once per server render, shared by the layout, the page and its components (React `cache`). | `lib/auth/session.ts`, `lib/data/workspaces.ts`, `lib/company-access/operational-scope.server.ts` | **Session and proof:** keyed on the session cookie's token, so a new or removed cookie never reuses an old answer. **Workspace and authority:** only the default executor path is shared; transactions and tests read fresh, and `withOperationalCompany` keeps its own in-transaction check. Server Actions run outside the render cache. |
| **One access fence per browser tab.** Before, every frame fenced itself after mount: an authority read, then a second page render newer than it. Now any retirement (hidden, blur, pagehide, offline, storage, pageshow, online) is recorded once per tab. The cutoff is the server observation of the first authority read after that retirement. | `components/company-access/scoped-read-frame.tsx` | A frame skips its own fence only if no retirement happened since the tab's cutoff, the page was rendered after the cutoff, its authority matches the fence, and it is inside its 15 s window with a second to spare. Otherwise it fences exactly as before. A page that ages out, or the mount barrier itself, re-checks that page but does not clear the tab's fence. |
| **Periodic refresh re-renders only the open page.** It uses a same-address replace instead of `router.refresh()`, which emptied the whole router cache every ~10 s so every tab re-rendered in the background. If no newer page arrives within 1.5 s (a prefetch answered from the cache), it falls back to a real refresh. | same | The 15 s validity window and its 65% proactive refresh are unchanged. |

## Result

| | Before (Phase 1) | After |
|---|---|---|
| Requests while a page sits idle for 25 s | 28 | 4 (the page's own refresh twice, notifications twice) |
| Server work per tab tap | authority read + second page render + 4 tab re-prefetches | none when prefetched and fresh |
| Tab tap, fresh | ~125 ms | 37–78 ms |
| Tab tap after 22 s idle | — | 178 ms (one check, one fresh page), then the next tap 42 ms |

On the hosted preview each avoided request is a network round trip plus database time. The saving there is larger than these local numbers.

## Tests

- **New:** `scoped-read-frame-tab-fence.test.tsx`, 11 cases:
  - the fast path;
  - each of the 6 retirement events forces a new fence;
  - a different authority fences again;
  - a page older than the cutoff fences again;
  - a fresh tab fences first;
  - a stale prefetch outside its window fences again.

  These fail on the previous frame.
- **Existing tests unchanged and passing:** frame retirement and recheck, session, data and authority tests.
- **Full suite:** vitest 9,612 passed, 0 failed, 801 skipped. Typecheck and eslint clean.
- **Browser timings:** fresh taps, idle request counts, and taps after 22 s idle. No blank or stuck state.

## Not covered

- **The release browser suites** (70 Phase E cells, attendance, SQL) and the 12-job GitHub run. The access frame is release-relevant, so it should get the full cloud run before the dev preview update.
- **WebKit after sign-in, and a real iPhone.**
