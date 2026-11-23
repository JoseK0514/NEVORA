# Confirmation on the final app code, 2026-11-23 21:55 UTC

`4597febf3` = `7201e71c` + `397f37d0` (Time off empty card below its tabs; Publish "What this measures" ring).
Production builds over the owned https proxy, fictional data, Owner.

| Check | Result |
|---|---|
| Unit | 16,331 passed; 1 failed: manual-publication (guides rebuilding on this tip) |
| readiness-ui-browser, production | **Pass**: Chromium 7/7, WebKit 7/7, 0 page errors |
| Reach 390, `/app/requests` empty | **Pass**: every control reaches 44px; axe clean |
| Reach 390, `/app/requests` with 2 pending + 1 approved time off requests | **Pass**; axe clean |
| Reach 390, `/app/schedule/publish?week=2026-11-30` (next week, unpublished) | **Pass**; axe clean |
| Reach 390, `/app/schedule/publish` (this week, draft with 2 shifts) | "What this measures" (36×36) still short: left/right land on `form.c-publish__go`, up/down on the row detail. axe clean |

Visual check of `/app/requests` empty at 390: the "You're all caught up" card sits below the tabs with a clear gap; no
overlap or clipping.

The remaining item passes WCAG 2.5.8 (24px) and only misses the 44pt goal, in the draft-week state ds-pages didn't
test (the ring is covered by the publish form and the row detail around it there).
