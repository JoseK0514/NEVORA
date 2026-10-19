## Exit round 4, IS-16 re-check

Build `caef395`, preview on port 50933. A narrow re-check of IS-16 and the focus code it shares with IS-02, IS-13 and IS-15. Saves and reads were answered in the browser, and Sign out was never pressed. Output is in `.../inspect/interaction/r5/all.txt`; screenshots are `shots/r5-*`.

### IS-16: fixed

After a successful retry from the alerts panel, focus goes to `UL#profile-alerts-list`. That list is on screen in every case below, has `:focus-visible` with an inset ring (outline offset −2 px), and the next Tab goes to the first switch, "Time-off requests".

| Browser | Role | Width | List on screen (top–bottom, viewport 844) | scrollY before → after |
|---|---|---|---|---|
| Chromium | Manager | 390 | 376–676 | 770 → 770 |
| Chromium | Manager | 320 | 325–685 | 883 → 927 |
| Chromium | Owner | 390 | 308–676 | 818 → 818 |
| Chromium | Owner | 320 | 325–773 | 863 → 863 |
| WebKit | Manager | 390 | 376–676 | 770 → 770 |
| WebKit | Manager | 320 | 316–676 | 892 → 936 |
| WebKit | Owner | 390 | 308–676 | 818 → 818 |
| WebKit | Owner | 320 | 228–676 | 960 → 960 |
| Chromium | Manager | 1440 | 590–870 | 0 → 0 |
| WebKit | Owner | 1440 | 590–938 | 0 → 0 |

For the Manager at 320, the 44 px change in scrollY is the browser keeping the view in place while the Your details card above grows when the read arrives. That growth is ST-03's set-aside. The list stays on screen. Screenshot: `shots/r5-panel-retry-AUDIT-M-390-chromium.png` (the ring sits around the four switches, and Sign out is below).

### Shared focus code, re-checked

- **Retry from the card head**: on success at 390 (Owner, Chromium) and 320 (Manager, WebKit), focus goes to `DL#profile-details-list` with `:focus-visible` and an inset ring. The status says "Your details loaded." once (1,522 ms and 1,534 ms). A failed retry keeps focus on the button (102 px wide) and the alert changes to "Still couldn’t load…".
- **No repeat after leaving**: after a retry, leaving and returning gives "Updates paused" → "", with no second "Your details loaded.". The return makes 1 read; a bare focus makes 0.
- **IS-13**: keyboard focus on "Shift requests" comes back after leaving and returning (Chromium at 390, WebKit at 1440), and the next Tab goes to "Unable to work". A save 401 followed by a read 401 moves focus to the panel's Sign in link. A save that fails because the connection dropped gives the switch focus back once online, with the row at 68 px and Sign out at 1510.
- **IS-15**: at 390, tap a switch, scroll to the top, leave and return: scrollY stays 0. At 1440, click a switch, click blank sidebar space, wait for a background read: focus stays on BODY.

Open P0–P2 in interaction and states: 0
