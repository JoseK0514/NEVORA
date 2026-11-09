# Direction B mocks for the remaining surfaces (NEVORA)

Jose approved "Direction B" for Owner/Manager (phone + desktop >=1024) and Employee (phone). It is built and live in the
code. Now the remaining surfaces need mocks in the SAME system for Jose's approval BEFORE anything is built:
Lead (phone + desktop), Employee desktop, tablets (768–1023px, all roles), and the pages outside the signed-in app
(sign-in, activate, forgot/reset password, welcome, account deletion, Privacy/Terms/Support, 404) plus the Clocker tablet.

## The system (match it exactly)
- Rules: /home/user/NEVORA/DESIGN.MD sections "Owner and Manager phones: Direction B", "Owner and Manager desktop:
  Direction B", "Employee phones: Direction B" (+ the Nov 7 filled-data notes). Inter; teal #0B6E69 / band #0C726C→#08504C;
  ink #111517; grey #6A7176; canvas #F2F5F4; white cards 22px radius, soft layered shadow; pills; Phosphor bold icons in
  36px tinted circles; chips 22–24px; 46–48px fields 14px radius; light only.
- Approved mock sources you should REUSE (copy into your own folder, don't edit the originals):
  - Phone kit + screens: scratchpad/emp-mock/ (kit.py, style.css, screens.py, pages_*.py, build.py, render.py; shots/ has
    the rendered Employee phone frames e-*.png) and scratchpad/mock-all/ (ph-o-*.png Owner phone frames).
  - Desktop kit + screens: scratchpad/desk-mock/ (dkit.py, build.py, pages_*.py; shots/<slug>.png = 1440 Owner desktop frames).
- What is BUILT (screenshots of the live code, fictional data): Owner desktop /tmp/nevora-own16 (owner-<slug>-1440.png),
  Owner phone /tmp/nevora-own16 (-390), Employee phone and the CURRENT Employee desktop /tmp/nevora-eb13
  (owner-<slug>-390.png / -1440.png = employee James Ortiz), tablets today /tmp/nevora-eb12/state-*-900.png and
  /tmp/nevora-own16/state-home-900.png, landscape phone state-*-844x390.
- Data: fictional only (e.g. Northside Café & Bakery, Calle Loíza / Condado, people Ana Colón, James Ortiz, Maria Rivera,
  Carlos Vega). Show what the real pages show — read the real page components under /home/user/NEVORA/src (read-only)
  so each mocked page has the real content, actions and states; don't invent features. Data rules: employees see no pay
  amounts on statements and no coworker data unless the page already shows it; no fake numbers where the app has none.

## Output (per agent, in your own folder scratchpad/<your-folder>/)
- A self-contained HTML mock (no external assets except Google Fonts Inter) with every page of your surface as framed
  screens (phone 390×844 frames; desktop 1440×900 frames; tablet frames at the stated size), a short title and a 1–2 line
  note under each frame explaining the choice, and clear section headings. Rendered PNGs of each frame in shots/ (use
  Playwright: require('playwright') works; chromium.launch()). Also one overview PNG.
- Do NOT touch /home/user/NEVORA (read-only). Do not run the app's harness unless your brief says so.
- Final message: path of the HTML, list of frames, the main design decisions (and any open question for Jose), and what
  each page shows. Keep it concise.
