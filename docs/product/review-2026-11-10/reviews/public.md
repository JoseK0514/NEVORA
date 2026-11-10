# NEVORA signed-out pages: UI/UX review (Direction B)

Date: 2026-11-10. Review only; nothing in the repository was changed.

## Scope, method and coverage

**Surface:** everything under `/tmp/review/public/` (196 images, EN and ES, 320, 390, 768, 1024 and 1440):
- Sign in, including its error and empty states and keyboard focus
- Forgot password and New password, including the "bad" variants
- Activate account, including its "bad" variant
- Mobile Access Welcome, Access help and Find your Employee ID
- Privacy, Terms, Support and Account deletion
- 404
- The public Clocker setup page that the runner captured

**Judged against:**
- DESIGN.MD "Current direction" (line 356): the Direction B summary, and the "Sign-in and public pages" entry with its build notes (lines 1535–1556 and 1572–1578).
- The Mobile Access form card section (approved Oct 27, line 1328).
- Mock 7, `docs/product/direction-b/mocks/7-sign-in-and-public.html`. Its text and frame notes were read; the HTML was not rendered.

**Reference audits:**
- The code design-system audit and the copy audit were read first.
- This review doesn't repeat any of these again:
  - band-text alpha (C1)
  - band gradients (C8)
  - field-edge contrast (C6)
  - pill-radius sprawl (S4)
  - the `!important` ladder (L1)
  - the Spanish strings and the "Forgot access" vs "Forgot password" naming
  - the hard-coded English on desktop activation
- They are cited only where a screen shows a new instance.

**Numbers:**
- Measured values come from the 22 `.audit.json` files (390 and 1440 route shots), `_logs-public.json` (the h1 per page and width, plus the Tab-order walk at 390 and 1440 in EN and ES), and contrast I computed from the declared tokens.
- The EN/ES runner shots at 320, 768 and 1024 have no audit JSON (manifest `not_captured`). Findings at those widths are visual.

**What I looked at:**
- Every distinct route and state, at 390 and 1440, in EN and ES.
- Spot checks at 320, 768 and 1024 for every route.
- The four focus shots.

**What works and should stay:**
- No horizontal overflow at any width (`overflowX 0` in all 22 audits, and the runner's overflow is 0 at 320).
- Inputs are labelled with `<label for>`. Autocomplete tokens are right:
  - `username` and `current-password` (login/page.tsx:50, 54)
  - `email` (mobile-access/recovery-views.tsx:25)
  - `new-password` (activation-passwords.tsx:32–64, password-pair.tsx:17–18)
- Phone inputs are 16px or larger (mobile-access.css:34, `max(16px,1rem)`), so iOS won't zoom.
- The error is `role="alert"` and both fields point at it with `aria-describedby` (login/page.tsx:44, 50, 55).
- The busy Sign in button keeps focus and refuses a second press (login-submit.tsx:15–16). Its busy text is `aria-hidden` until pending, so the accessible name is just "Sign in".
- Keyboard order is logical:
  - Phone: skip link, wordmark, language, Employee ID, Password, eye, Forgot, Sign in, Activate.
  - Desktop: language, fields, eye, Sign in, Forgot, Activate, Need help?, footer.
  - A focus ring is visible at every stop.
- Desktop composition matches the mock: brand panel 600/1440, a 440px card, Español at the top right, "Powered by VELANI LLC" at the panel foot.
- The 404 dropped the decorative "404" as approved.

---

## 1. Sign in (`/login`)

### PB-001 · High · Tablet (768–1023): the greeting and workspace are white text on the light canvas
- **Images:**
  - public-signin-768-en.png and public-signin-768-es.png
  - public-signin-err-768-en.png and public-signin-err-768-es.png
  - public-signin-empty-768-en.png and public-signin-empty-768-es.png
- **What's wrong:**
  - "Good evening" / "Buenas noches" and the "Northside QA Workforce" chip render white at y≈120–165, under the 86px band, directly on `#F2F5F4`.
  - The contrast is about 1.1:1, so the page title and the workspace name are effectively invisible.
- **Principle:** WCAG 1.4.3 (text contrast); figure-ground.
- **Cause:**
  - With Mobile Access on, the greeting sits at `.q-auth__col > #access-content > .ma-card > .q-hd`.
  - The band selector list (auth-b.css:19) doesn't include that path, so no band is painted behind it.
  - auth-b.css:27 still forces `color:#FFFFFF` on every `.q-hd` descendant below 1024px.
- **Fix:** from 768 to 1023, put the title in ink on the card, as phones already do. Extend auth-b.css:196–205 (the `#access-content .q-hd` ink rules and the card) to a `(min-width:768px) and (max-width:1023px)` block. Alternatively, scope auth-b.css:27 to the same selectors as line 19 so it only whitens text that has a band behind it.
- **Scope note:** Mobile Access is off in production (DESIGN.MD:1576). With it off, the greeting is a direct child, which line 19 matches. Re-check after the fix.

### PB-002 · Medium · The wrong-password error doesn't mark the fields, has no icon, and differs between phone and desktop
- **Images:**
  - public-signin-err-390-en.png and public-signin-err-320-es.png
  - public-signin-err-1440-en.png and public-signin-err-768-es.png
- **What's wrong:**
  - Neither field gets a red edge. The mock draws both fields red and an icon in the note ("both fields get a red edge").
  - On phones the note is inset 20px on each side, so it's narrower than the fields: at 390 the note spans x 56–334 while the fields span 36–354. At 320 ES it wraps to three lines in a 208px box.
  - Phones use red `#B53327` on `#FDF0ED` (5.44:1). Desktop uses `#8F1C13` on `#FDECEA` (7.84:1). That's two reds and two washes for the same message.
- **Principle:**
  - Gestalt similarity: the same message looks different.
  - Proximity and common region: the note isn't aligned with the fields it describes.
  - Direction B: "red = stop", drawn the same everywhere.
- **Cause:**
  - login/page.tsx:41 sets `data-invalid` on the `<form>`. That matches neither quiet.css:166 (`.q-fl[data-invalid="true"]`) nor mobile-access.css:157 (`.q-in[aria-invalid="true"]`).
  - auth-b.css:155 adds `margin: 0 20px 18px`, which suits the desktop column but not the padded phone card.
  - mobile-access.css:56 holds the second red.
- **Fix:**
  - Render `aria-invalid="true"` on both inputs when `params.error` is set. That also lights the existing label rule at mobile-access.css:157.
  - Set the alert's margin to 0 inside `.ma-card`.
  - Add a Phosphor `WarningCircle` (bold, 20px) at the start of the note.
  - Use one alert token pair, `#8F1C13` on `#FDECEA`, in both files.

### PB-003 · Medium · Empty submit shows the browser's own bubble, in English on the Spanish page
- **Images:** public-signin-empty-1440-es.png and public-signin-empty-390-en.png
- **What's wrong:**
  - The native "Please fill out this field." tooltip appears with an orange "!". On the ES desktop page it is in English.
  - It covers the "Contraseña" label.
  - It isn't Direction B styling, and it bypasses the inline validation the portal uses (DESIGN.MD:86, `form-validation.tsx`).
  - The same will happen on New password, whose recovery code has `minLength={43}` (recovery-views.tsx). That gives "Please lengthen this text to 43 characters".
- **Principle:**
  - Jakob's law and consistency: the rest of NEVORA validates inline.
  - WCAG 3.3.1: the error must be identified in text, in the page's language.
- **Fix:** add `noValidate` to the sign-in, recovery and reset forms (login/page.tsx:41, recovery-views.tsx `<form className="q-auth__form">`). Then reuse `form-validation.tsx` so "Enter your Employee ID" / "Escribe tu ID de empleado" shows under the field, in red with the red edge from PB-002, and focus moves to the first empty field.

### PB-004 · Medium · Spanish desktop: the two links under Sign in break into ragged two-line pairs
- **Images:** public-signin-1024-es.png and public-signin-empty-1440-es.png
- **What's wrong:**
  - Inside the 336px card column, the links break as "¿Olvidaste tu / contraseña?" and "Activar / cuenta".
  - The first starts at the field edge and the second floats near the centre. They look like two orphaned blocks, not a link pair.
  - In EN they fit on one centred line (public-login-1440.jpg).
- **Principle:** Gestalt continuity and proximity; translation growth (better-layout, "plan for growth").
- **Cause:** auth-b.css:79 (`justify-content:center; gap:24px`) on a flex row that lets each link shrink and wrap internally.
- **Fix:** put `white-space:nowrap` on `.q-auth__links a` and `flex-wrap:wrap; row-gap:8px` on `.q-auth__links`. Each link then stays whole, and the pair stacks centred when it doesn't fit.

### PB-005 · Medium · Phone sign-in drops the greeting and leaves the band empty
- **Images:** public-login-390.jpg and public-signin-390-en.png / -es.png
- **What's wrong:**
  - The teal band is a 120px strip holding only the wordmark and Español.
  - The card's title reads "Sign in." with no greeting, and the workspace is a grey chip inside the card.
  - DESIGN.MD:1535–1537 says "Phone: teal brand area (wordmark, Español, greeting, workspace)… Keep the time-of-day greeting on phones". Mock 7 puts the greeting and the glass workspace chip on the hero.
- **Principle:** aesthetic-usability (the arrival moment is flat); conformance to the approved direction.
- **Cause:** greeting.tsx:22 swaps the greeting for `mobileTitle` when Mobile Access is on (login/page.tsx:40).
- **Fix:** this needs Jose's call; mock 7 open question 2 is still unanswered. The likely answer is the mock: put the greeting and the glass workspace chip on the band, and leave the card with no title or a quiet "Sign in" label. If "Sign in." stays, record that DESIGN.MD:1537 is superseded for Mobile Access.

### PB-006 · Medium · The password eye is off-system and announces its state twice
- **Images:** public-login-1440.jpg, public-reset-access-1440.jpg and public-login-390.jpg
- **What's wrong:**
  - The eye is Phosphor regular at 22px in `#6B6B6B`, the Quiet grey (audit: `button.q-in__eye` colour rgb(107,107,107)). Direction B uses Phosphor bold and grey `#6A7176`.
  - The label swaps between "Show password" and "Hide password", and `aria-pressed` toggles too. A screen reader announces "Hide password, toggle button, pressed", which is a double negative.
- **Principle:**
  - Similarity: the icon family and weight differ from the rest of the app.
  - WCAG 4.1.2: state should be exposed once.
- **Cause:** password-input.tsx:8–9 (`weight="regular"`) and :23 (`aria-pressed` plus a swapping `aria-label`).
- **Fix:**
  - Use `weight="bold"`, size 20, colour `#6A7176`.
  - Keep a constant `aria-label="Show password"` with `aria-pressed`, or keep the swapping label and drop `aria-pressed`. One mechanism, not both.

### PB-007 · Low · The desktop card is unevenly padded and jumps when an error appears
- **Images:**
  - public-login-1440.jpg
  - public-signin-err-1440-en.png
  - public-forgot-access-1440.jpg
- **What's wrong:**
  - On Sign in there are about 76px from the card top to the "Good evening" cap height, but 32px from the links to the card bottom.
  - On Forgot it's about 70px above the back link and 44px below the last link.
  - The card is vertically centred, so it moves up 33px when the error appears (card top 217 to 184). The mock's note: "the panel never changes, so nothing moves while you retry".
- **Principle:**
  - Proximity and balance.
  - The Doherty threshold: perceived stability during retry.
- **Cause:**
  - auth-b.css:100–101 (`align-self:center` with `padding:32px`).
  - The extra top space comes from the first child of `.q-auth__col` (the hidden `.ma-desktop` / `.q-auth__top` wrapper, auth-shell.tsx:140–141). I didn't pinpoint which box holds it.
- **Fix:**
  - Find and remove the empty top box so the card padding is 32/32.
  - Use `align-self:start; margin-top:clamp(64px, 16vh, 160px)`. The card top then stays fixed and the error only pushes content down.

### PB-008 · Low · The brand panel outweighs the form and breaks to three lines in Spanish
- **Images:**
  - public-login-1440.jpg
  - public-signin-1024-es.png
  - public-access-help-1024-es.png
- **What's wrong:**
  - The panel line is 48px/700 white, heavier than the card's 34px title. The first fixation lands on the marketing line, not the form. The mock says "The form is the first thing you can touch".
  - "NEVORA Workforce" above it repeats the wordmark.
  - At 1024 ES the line breaks "Tu semana, / en un solo / lugar.", which defeats `TwoLines` (auth-shell.tsx:135).
- **Principle:** figure-ground and visual hierarchy; Spanish line breaks.
- **Cause:** auth-b.css:97 (fixed 48px).
- **Fix:** `font-size:clamp(36px, 3.4vw, 46px)` on `.q-auth__line`, and `white-space:nowrap` on each `TwoLines` span from 1024px. Optionally drop the eyebrow, since the wordmark already names the product.

---

## 2. Forgot password (`/forgot-access`)

### PB-009 · Medium · Desktop's secondary actions don't match the phone, and the disclosure has no cue
- **Images:**
  - public-forgot-access-1440.jpg
  - public-forgot-1440-es.png
  - public-forgot-access-390.jpg
  - public-forgot-768-es.png
- **What's wrong:**
  - Desktop shows "I have a code" and "Can't use your email?" as plain teal text at weight 400.
  - The second is a `<details>` summary with no chevron, so nothing says it opens in place.
  - The phone shows "I have a recovery code" as an outlined pill and "Can't use your email?" with a chevron.
  - The links on Sign in are weight 600. Here they're 400.
- **Principle:**
  - Similarity: the same action looks different by width.
  - Signifiers / Jakob's law: a disclosure needs a caret.
- **Cause:**
  - recovery-request.tsx:46–47 (`q-btn--quiet` link and `summary.q-btn--quiet`).
  - auth-b.css:80 reaches only `.q-auth__links a` and form links, not `.q-btn--quiet`.
- **Fix:**
  - Add a `CaretDown` (bold, 16px) to the summary and rotate it when open.
  - Include `.q-btn--quiet` in auth-b.css:80 (weight 600).
  - Render "I have a recovery code" as the outlined pill on desktop too.

### PB-010 · Low · At 320 in Spanish, the secondary pill and the help disclosure wrap
- **Image:** public-forgot-320-es.png
- **What's wrong:**
  - "Tengo un código de / recuperación" wraps inside a 52px pill.
  - "¿Dónde encuentro mi ID de / empleado?" wraps with the chevron hanging on the first line.
- **Principle:** translation growth; Fitts's law (an irregular target shape).
- **Fix:** `text-wrap:balance` on `.q-btn` and on `.ma-details summary`. The copy audit already proposes shorter Spanish.

---

## 3. New password (`/reset-access`)

### PB-011 · Medium · Desktop hides the password rules in a placeholder
- **Images:**
  - public-reset-access-1440.jpg and public-reset-768-en.png
  - compared with public-reset-access-390.jpg
- **What's wrong:**
  - The phone shows the subtitle "Use the recovery code you received.", the hint "Paste the complete code…" and a live two-rule checklist.
  - Desktop has none of these. The rule exists only as the placeholder "At least 8 characters", which disappears on the first keystroke.
  - Desktop has one eye on New password that also reveals Confirm (via `controls`), with nothing telling the user so.
- **Principle:**
  - Miller's law: don't make people remember the rule while typing.
  - A placeholder is not instruction (better-accessibility "Label and type every control").
- **Fix:**
  - Render the phone's `AccessPasswordPair` rules (password-pair.tsx:20) and the code hint on desktop too.
  - Label the eye "Show passwords" when it controls two fields.

### PB-012 · Low · The phone's rule checklist looks like radio buttons
- **Image:** public-reset-access-390.jpg
- **What's wrong:** the unmet rules use hollow `CircleIcon` at 18px in grey, which reads as selectable radios.
- **Principle:** Gestalt similarity with form controls.
- **Cause:** password-pair.tsx:20.
- **Fix:**
  - Unmet: `Circle` with a dashed stroke, or `MinusCircle` bold in `#6A7176`.
  - Met: `CheckCircle` bold in green `#1D6B45` (green = done).
  - Keep the list `aria-live="polite"`.

---

## 4. Activate account (`/activate`)

### PB-013 · Medium · The "no invitation" state is two different screens
- **Images:**
  - public-activate-1440.jpg and public-activate-bad-1440-es.png
  - public-activate-390.jpg and public-activate-bad-390-es.png
  - public-activate-768-en.png
- **What's wrong:**
  - **Desktop:**
    - The card has a back link "‹ Sign in" and also a grey `#F0F2F3` rectangular "Back to sign in" button (12px radius, not a pill). Both go to the same place.
    - A 13px grey footnote reads "No invitation? Ask your Owner."
  - **Phone:**
    - A teal "Get invitation help" button (12px radius) and an "Already activated? Sign in" link.
  - Neither uses a status treatment. The mock draws the unusable-link case as an amber note ("it needs the Owner").
- **Principle:**
  - Hick's law: two controls with one outcome.
  - Consistency across widths.
  - Direction B status colours (amber = wait or check).
- **Fix:**
  - Use one content model at every width: title, line, the teal pill "Get invitation help" (it moves the task forward) and the link "Already activated? Sign in".
  - Drop the duplicate grey button.
  - Raise the note to 15px `#6A7176`.
  - The hard-coded English here is already in copy audit S1 and isn't repeated.

---

## 5. Welcome (`/welcome`, Mobile Access)

### PB-014 · Medium · The illustration sits in the card, and desktop shows two slogans
- **Images:**
  - public-welcome-1440.jpg and public-welcome-390.jpg
  - public-welcome-1440-es.png and public-welcome-320-es.png
- **What's wrong:**
  - Mock 7 puts the illustration in the teal hero on phones ("its dark edges are transparent, so it melts into the teal") and in the brand panel on desktop. The card is meant to hold only the slogan and the two ways in.
  - The build puts it inside the card, which makes the card 684px tall at 1440. The two buttons are pushed below 580px.
  - On desktop the panel says "Your week, in one place." while the card says "Brighter work ahead. … Together in one place." Two headlines compete and "in one place" repeats.
- **Principle:** figure-ground (two focal points); Hick's law; conformance to mock 7.
- **Cause:** auth-b.css:214 and mobile-access.css:127–130 place `.ma-welcome-art` inside the content.
- **Fix:**
  - Desktop: move `.ma-welcome-art` into `.q-auth__brand` on `/welcome` and hide the panel line there.
  - Phone: render the art in the band above the card.

### PB-015 · Low · On phones the wordmark jumps from left (Welcome, Help) to centre (forms)
- **Images:** public-welcome-390.jpg, public-access-help-390.jpg and public-login-390.jpg
- **Principle:** Gestalt continuity across one flow, Welcome to Sign in.
- **Cause:** mobile-access.css:146–149 apply the centred three-column header only `:has(.ma-card)`.
- **Fix:** drop the `:has(.ma-card)` condition so every Mobile Access header uses the grid.

### PB-016 · Low · The title leaves a single word on its second line
- **Images:** public-welcome-390.jpg ("Brighter work / ahead."), public-welcome-320-es.png ("Tu día empieza / aquí.") and public-welcome-1440.jpg
- **Principle:** typography (balanced headings).
- **Cause:** mobile-access.css:72 (`max-width:13ch`).
- **Fix:** remove the 13ch cap and set `text-wrap:balance` on `.q-hd h1`.

---

## 6. Access help (`/access-help`, `/access-help/id`)

### PB-017 · Medium · The topic list doesn't use Direction B icons or containers
- **Images:**
  - public-access-help-1440.jpg and public-access-help-390.jpg
  - public-access-help-1024-es.png and public-access-help-320-es.png
- **What's wrong:**
  - The icons are Phosphor regular at 20px, bare: black on desktop, teal on phones. Direction B uses bold icons in tinted circles.
  - On desktop the list is a 1px-bordered box inside the white card (card in card).
  - The row descriptions are 13px on desktop but 15px on phones.
- **Principle:** similarity with the in-app row pattern; common region (one container is enough).
- **Cause:**
  - help-view.tsx:63 and :72 (`<Icon size={20}/>`, no weight).
  - mobile-access.css:4 and :73 (`.ma-choices` border).
  - The desktop text size comes from Quiet.
- **Fix:**
  - Use `weight="bold"` in a 36px `#E8F3F1` circle with a teal glyph, as on in-app rows.
  - Remove the `.ma-choices` border inside the card at 1024px and up.
  - Use 14–15px descriptions at every width.

### PB-018 · Medium · "Find your Employee ID": the link sticks out past the text edge, and Sign in appears twice
- **Images:** public-access-help-id-1440-es.png, public-access-help-id-1440-en.png and public-access-help-id-390-en.png
- **What's wrong:**
  - "Activate account" / "Activar cuenta" starts at x 832 while the title, copy and button start at 852. It's 20px outdented.
  - "‹ Sign in" (back) and the teal "Sign in" button both go to `/login`.
  - The button has a 12px radius, not a pill (see PB-035).
- **Principle:** align to shared edges; Hick's law.
- **Cause:** mobile-access.css:126 gives `margin-inline:20px` to `.ma-note`, `.ma-copy` and the others, but not to `.ma-text`. `.q-hd` also has 20px padding (quiet.css:41).
- **Fix:** add `.ma-text` to the list at mobile-access.css:126, or remove every 20px inset and let the card's 32px padding set one edge. Keep one "Sign in": the button.

### PB-019 · Low · The footer crowds the help card, and "Need help?" points at the page you're on
- **Images:** public-access-help-1440.jpg and public-access-help-1024-es.png
- **What's wrong:**
  - "Need help?" sits about 11px below the card at 1440 and overlaps it visually at 1024. Other auth pages keep about 100px.
  - On `/access-help` that link goes to `/access-help`.
- **Fix:**
  - Hide `.ma-footer-help` on the help routes (auth-shell.tsx:144).
  - Keep a margin of at least 28px between `.q-auth__col` and the footer.
- **Not verified:** the canvas strip below the brand panel in the full-page shot (page 911px and 950px tall). It's probably a full-page-capture artefact of the sticky 100dvh panel at auth-b.css:91.

---

## 7. Privacy and Terms (`/privacy`, `/terms`)

### PB-020 · Medium · Policy pages carry no NEVORA brand at all
- **Images:**
  - public-privacy-1440.jpg and public-privacy-390.jpg
  - public-terms-1440.jpg
  - public-support-1440.jpg and public-account-deletion-1440.jpg
- **What's wrong:**
  - The band holds only "‹ Sign in", the title and the date. There's no wordmark at any width.
  - Mock 7 shows the wordmark on the policy band, and the 404 has it.
  - A legal page reached from an app store or an email shows no product identity.
- **Principle:** aesthetic-usability and trust; Jakob's law (legal pages carry the brand).
- **Cause:** legal-document.tsx:79 and support/page.tsx:26 render only `QuietNav`.
- **Fix:** render the white `BrandWordmark` (112px, as in not-found.css:48) above the back link, linking to `/login`.

### PB-021 · Medium · On desktop the contents list repeats the accordion line for line
- **Images:**
  - public-privacy-1440.jpg and public-privacy-1024-es.png
  - public-terms-1440.jpg
  - public-account-deletion-1440.jpg
- **What's wrong:**
  - "In this policy" lists the same 12 headings that the card beside it lists, with every section closed. The reader scans 24 labels to find one.
  - On Account deletion it's 5 and 5.
  - The contents links jump to `#…-text` inside closed `<details>` and rely on the browser opening them (legal-document.tsx:85).
- **Principle:** Hick's law; Miller's law; redundancy without information gain.
- **Fix:** from 1024px, render the sections open (`<details open>`) as one continuous reading card and keep the contents list as navigation. Collapsed accordions stay on phones and tablets. Alternatively drop the contents list where there are 6 or fewer sections (Account deletion). This changes an approved Nov 8 small round, so it's Jose's call.
- **Not verified:** whether Safari opens a closed `<details>` for its fragment target.

### PB-022 · Medium · The disclosure caret points right, is regular weight, and fails non-text contrast
- **Images:**
  - public-privacy-1440.jpg and public-privacy-390.jpg
  - public-terms-1440.jpg
  - public-support-390.jpg
  - public-account-deletion-390.jpg
- **What's wrong:**
  - The rows that open in place use a 14px `CaretRight`. That reads as "go to another page".
  - Its colour `#B8B8B5` is 1.99:1 on white, yet it's the only visual open/closed cue.
  - DESIGN.MD:1485: "Help, Calendar and Privacy open with the same grey down caret."
- **Principle:**
  - Jakob's law: a right chevron means navigation.
  - WCAG 1.4.11: a state indicator needs 3:1.
  - The design audit's I4 treats chevrons as decorative on link rows. This is a new instance where the chevron carries state.
- **Cause:**
  - legal-document.tsx:90
  - support/page.tsx:20 and :30
  - quiet.css:73 (`--q-chev`) and :233 (`rotate(90deg)`)
- **Fix:** use `CaretDown` with `weight="bold"` in `#6A7176` (4.96:1) and `rotate(180deg)` when `[open]`. Keep `CaretRight` only on the "Email support" mailto row.

### PB-023 · Medium · Phone rows are inset twice and wrap needlessly
- **Images:**
  - public-privacy-390.jpg
  - public-delete-320-es.png ("In the app or on the / web", "Your job and your / workplace")
  - public-account-deletion-390.jpg
- **What's wrong:**
  - Row text starts 56px from the screen edge: 16px gutter, 20px list, 20px row.
  - The chevron sits about 37px from the right edge.
  - At 320 the text column is about 190px wide.
- **Principle:** align to shared edges, with one spacing step per nesting level.
- **Cause:** quiet.css:56 (`.q-row` padding 0 20px) plus the `.q-doc__list` inset (auth-b.css:127–128).
- **Fix:** inside `.q-doc__list` set the row padding to `0 18px` and remove the extra list inset. That aligns the text with the band title (36px at 390), as on in-app cards.

### PB-024 · Low · The reading measure is uncapped, and the "Questions" row looks static
- **Images:** public-privacy-1440.jpg
- **What's wrong:**
  - The reading card is 756px wide with 40px insets. When a section opens, 15–16px text would run about 90–95 characters per line.
  - The "Questions" mailto row is the only row with no icon or chevron, and its value is grey `#6A7176`.
- **Principle:** typography (60–75 character measure); Gestalt similarity (an interactive row should look interactive).
- **Not verified:** no expanded section was captured.
- **Fix:**
  - `max-width:68ch` on `.q-doc__body` (auth-b.css:174 area).
  - Give the Questions row an `EnvelopeSimple` bold icon and a teal value (legal-document.tsx:94).

---

## 8. Support (`/support`)

### PB-025 · High · The "Contact" heading is clipped behind the band at every width
- **Images:**
  - public-support-1440.jpg and public-support-390.jpg
  - public-support-768-en.png, and the 320/1024 EN and ES shots
- **What's wrong:**
  - Only the bottom half of "Contact" shows, at y≈205 (1440) and y≈155 (390), sliced by the band's edge and the card that overlaps it.
  - The first group label is unreadable.
- **Principle:** content clipped at a supported width (escalation trigger); WCAG 1.4.10.
- **Cause:**
  - support/page.tsx:29 puts `<div class="q-grp"><h2>Contact</h2>` straight after `QuietHeader`.
  - The `.q-hd` gets `margin-bottom:-40px` (auth-b.css:26 and :48) so the next card can overlap the band. Here the next element is a label, not a card.
- **Fix:** drop the "Contact" label, since mock 7 doesn't need it: "Email support" is self-explanatory. Or add `:is(.q-hd) + .q-grp { margin-top: 56px }` in auth-b.css.

### PB-026 · Medium · The response promise and the safety line are small, wide and unemphasised
- **Images:** public-support-1440.jpg and public-support-390.jpg
- **What's wrong:**
  - "We aim to respond…" runs about 120 characters per line at 13px grey across 740px on desktop.
  - The safety line "Never email passwords, codes, bank details or pay documents." looks like boilerplate.
  - The Mail address below is 17px, the largest text in the body, so the hierarchy is inverted.
- **Principle:** typography (measure and size floor); visual hierarchy.
- **Cause:** support/page.tsx:31–32 (`.q-help`) and :40 (`.q-body`).
- **Fix:**
  - `max-width:68ch` and 14–15px `#6A7176` for `.q-help`.
  - Make the safety line a teal information note (`#E8F3F1` wash, `Info` bold icon). Teal is information, not a warning.
  - Set the address to 15px.

---

## 9. Account deletion (`/account-deletion`)

### PB-027 · Medium · "Start deletion request" straddles the band edge and is off the title's edge
- **Images:**
  - public-account-deletion-1440.jpg and public-account-deletion-390.jpg
  - public-delete-320-es.png
- **What's wrong:**
  - The white pill sits across the band's lower edge, a tangent: pill y 198–241 against the band end at 238 (1440), and 184–228 against 224 (390).
  - Its left edge is at 192 (1440) and 16 (390), while the title starts at 212 and 36. It's 20px outdented.
  - Mock 7 puts it "at the right of the title, as on every Direction B desktop page".
- **Principle:** tangency; align to shared edges.
- **Cause:** auth-b.css:147 (`margin:-28px 0 44px`), :148 and :167 (`grid-column:1 / -1; justify-self:start`).
- **Fix:**
  - Desktop: place the pill inside the band, right-aligned on the title row (flex row with `justify-content:space-between`).
  - Phone: put it inside the band below the subtitle, with `margin-left:20px` to match the title edge and its bottom at least 16px above the band end.

### PB-028 · Medium · The how-to section starts closed
- **Images:** public-account-deletion-1440.jpg and public-account-deletion-390.jpg
- **What's wrong:**
  - "In the app or on the web" holds the actual steps, but it's collapsed like the rest.
  - Mock 7: "The first section is open because it is the how-to."
- **Principle:** progressive disclosure for the task path.
- **Cause:** legal-document.tsx:89 (no `open`).
- **Fix:** add `open={doc.slug === "account-deletion" && index === 0}`.

---

## 10. 404 (`/no-such-page`, including the Clocker hint)

### PB-029 · Medium · The footer is the legacy lockup, with text under 12px and a second wordmark
- **Images:**
  - public-no-such-page-1440.jpg and public-no-such-page-390.jpg
  - public-404-320-en.png and public-404-1024-es.png
- **What's wrong:**
  - Under the card the 404 repeats the wordmark. This one is grey, with a coloured "Λ" (the old lockup).
  - It has a "Workforce" module line at 11px and two legal lines at 10px (audit `textUnder12px`).
  - It uses warm Signature grey `#6F6C66`.
  - Every other public page uses the one-line `QuietLegal` footer.
- **Principle:**
  - Similarity and consistency.
  - Typography size floor (rarely below 12px).
  - Direction B neutral greys.
- **Cause:**
  - not-found.tsx:25 (`AuthBrand` plus `BrandLegal`)
  - not-found.css:17 and :22 (`.6875rem`)
  - globals.css:12507 (`calc(10 * var(--type-unit))`)
- **Fix:** replace the footer with `<QuietLegal lang=…/>` at 13px `#6A7176`, and drop `AuthBrand`, since the band already carries the white wordmark.

### PB-030 · Low · The 404 is English-only, and its "Error 404" line is under AA
- **Images:** public-404-390-es.png and public-404-1440-es.png
- **What's wrong:**
  - An ES visitor gets an English 404 with no language switch.
  - "Error 404" is white at 0.78 alpha on the band: about 4.4:1 at 15px (not-found.css:33). This is a new instance of the design audit's C1.
- **Fix:**
  - Read `readAuthLang()` and use `AUTH_COPY` strings.
  - Set the eyebrow alpha to at least 0.86.
- **Clocker hint:** not captured, because the 404 shots use `/no-such-page`, not `/clocker/…`. From the code (not-found-hint.tsx:9, not-found.css:37), the hint is an amber note, `#6E3C00` on `#FDF3E4` (8.28:1, passes). That fits "amber = check". It has no icon; the mock draws one, so add a `DeviceTablet` bold icon.

---

## Cross-screen patterns

### PB-031 · High · Tablet (768–1023): pages without a form lose their card and slide under the band
- **Images:**
  - public-welcome-768-en.png and public-welcome-768-es.png: the title and subtitle are white on the canvas and invisible.
  - public-access-help-768-en.png: the first row, "I don't know my Employee ID", is hidden under the band.
  - public-access-help-id-768-en.png: the first paragraph is cut.
  - public-activate-768-en.png: the "Back to sign in" button's top is under the band.
- **What's wrong:**
  - No white card is drawn.
  - The content starts 40px up inside the band, which is painted above it.
- **Principle:** content clipped or overlapped at a supported width (escalation trigger); WCAG 1.4.3 for the white title.
- **Cause:**
  - The card exists only for `.q-auth__col form` and `.q-auth__col > :is(.q-list, .q-card)` (auth-b.css:62–63).
  - `.q-hd` still pulls the next sibling up by 40px (auth-b.css:26).
  - The phone fix that cards `#access-content:not(:has(> .ma-card))` (auth-b.css:196–198) is limited to 767px.
- **Fix:** copy auth-b.css:196–205 into a `(min-width:768px) and (max-width:1023px)` block for `#mobile-access-page`. The card is then `#access-content`, the title is in ink, and the band holds only the top bar and the back link.
- **Scope note:** Mobile Access only, which is off in production. It's still High because these are captured, supported widths.

### PB-032 · High · Desktop and tablet back-pages have no language switch and no wordmark
- **Images:**
  - public-forgot-access-1440.jpg and public-forgot-1440-es.png
  - public-reset-access-1440.jpg
  - public-activate-1440.jpg
  - public-access-help-1440.jpg and public-access-help-id-1440-es.png
  - public-forgot-768-es.png and public-reset-768-en.png
- **What's wrong:**
  - Español/English appears only on Sign in and Welcome.
  - Someone who arrives on New password from the recovery email in the wrong language can't switch.
  - At 768 these pages also lose the wordmark, which Sign in at 768 has.
  - Mock 7 shows, on every desktop auth frame, "Sign in" as a pill at the top left and "Español" at the top right.
- **Principle:**
  - User control and freedom (language is a core task setting in this bilingual product).
  - Consistency: the switch must not disappear.
- **Cause:** auth-shell.tsx:140–141. When `back` is set, the shell renders `QuietNav` instead of the top bar, so `LangSwitch` and the wordmark are never mounted.
- **Fix:** always render `<LangSwitch>`, and on tablets the wordmark, next to `QuietNav`. auth-b.css:114 already positions the switch fixed at the top right on desktop.

### PB-033 · High · The legal footer fails contrast on every desktop auth page and every policy page
- **Images:**
  - public-login-1440.jpg, public-forgot-access-1440.jpg, public-reset-access-1440.jpg, public-activate-1440.jpg, public-welcome-1440.jpg and public-access-help-1440.jpg
  - The policy footer line on public-privacy-1440.jpg, public-terms-1440.jpg, public-support-1440.jpg and public-account-deletion-1440.jpg
- **What's wrong:**
  - The footer text and its Privacy, Terms and Support links measure 3.16:1 (`#8A8A87` on `#F2F5F4`). Axe reports `color-contrast` (serious) on 4 nodes per page.
  - On policy pages the "· Terms of Use" and "· Support" spans are 3.16:1 too.
  - The links differ from the surrounding text only by a slightly darker grey.
- **Principle:** WCAG 1.4.3 (body text at 13px needs 4.5:1); WCAG 1.4.1 (links in a line need more than colour).
- **Cause:** quiet.css:511–512 (`--q-soft`) and :548–550.
- **Fix:**
  - Use `#6A7176` (4.52:1 on the canvas) for the line and `#3F464B` (8.74:1) for the links, with `text-decoration:underline` on hover and focus.
  - Phones under Mobile Access already pass (`--ma-muted #5F6D68`, mobile-access.css:70), so the tokens can be unified on those.

### PB-034 · Medium · Desktop auth pages and every policy page don't render Inter
- **Images and evidence:**
  - `styles.*.fontFamily` is `-apple-system` in the 1440 audits of login, forgot, reset, activate, welcome and access help, and at both widths for privacy, terms, support and account deletion.
  - Only the phone Mobile Access pages and the 404 report `Inter`.
- **What's wrong:** on a Mac or iPhone, desktop sign-in and the policy pages render SF Pro, and the app after sign-in renders Inter. The screenshots were taken on Linux, so they show a fallback and hide the difference.
- **Principle:** Direction B ("Inter throughout"); aesthetic-usability; similarity across the sign-in to app boundary.
- **Cause:** quiet.css:14 (system stack on `.q-page`). auth-b.css:184 sets Inter only for `#mobile-access-page` under 767px.
- **Fix:** in auth-b.css:12–14 add `font-family: Inter, "Inter Fallback", -apple-system, BlinkMacSystemFont, sans-serif !important;` to `main.q-page.q-auth.q-auth` at every width. Check that `.q-auth__line`'s −0.035em tracking still suits Inter.

### PB-035 · Medium · Only form submits are pills; every other button is a 12px rectangle
- **Images:**
  - **Pills:** public-login-1440.jpg and public-forgot-access-390.jpg
  - **Rectangles:**
    - public-welcome-1440.jpg and public-welcome-390.jpg
    - public-access-help-id-1440-es.png and public-access-help-id-390-en.png
    - public-activate-390.jpg and public-activate-1440.jpg
- **What's wrong:**
  - "Sign in", "Request recovery" and "Reset password" are 52px pills.
  - Welcome's "Sign in →" and "Activate account", Find ID's "Sign in", phone Activate's "Get invitation help" and desktop Activate's "Back to sign in" are 48–50px with a 12px radius.
  - Secondary actions are a grey fill on desktop (Welcome, Activate) but a teal outline on phones.
  - On desktop Welcome the two buttons are 36px apart and 48px below the copy, so they don't read as one action group.
- **Principle:** Gestalt similarity; Direction B "pills for actions"; proximity.
- **Cause:**
  - auth-b.css:71 targets `.q-auth__col form .q-btn` only.
  - quiet.css:113 (12px) and mobile-access.css:40 (12px) style the rest.
- **Fix:**
  - Make auth-b.css:71 `main.q-auth .q-btn:not(.q-btn--quiet,.q-btn--link)` with radius 26px.
  - Add a `.q-btn--sec` rule: white fill, a 1px `#0B6E69` inset ring, teal label, the same pill.
  - Put 12px between the stacked pills.

### PB-036 · Medium · Phones use two focus-ring colours on one form
- **Images and evidence:**
  - public-login-390-en-focus.png
  - `_logs-public.json` pubFocus 390. The eye, Forgot and Activate show `solid rgb(8,127,202)` (blue `#087FCA`); Sign in shows teal `rgb(11,110,105)`; band controls show white.
  - Desktop uses teal for every field and link.
- **Principle:** similarity and consistency of focus treatment; better-accessibility (one focus token).
- **Cause:** mobile-access.css:17 (`--ma-focus:#087fca`) and :38–39; auth-b.css:74 (teal ring on `.q-btn` only).
- **Fix:** the Oct 27 card section (DESIGN.MD:1339) kept "the blue focus ring", but Direction B (Nov 8) is teal. Ask Jose to confirm teal. Then set `--ma-focus:#0B6E69` (6.09:1 on white). A 2px ring with a 2px offset meets 1.4.11 on white and canvas.

### PB-037 · Medium · The language switch and the text links are small targets
- **Evidence:**
  - Audit `targetsUnder44`: the phone language pill is 82×36 and the desktop one 90×40.
  - Desktop "Forgot password?" is 147×22, "Activate account" 139×22, "Need help?" 80×22.
  - The footer links are 38–49×16, and the policy inline links (support@thevelani.com and others) 164×19.
- **What's wrong:**
  - Direction B asks for 48px+ targets.
  - The phone pill was 44px in the approved Oct 27 card and is now 36 (auth-b.css:191 overrides mobile-access.css:24).
  - These pass WCAG 2.5.8 through the spacing exception (separated by gaps and "·"), but they are small for Fitts's law on a phone.
- **Fix:**
  - Language pill: keep the 36px visual and add `::before{inset:-6px 0}` for a 48px hit area, or restore `min-height:44px`.
  - `.q-auth__links a`: `min-height:44px; display:inline-flex; align-items:center`.
  - Footer links: `padding-block:14px` on the anchors.

### PB-038 · Low · Footers wrap one item onto its own line
- **Images:**
  - public-signin-320-es.png, public-forgot-320-es.png, public-welcome-320-es.png and public-access-help-320-es.png: "… Términos ·" then "Ayuda" alone.
  - public-privacy-390.jpg, public-account-deletion-390.jpg and public-support-390.jpg: "Account" then "deletion".
- **Principle:** Spanish and translation line breaks; Gestalt proximity (the separator is stranded at the line end).
- **Fix:**
  - Wrap each link with its leading " · " in `<span style="white-space:nowrap">` (brand-legal.tsx:26–27; legal-document.tsx:105–107).
  - Or render the links as a flex list with `gap` and CSS `::before` separators.

### PB-039 · Low · Back links and secondary links are styled differently on every page
- **Images:**
  - public-forgot-access-1440.jpg: "‹ Sign in", caret, 17px/400 teal.
  - public-forgot-access-390.jpg: "← Back to sign in", arrow, 14px/600 white.
  - public-access-help-390.jpg: "← Back".
  - public-privacy-1440.jpg: "‹ Sign in" on the band, 17px/400 white.
- **What's wrong:** three back glyphs and labels, and teal links at weights 400 and 600 and at 15 and 17px.
- **Principle:** similarity; Jakob's law.
- **Fix:**
  - Use one back control everywhere: Phosphor `CaretLeft` bold 16px, label "Sign in", weight 600, 15px.
  - On desktop auth pages make it the white pill at the top left, as in mock 7.
  - Set all teal text links to 600 / 15px.

### PB-040 · Low · The error's position differs between Sign in and Recovery
- **Evidence (code, not captured):**
  - Sign in renders its error at the top of the form (login/page.tsx:44).
  - Recovery and reset render theirs after the form, below the submit (recovery-views.tsx: `{message?<div id="recovery-error" … role="alert">` after `</form>`).
  - Mock 7 puts every error "at the top of the card".
- **Principle:** consistency; proximity to the cause.
- **Fix:** move the recovery and reset alerts above the fields. The focus-on-error logic already exists.
- **Not verified:** no recovery error state was captured.

### PB-041 · Low · The band breaks automated contrast checks
- **Evidence:** axe reports `color-contrast` (1.08–1.1:1) on every phone band control (`.ma-language`, `.ma-back`) and every policy band title and link (`.q-nav__l`, `#legal-title`, `.q-hd > p`) in all 22 audits.
- **What's actually rendered:** white on `#0C726C`, which is 5.77:1.
- **Cause:** the band is painted with `border-image` (auth-b.css:22, :44 and :187), which axe can't see.
- **Impact:** real contrast regressions on the band will be hidden in the noise.
- **Fix:** paint the band as a `background` on the header wrapper (or a full-bleed `::before` with a background colour axe can resolve), or record these selectors as known false positives in `tools/ui-scan`.

---

## Coverage gaps and checks not run

- **"Bad" captures that show the default state:**
  - `reset-bad` is pixel-identical to `reset` at every width (public-reset-bad-1440-en.png vs public-reset-1440-en.png).
  - `activate-bad` shows the no-invitation state, not the "link can't be used" state.
  - So the expired or used code and invitation states (red and amber notes) were not reviewed.
- **States not captured:**
  - Too many attempts (amber)
  - Signing in… (pending)
  - Activated notice (green)
  - Account being deleted
  - Passkey / Face ID button
  - Request received
  - Password updated
  - Activation with a valid invitation (password, checks, success)
  - An expanded policy section
  - The Clocker hint on `/clocker/…`
  - The public error page (manifest `not_captured`)
- **Mobile Access off on phones** (the production default) wasn't captured at 320 or 390. That layout is the `QuietAuthShell` band, which PB-001 suggests renders correctly when the greeting is a direct child. Not verified.
- **Reduced motion:** no motion frames exist for public pages. Not verified.
- **Keyboard:** checked from the logged Tab order only (pubFocus, 4 walks). There was no keyboard pass of the policy contents list or the disclosures.
- **Real-scroll behaviour:** the brand panel's sticky behaviour (PB-019) was not checked in a scrolling browser.

---

## Top 10 for the signed-out pages

1. **PB-031 (High):** tablet pages without a form lose their card and slide under the band (Welcome, Access help, Find ID, Activate). Copy the phone card rules to 768–1023.
2. **PB-001 (High):** the tablet sign-in title and workspace are white on the canvas. Same fix area as PB-031.
3. **PB-025 (High):** the Support "Contact" heading is clipped behind the band at every width.
4. **PB-033 (High):** the legal footer is 3.16:1 on every desktop auth page and every policy page. Change two tokens in quiet.css.
5. **PB-032 (High):** no language switch or wordmark on desktop and tablet Forgot, New password, Activate and Help. One change in auth-shell.tsx.
6. **PB-034 (Medium):** desktop auth and policy pages render the system font, not Inter. One line in auth-b.css.
7. **PB-035 (Medium):** only form submits are pills; Welcome, Find ID and Activate buttons are 12px rectangles.
8. **PB-002 (Medium):** the sign-in error doesn't mark the fields, has no icon, uses two reds, and is narrower than the fields on phones.
9. **PB-022 (Medium):** policy disclosures use a 1.99:1 right caret as their only open/closed cue. Use a bold down caret in `#6A7176`.
10. **PB-020 (Medium):** policy pages carry no NEVORA wordmark.

## Counts

**41 findings:** 5 High, 23 Medium, 13 Low.
- **High:** PB-001, 025, 031, 032, 033.
- **Medium:** PB-002, 003, 004, 005, 006, 009, 011, 013, 014, 017, 018, 020, 021, 022, 023, 026, 027, 028, 029, 034, 035, 036, 037.
- **Low:** PB-007, 008, 010, 012, 015, 016, 019, 024, 030, 038, 039, 040, 041.

**Verdict: Block.** Five High findings remain.
