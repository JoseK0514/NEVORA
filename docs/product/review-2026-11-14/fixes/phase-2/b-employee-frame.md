# Package B: the Employee and Lead desktop and tablet frame

One file changed: `src/app/app/employee-b-desktop.css` (140 lines added, 7 changed). No component, no wording, no server code.
Every new rule is inside `(min-width: 768px)`. Patch: `b.patch` (diff of `c545bea5` to the last temporary commit in `wt/p2b`).

## What changed

Numbers are pixels from the top of the window at 1440. The same band and title numbers hold at 1100, 1024, 900 and 768.

**Every page**

- Title top: 88 with no back link, 130 under a back link. Before it was 88, 98, 126 and 136. Home stays at 109.
- A band action no longer pushes the title down. It is centred on the title's 38px line (action 83 to 131, or 125 to 173 under a back link). The Owner pages already do this.
- Band bottoms are 196, 224, 296 or 363 on every route measured. Before they were 156, 179, 194, 217, 222, 228, 260, 270, 283, 293, 294, 335, 348, 357 and 363.

**The four tabs with figures on the band**

| Page | Title top | Band bottom | Figures | First card top |
|---|---|---|---|---|
| Home | 109 to 109 | 363 to 363 | 179 to 283 (same) | 311 (same) |
| Time | 88 to 88 | 335 to 363 | 173 to 255 becomes 179 to 283 | 283 to 311 |
| Pay | 98 to 88 | 348 to 363 | payday block ended at 268, now 283 | 296 to 311 |
| Requests | 88 to 88 | 357 to 363 | 173 to 277 becomes 179 to 283 | 305 to 311 |

The shared height is 363. That is Home's need: a 21px greeting, a 46px title, 24px, a 104px figure strip, then 80px of band that the
first card lifts 52px over. Time, Pay and Requests now put their title block in the same 67px (88 to 155) and their figures on the
same lines as Home, so the strip and the first card do not move when you change tab. Time's two-line figures sit centred in the
104px strip. Pay has no strip, so its payday block ends on the strips' bottom line.

**Schedule**: band 293 to 296.

**Pages with a strip (tabs, search, identity row)**: Time off list 270 to 296 (title 136 to 130). Pick up and swap 260 to 296
(title 126 to 130). Your correction requests 283 to 296. Notifications 222 to 296. Updates 228 to 296 (title 98 to 88; the search
row sits 22px under the title instead of 16, so the action clears it). More 294 to 296 (title 126 to 130).

**Back link, title and one line (224)**: Availability 217 to 224. Pay history, Pay statement, Privacy, Terms, Support, Account
deletion, Alerts on this device, Delete account, Write an update: 217 to 224.

**Short band (196)**: Profile 156 to 196. Help and Add to calendar 179 to 196. Restricted, not found, Request time off, Fix my time,
Past timecards, a day's time, a request's details, Swap shift, Offer for cover, Can't work this shift: 194 to 196.

**Availability (EM-001)**: the week card started at 177, 40px over the band, and covered the sub-line and half of Change one
week. It now starts at 248, 24px under the band. The band runs the grid's width, so Change one week ends at 1376, the card's
right edge (it ended at 1108).

**Fix my time**: the card started at 154 and covered the title. It now starts at 220. The field column is 560 (was 557), Start and
End are 272 each with 16 between (was 272 and 273 with 12), Send is 96 by 48 (was 83 by 38). The page stays a 1080 two-pane form.

**Request time off**: the card was 1080 wide with two 516px date fields and a 1042px text box. It is one 812 card. From and To are
272 each, 16 apart. The text box and the notice are 560. Send request is 147 by 48 and ends on the field block's right edge (875).
It was 140 by 40 at the card's edge. The Reason field now shows the teal focus ring on keyboard focus (it drew none, before too).

**Swap shift, Offer for cover, Can't work this shift**: card 1080 to 812. Content 560 wide. The send button was a 1042 by 40 bar.
It is a 48px pill at the field block's right edge.

**A time-off request's Withdraw card**: 1080 to 812, 20px under the first card (was 44). Its button is 560 wide (was 1042).

**Write an update**: on tablets and desktop this form had no layout at all (labels and fields ran together on one line, a raw
browser button). It is one 812 card on the grid's edge, each label over its field, fields 560 wide, Review audience a 48px teal
pill at the block's right edge. It also sat 40px over the band and covered the sub-line. It starts 24px under the band.

**Delete account**: the two cards touched (no gap) and the right one started 28px lower. They are 20px apart and start on one line
(248). On a tablet the confirm block stops at 560 (was 718) and follows the cards at 20px (was 76).

**State cards** (restricted, not found, a page that didn't load): 1080 wide to 560.

**Help at 1024 and wider**: Contact and Common questions share the first row and end together (492). Privacy and terms runs the
width under them, then How to, 20px apart. Before, Contact stood over a 242px hole and How to started 60px under the last card.

**More at 1024 and wider**: Sign out sits on the left card's bottom line (634). The right column ended 52px short before.

**Loading**: the placeholders read the new heights, so a tab does not jump when it lands (Schedule 296; Time, Pay, Requests 363;
Notifications and Updates 296; any pushed page at least 196).

### Full after table, Employee, 1440

| Route | Title top | Band bottom | Gap to first card | First card width | Content right | Band action right | Widest field |
|---|---|---|---|---|---|---|---|
| /app (Home) | 109 | 363 | -52 | 599 | 1376 | | |
| /app/schedule | 88 | 296 | -52 | 1080 | 1376 | 1376 | |
| /app/my-time | 88 | 363 | -52 | 644 | 1376 | 1376 | |
| /app/my-pay | 88 | 363 | -52 | 530 | 1376 | 1376 | |
| /app/requests/hub | 88 | 363 | -52 | 1080 | 1376 | 1376 | |
| /app/requests (Time off) | 130 | 296 | 24 | 812 | 1108 | 1108 | |
| /app/requests?filter=decided | 130 | 296 | 24 | 812 | 1108 | 1108 | |
| /app/requests?tab=new (form) | 130 | 196 | 24 | 812 | 1108 | | 560 |
| a time-off request | 130 | 196 | 24 | 812 | 1108 | | |
| /app/exchange | 130 | 296 | 24 | 530 | 1376 | | |
| /app/exchange?tab=foryou | 130 | 296 | 24 | 505 | 1376 | | |
| /app/exchange?tab=requests | 130 | 296 | 24 | 530 | 1376 | | |
| a shift request (Can't work, Swap request) | 130 | 196 | 24 | 530 | 1376 | | |
| /app/exchange/swap (Swap shift, Offer for cover) | 130 | 196 | 24 | 812 | 1108 | | |
| /app/exchange/callout | 130 | 196 | 24 | 812 | 1108 | | 560 |
| /app/availability | 130 | 224 | 24 | 1080 | 1376 | 1376 | |
| /app/availability?week= | 130 | 224 | 24 | 1080 | 1376 | | |
| /app/notifications | 88 | 296 | -52 (card top 244) | 812 | 1108 | | |
| /app/updates | 88 | 296 | -52 (card top 244) | 812 | 1108 | 1108 | 682 (search on the band) |
| /app/updates/compose | 130 | 224 | 24 | 812 | 1108 | | 560 |
| /app/profile | 88 | 196 | 24 | 812 | 1108 | | |
| /app/profile/calendar | 88 | 196 | 24 | 530 | 1376 | | |
| /app/profile/privacy, /support, /account-deletion | 130 | 224 | 24 | 780 (beside a 280 contents list) | 1376 | | |
| /app/profile/device-alerts | 130 | 224 | 24 | 812 | 1108 | | |
| /app/account/delete | 130 | 224 | 24 | 578 | 1376 | | 436 |
| /app/more | 130 | 296 | 24 | 530 | 1376 | | |
| /app/help | 88 | 196 | 24 | 530 | 1376 | | |
| /app/payroll, /app/nope, /app/requests/new | 130 | 196 | 24 | 560 | 856 | | |
| /app/my-time?view=corrections | 130 | 296 | 24 | 812 | 1108 | 1108 | |
| a correction request | 130 | 196 | 24 | 812 | 1108 | | |
| /app/my-time?view=corrections&edit=new (Fix my time) | 130 | 196 | 24 | 1080 | 1376 | | 560 |
| /app/my-time?view=cards | 130 | 196 | 24 | 589 | 1376 | | |
| /app/my-time?entry= | 130 | 196 | 24 | 812 | 1108 | | |
| /app/my-pay?view=history | 130 | 224 | 24 | 1080 | 1376 | | |
| a pay statement | 130 | 224 | 24 | 1080 | 1376 | | |

At 900 the grid is 764 wide (108 to 872). Title tops and band bottoms are the same as above on all 47 routes. Cards are 764, state
cards 560, form fields 560 (Fix my time's field column is 426). At 768 the grid is 632; fields 560 (Fix my time 294).
At 1100 and 1024 the grid is 900 and 824; the 812 column pages stay 812.

Lead, 1440 and 900: the same 47 routes give the same title tops and band bottoms (94 rows: 8 at 363, 26 at 296, 22 at 224, 38 at 196).

## Rules behind it

- Frame rule 1 (title 88 or 130): the back link keeps 32px with 10px under it (was 6); the title row aligns to its top.
- Frame rule 2 (band 196, 224, 296): `min-height` on the hero from `--b-band-short`, `--b-band-sub`, `--b-band-strip` less
  `--b-title-top`. The band under a back-link title is 28px (was 30), so 130 + 38 + 28 is 196. Content that needs more still grows.
- Frame rule 2, package B's call: the four figure tabs share 363 (Home's own height).
- Frame rule 3 (card to band): pages that lift 52px still lift 52px. Pages under a back link start 24px under. Notifications and
  Updates (sidebar pages with a strip) lift 52px, by the integrator's decision after the first report. The three kept forms that
  lifted 40px over a short band (Fix my time, Availability, Write an update) now start 24px under it, because the lift covered the
  title or its line. The only new overlap is the Notifications and Updates lift, which the integrator asked for.
- Frame rule 4 (widths): work pages 1080; opened pages and kept forms 812; field block 560 with 272 + 16 + 272; state cards 560.
- Frame rule 5 (one right edge): each band action ends on its page's content edge (1376 or 1108).
- Kit rule from Nov 14 (one footer button is a 48px pill sized to its label, never a bar): applied to the forms' send buttons.
- CSS: all `!important` inside `@layer nv-b`; only `(min-width: 768px)`, `(min-width: 768px) and (max-width: 1023px)` and
  `(min-width: 1024px)`; no colour literals added; tokens read from `b-tokens.css`.

## Checks run

- `npx vitest run src/app/app/b-viewport.test.ts src/app/app/b-foundation.test.ts src/app/b-tokens.test.ts`: 77 passed (after the last edit).
- `npx vitest run --dir src src/app src/components`: 300 files, 3107 tests passed, none failed (the known
  `src/test/manual-publication.test.ts` failure is outside this command's two folders, so it did not run). It ran on the commit before the last; the one edit after it replaced a
  white literal with `transparent` in one CSS rule.
- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no error in app code. It reports 6 errors, all in `zz-scan/`
  (the capture tool, not in the patch). Run before the last three CSS edits; no TypeScript file changed.
- ESLint: not run. No ts or tsx file changed.
- Browser capture, real app, fictional data, with `cap.sh` (I added a local probe and a "follow the first link" step inside
  `zz-scan/` only, to reach request details; not in the patch):
  - Employee, 47 routes at 1440, 1100, 1024, 900 and 768: 235 rows, every title at 88, 130 or 109 (Home) and every band at 196,
    224, 296 or 363. `overflow` 0 on all. No `pageerror`. The only console strings are two 403s on `/app/payroll` (the restricted
    page, same as before).
  - Lead, the same 47 routes at 1440 and 900: 94 rows on the ladder, overflow 0.
  - Phones, 390 and 320: I captured the same 47 routes on `c545bea5` and on my commit and compared the PNGs. All 94 full pages
    have the same height. 142 of 188 images are identical to the pixel. The other 46 differ by at most 0.26% of pixels, and the
    difference boxes sit on clock text (hours worked so far, notification times, a sent time) and on a 2px spot on the bell's dot.
    I looked at Time, Request time off and Write an update at 390: unchanged.
  - Keyboard focus at 1440 (Tab onto each control, read the computed outline): band actions and back links show the 2px white
    ring; Send request, Send, Send to manager, Withdraw request, Review audience, Sign out and the state card's button show the 2px
    teal ring; Write an update's fields show the teal ring.
  - I looked at the after pictures at 1440 and 900 for every page named above, and at 768 for the two main forms.
- The full matrix ran on commit `6ce224a5`. Two CSS edits came after it: the Reason field's focus ring, and `transparent` in
  place of a white literal on Write an update's fields. Each was checked with a small run only (Request time off, Write an
  update, Can't work this shift, Time, Notifications at 1440, 900 and 390): same numbers, overflow 0, rings present, fields
  still white. The seed's shift times follow the clock, so later runs differ from earlier ones in time text only.
- Follow-up (commit `401e93c7`, the Notifications and Updates lift): stylesheet tests 77 passed; capture of Notifications, Updates,
  Schedule, Time off, Profile, Write an update, More and Time for the Employee at 1440, 1024, 900, 768, 390 and 320 and the Lead at
  1440 and 900: overflow 0, the other six pages keep their numbers. Phones: Notifications and Updates have the same heights at 390
  and 320 as on `c545bea5`; Updates is pixel-identical, Notifications differs only in its time column. The full unit suite and tsc
  were not rerun for this two-rule CSS change.
- Not run: `prefers-reduced-motion` off (the capture always runs with reduced motion on; I changed no motion). Dark mode (the
  product is light only). Real touch on a tablet.
- Not reached: states that need other data. A tab with no figure strip (see below), Fix my time opened on one shift (`edit=missing:…`),
  the Updates detail page (the fictional updates open in place), Write an update's "Review before sending" step, Request time off's
  "Part of day" and its sent receipt, a calendar link already created, error states of each list.

## Pages off the ladder or left alone, and why

- **363 is not a token.** Home, Time, Pay and Requests end at 363. `b-tokens.css` says Home keeps its own. I wrote `363px` in the
  rule. If you want a name, see "Needed from another package".
- **A figure tab with no figures** (Requests with nothing waiting, Pay with no payday, Time when its read fails) is not held at
  363: it keeps its natural height (about 206 to 229) so the title does not sit over 160px of empty band. I could not reach these
  states with the fictional data, so they are not measured.
- **A strip page while it loads** (Time off, Pick up and swap, correction requests) shows the 196 band until the tabs arrive, then
  296. The same kind of jump existed before (194 to 270). Notifications and Updates are fixed because the sidebar tells the page.
- **Fix my time** stays a 1080 two-pane card (what to fix on the left, the 560 field block on the right). In an 812 card the left
  list would be 180px wide.
- **Privacy, Terms, Support, Account deletion** stay 1080: a 280 contents list beside a 780 reading column.
- **Pick up and swap, a shift request's details, Past timecards, Add to calendar, Pay statement, Pay history** stay 1080 (two
  columns or a table).
- **More's Profile and settings** button ends at 1360. It sits inside the glass identity row, 16px in from the row's edge (1376).
  It is not a title-row action, so I left it.
- **Availability for one week** (`?week=`): Submit this week is still a full-width bar in the 1080 week card. The card is a list
  editor, not a field block, so I left it.
- **Delete my account** still spans its confirm block (a destructive confirm, set that way on Nov 8).
- **Withdraw request** is still a bar, now 560 wide. It has one line of help under it.
- Fix my time's card has a tight top inset (its first label is 10px under the card's edge). It was like that before. Not touched.

## Wording changed

None.

## For Jose to decide

1. **Notifications and Updates (decided by the integrator, done).** These two sidebar pages have a strip and no back link. Their
   first card now lifts 52px over the 296 band, as Schedule's does: card top 244 (was 320), tabs end at 192 and the search at
   194, so 52 and 50px of band stay clear above the card (was 104 of plain band under the strip). One rule: a sidebar page with
   a strip lifts its first card 52px; a page under a back link starts 24px under the band. The band is held at 296 and the lift
   applies in every state of these two pages, the loading placeholder included, so nothing moves when the page arrives. Measured
   at 1440, 1024, 900 and 768 (Employee) and 1440 and 900 (Lead): title 88, band 296, card top 244 on all. The loading state
   itself was not captured; it follows from the rule, which is keyed on the sidebar's current page, not on the tabs.
2. **Time's figures** are two lines in a three-line strip, centred. If you prefer the strip to hug its two lines, Time's band
   would be 341 and the four tabs would not share a height.
3. **Send buttons on Employee forms are now 48px pills at the field block's right edge** (Send, Send request, Send swap request,
   Send to manager, Review audience). Fill and tint are unchanged. Say so if any of them should stay a full bar.
4. **Help's Contact card stretches** with Common questions only when no question is open. When one opens, Contact keeps its
   height and the two cards end apart until it closes.
5. **Write an update on desktop and tablets** got a layout it did not have. Please look at `b-shots/10-write-an-update-1440.png`.
   The "Review before sending" step uses the same rules but I could not reach it.

## Needed from another package

- `src/app/b-tokens.css`: a token for the figure band, for example `--b-band-figures: 363px`, then replace the literal in
  `employee-b-desktop.css` (one place) and the 275px placeholder value.
- `src/app/app/b-foundation.css` lines 663 to 667 hold the old Employee placeholder heights (205, 247, 259, 269). I override them
  from `employee-b-desktop.css` with a stronger selector. Whoever owns b-foundation can set them there and delete my override.
- `src/components/employee-mobile/messages.css`: every rule for the Write an update form is inside `(max-width: 767px)`. I added
  the tablet and desktop layout in `employee-b-desktop.css`. If that form gets a kit of its own, these rules can move.
- The Reason field on Request time off shows no focus ring on phones either (the ring in `requests.css` line 167 loses to an
  `outline: none`). I fixed it at 768px and wider only, because phones are frozen for this package.
- `loading.tsx` files were not touched. Their bands follow the placeholder values above.
- `DESIGN.MD` has no entry for the Phase 2 frame yet. Whoever writes it can take the numbers from this report (363 for the four
  figure tabs; kept forms 24px under the band; send buttons as 48px pills at the field block's edge).

## For Codex

Nothing. No server read, handler, route or data contract is involved.

## Release sequence and evidence

Source: detached worktree `scratchpad/wt/p2b`, base `c545bea5`, last temporary commit `401e93c7`. Never pushed, no branch.
Environment: local only (owned local Postgres, fictional seed, real sign-in in a local browser). No development or production
deploy, no real notifications, no paid service. Development stays the acceptance release; promotion to main needs Jose's approval.
