## Exit round 4

October 19, preview `http://127.0.0.1:50933`. Full sweep on 5ce0d36 (app code as of b8a3bad); the band was re-measured on the exit commit ee088cf (summary "Details, pay and alerts."), the only change after it. Data: `$S/r4/`.

What ran:
- **Full sweep, Chromium:** 60 page loads and 480 measurements. Owner and Manager at 320, 390, 844×390, 768, 1024 and 1440, text at 100/125/150/200%. Ten states: ready, loading, empty (manager-empty), large (owner-large), failed, signed out, paused, offline, save pending and save failed. Every job completed (one retry allowed per job).
- **WebKit spot checks:** 16 loads and 120 measurements. Both roles at 320, 390, 768, 1024 and 1440, text at 100/150/200%, in ready, failed, save failed and paused.
- **Band re-check on ee088cf:** Chromium, both roles, every width and text size, in ready, loading and failed. 18 loads.

Checks per measurement are the same as rounds 1–3 (`analyze.py`):
- page edge and the band and card gaps;
- columns;
- card-head inset and baseline, and head height across states;
- details rows (inset, label and value baseline, value x, divider ends);
- rows (tile, icon, chevron and switch centring and insets, text gap, height, spill);
- the alert panel (centring and height against ready);
- the save-error icon;
- targets and overflow.

### Findings

None. No P0, P1 or P2 in this area.

### Checked and correct

- **Page geometry:**
  - Card edges are 16/16 at 320, 390 and 844×390. The desktop content column has a 16px inset (768 and 1024: cards at x 260).
  - Band to first card is 16px in every record and state on ee088cf (e.g. 320: band 104 / 119 / 170 / 212px tall at 100–200%, gap 16). Cards are 16px apart.
  - The band title lines up with the card text from 768 (title x 280 = card 260 + 20).
  - One column up to 768; two from 1024 with equal tops and widths and a 16px gutter. No sideways overflow anywhere.
- **Card head:**
  - The "Your details" head is the same height in all ten states at every width and text size. The only exception is the known sub-pixel 0.5px (55.5 vs 56) at 390 and 844×390 at 125%.
  - One-line heads keep the state word or action on the title's baseline, ending at card right − 20.
  - Every stacked state word and action starts exactly at the title's x (80 of 80 stacked samples, offset 0).
- **Contact rows (round 3's fixes):** Email and Phone always stack or sit side by side together.
  - Stacked at 320 and 390 at every text size, at 1024 at every text size, at 768 from 125%, and at 1440 from 150%: value at card + 20, divider from card + 20 to the card's right edge.
  - Side by side at 768/100%, 1440 at 100–125% and 844×390 at every size: the value starts at the same x as the other rows' values (card + 116 / 136 / 156 / 196 at 100/125/150/200%).
  - The same in every state, both roles. WebKit matches.
- **Details:** dividers from card + 20 to the edge. Labels at card + 20, and value and label baselines within 0.75px wherever they share a line, held notes included.
- **Rows:** no deviation in 600 Chromium and WebKit measurements.
  - Tiles at card + 20, centred on their rows with the icon centred in the tile.
  - Text 12px after the tile; chevrons and switches centred and 20px from the right.
  - The loading rows are the ready rows' size, and nothing spills.
- **Alerts list:** the Notifications card is the same height in loading, failed, signed out, paused and offline as ready, at every width and text size, both roles (0 differences, both browsers). The panel is centred over its hidden copy and its button is 52px tall.
- **Save failed:** the icon centre is within −0.02 to +0.49px of its line's middle at every size (48 Chromium samples), and the text hangs 6px after the icon.
- **Targets:** none under 44px on phones or 24px on desktop.

Notes (not filed):
- The details card is shorter on a first loading or failed read than when ready (e.g. Manager 320: 571 vs 615). That's ST-03 in the stability area, where Manager at 320 is set aside.
- At 1440/100% the content column's x moves by up to 2px between loads (band x 279.63 to 281.72), with cards always 16px inside the band. That's the shared desktop frame, not this page.
- One Chromium record of Manager failed at 320/150% measured the band at 134px instead of 170. Two reruns gave 170 for both roles and both states (summary on two lines at 248px), so I treat it as a transient.

Open P0–P2 in alignment: 0
