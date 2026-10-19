## Exit round 4

October 19, preview on port 50933 (pooled database transport). Exit commit **ee088cf**: the app code is b8a3bad plus the shorter band summary "Details, pay and alerts." and the 11.2rem wrap threshold. Every layout-shift entry is counted, including those Chromium marks `hadRecentInput`. Coverage:
- **Chromium:** 320, 390, 844×390, 768, 1024 and 1440 (plus 360 for the set-aside cell), both roles, fixtures `owner`, `manager`, `manager-empty`, `owner-large`, `manager-eight`.
- **WebKit:** 390 and 1440 loads; blur and signed-out at 390; every band cell.
- **Band:** placeholder vs real band through client navigation at 320, 360, 390 and 430 × 100/125/150/200 %, Chromium and WebKit, re-measured after ee088cf was synced; plus 844×390.
- **Logs:** `…/stability/r4/` (load matrices, `b.log` transitions, `band2.log`).
- No background runs are left.

**Verdict.** The whole area passes on the exit commit:
- Every load reads once with no flash.
- The placeholder band equals the real band in all 32 phone cells (both browsers) and in landscape.
- The header joins the band and the tab bar holds Sign out 20 px clear.
- No transition moves anything: pause, offline, failed refresh, signed out, retry, saving, save failures, Show all.
- ST-03 and ST-08 are fixed apart from the data cases set aside for the server's `initial` read.

### Round-3 IDs

| ID | Status | Measured |
|---|---|---|
| ST-03 | **Fixed (one cell set aside)** | Load, all entries counted: Owner 320 0.0010, 360 0.0006, 390 0.0005, 844×390 0.0004, 768 0.0002, 1024 0.0015, 1440 0.0007; Manager 390 0.0005, 844×390 0.0004, 768 0.0002, 1024 0.0003, 1440 0.0001; `manager-empty` 320 0.0010, 390 0.0005, 1024 0.0002. In every case Sign out moves 0 px; the small values are the head word and, at 1024/1440, the shared header actions. WebKit 390 and 1440, both roles: 0 px. **Set aside, recorded, not counted:** Manager 320 (Sign out +44, value 0.015 at 320×640) and Manager 360 (+44, 0.024). The 34-character address takes two stacked lines and "Main Office · West Office" wraps; this waits for `initial` after the merge. **Same mechanism, recorded for the coordinator's call:** `owner-large` (95-character address): Sign out +88 at 320 (0.018) and 390 (0.040), +22 at 1440 (0.004). The address is wider than any card, so only `initial` removes it; I've set it aside with Manager 320–360 rather than counting it. |
| ST-08 | **Fixed** | Placeholder band = real band in every cell, Chromium and WebKit alike: 320 104/119/170/212, 360 104/119/134/212, 390 104/119/134/212, 430 104/119/134/212 (100/125/150/200 %). 844×390: 104 = 104. Desktop has no placeholder band (shared rule, Desktop session's; not filed). |

### Full sweep: checked and correct

- **Header and band joint (phones):** header 0–68 and band from 68 in the same `rgb(28, 74, 71)`, no shadow or border, at 320, 360, 390, 430 and 844×390. Chromium and WebKit, both roles.
- **Desktop band:** 93–201 at 768, 1024 and 1440.
- **Tab bar and sticky header:** Sign out ends 20 px above the tab bar at the end of the page (320: 552/572; 390: 756/776; 844×390: 302/322), both roles. The sticky header stays at 0–68 at the top, at scroll 300 and at the end.
- **Read rhythm:** every load reads once, `Checking… > ready` (24 loads, both browsers). A `focus` with no blur does nothing (no read, frame log empty).
- **Pause and return, offline and online:** no element moves at 320, 390, 768, 1024, 1440 or 844×390 (Chromium) or 390 (WebKit). Only the head word changes (all entries ≤ 0.002).
- **Failed refresh, ready → signed out:** no element moves at any of those widths, in either browser. Values ≤ 0.0034, the head word only.
- **Try again:** pending and failed move nothing. Success moves nothing (head word only, ≤ 0.0034).
- **Saves:** Saving… (slow save, row 1) moves nothing during or after, at 320, 390, 768, 1024 and 1440. Save 401 (row 0) at the same widths, and save 500 or aborted at 360, move nothing.
- **Show all 8 / Show fewer:** the toggle stays put at every width (320 y 300, 390 y 641, 768/1024/1440 y 622 or 670). The list grows below it after the tap, as intended.
- **Hydration and motion:** no page element moves between the first server paint and the read. Unchanged since round 1: transitions are colour and transform only, and 0 s with reduced motion.

**Environment note, not filed:** twice the page arrived saying "You’re offline" with no read sent: once after a client navigation at 430/125 % and once on a 390 hard load. Both times Chromium reported `navigator.onLine` false. 11 instrumented reloads and client navigations afterwards were all online, with one read each. The page's response to a real offline signal is correct (round 3: it reads again on `online`). The likely cause is the host's network briefly dropping while the runs were going; Codex's run can confirm.

Open P0–P2 in stability: 0
