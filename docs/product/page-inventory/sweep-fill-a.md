# Fill-in sweep A: sign-up, activation, billing, Clocker recovery and PINs (Nov 22, 2026)

The Nov 22 sweeps ([Owner and Manager](sweep-owner-manager.md), [Lead, Employee, public and Clocker](sweep-lead-employee-public-clocker.md))
could not reach some pages. This sweep reaches all of them on local, fictional data in Chromium. Rows follow
`docs/product/page-inventory.md`. Built from `claude-codex-collab-nevora` at `83ba756b`. 196 captures; families on
screen: B 196. Per-capture data is in `sweep-fill-a.json`; thumbnails are in `thumbs/fill/`
(`<row>-<variant>-<profile>-<width>-<lang>.webp`, 360 px wide). Full-size PNGs are in `/tmp/nevora-sweep/fill-a/` on the
sweep machine.

Cells read `family state · words · button styles · text sizes` (state: r rendered, n notice, e error or refusal).
Family follows the earlier sweeps: B when the teal band is on screen and old-kit markers stay under the line, Mixed when
old-kit markers pass it, Older with no band.

## Top problems on these pages

1. **A15–A19: a past-due or canceled subscription reads "Access Active"** with the same buttons and no warning; only the
   button label changes. The trial with no plan offers "Review subscription in Stripe".
2. **A15–A19 are heavy for a status card:** about 110 words, two buttons, three stacked text links, a UTC disclaimer and two
   footnotes on every state; the return pages make "Back to NEVORA sign-in" the filled button.
3. **Wrong desktop brand message:** the Owner sign-up flow (A8, A9, A10), A15–A19 and J18 all show "Your week, in one place. Shifts, hours,
   time off and pay statements", the Employee sign-in panel.
4. **F8 save fails on the production build** with "Clocker setup is not configured for this environment", a developer
   sentence, because the save shares the Clocker's https-origin check.
5. **A9 heading and state disagree:** "Confirming your email" stays as the title over "We can't confirm your email right
   now".
6. **Clocker recovery cards carry too many ways out:** K12's retry has a filled button, an underlined link and a second row
   of plain links; the saved-punch help mixes an outlined button, a teal link and a disclosure; K8's photo review stacks
   four actions past a phone's fold.
7. **K14 contradicts itself:** the band says "Can't save punches", the card says it can't read them.
8. **J18 in its "can't check billing" state** makes the main action ("Open billing in Velani") the outlined button and
   "Refresh status" the filled one; its links switch between a row and a stack across states.
9. **A10's malformed-link state** and **A8's closed state** are a band and a sentence with no card or way on.

## How each page was reached

Nothing under `src/` was changed. The scan tests ran from an extended scratch copy of `tools/ui-scan/zz-scan.tar.gz`
(never committed), as `postgres`, each run under `flock /tmp/nevora-heavy.lock`.

| Run | Build | What it carried | Pages |
|---|---|---|---|
| `p1` | production (`NEVORA_OWNED_APP_PRODUCTION=1`) | owner-rich seed; fictional Clocker PIN key (`NEVORA_CLOCKER_PIN_KEY`, set by the harness option `clockerPinKey` = 32 bytes of `0xab`) | F8, J17 |
| `p2` | production | default seed; signed out | A10 |
| `pin-dev` | development | same as `p1` | F8 save (production refuses it, see F8) |
| `bill` | development | owner-rich seed; the owned central billing fixture (`src/test/integration/central-billing-fixture.ts`: its own Postgres database and the local Stripe stand-in `services/commerce/stripe-fixture`, no provider request) passed as `centralBillingApiOrigin`; J18 status replies answered in the browser | A15–A19, J18 |
| `ck-en2`, `ck-es` | development | Clocker punches and PIN key on, default seed | K8, K9, K11, K12, K13, K14 |
| `su-open`, `su-closed` | development, standalone | exported copy of the committed tree, `next dev` with local sign-up settings, no database | A8, A9 |

Every browser in these runs aborted requests to any origin other than the local app (and, for billing, the local billing
fixture). No email, SMS, payment or AI provider was configured or reached.

## A8 Owner sign-up and A9 Verify email

**Blocked before:** both answered 404. `src/app/onboarding/page.tsx` and `verify/page.tsx` call `onSignupHost()`
(`src/lib/onboarding/signup-page.server.ts`), which compares the request's `Host` header with
`NEVORA_SIGNUP_ORIGIN`. The owned test app passes a fixed environment and never sets that variable, and its mirror
refuses any `.env` file ("unapproved environment input"), so no host can match there.

**What I did:** ran a separate `next dev` on an exported copy of the committed tree (`git archive HEAD`), with
`NEVORA_SIGNUP_ORIGIN=http://localhost:3917` and browsed it as `localhost:3917`. `readSignupOrigin` accepts an http
loopback origin only when `NEVORA_ONBOARDING_ENVIRONMENT` is `development` or `test`. To show the form rather than the
closed notice, `readSignupPage` needs onboarding on, a complete config (fictional 32-byte keys, `portal.example.invalid`,
a control database URL at `127.0.0.1:59999` where nothing listens) and a mail transport whose origin equals the sign-up
origin (SMTP host `127.0.0.1`, a port nobody listens on), plus `NEVORA_ONBOARDING_ADMISSION_MODE=open`. A second start
without the admission mode gives the closed page. The local mail transport is only accepted when `NODE_ENV` is not
production, so the open form can't be shown on a production build without real SMTP credentials; the sign-up host
therefore ran in development.

**States:** real server replies for the form, its empty submit, a submitted address ("Signup is unavailable": the
control database is unreachable, so nothing is written or sent), the verify page without a link, with a malformed link and
with a well-formed link. Three later steps need the onboarding service, which does not run locally; they are shown with
fictional replies answered in the browser (marked "fixture reply" in the JSON): "Check your email" after sending, the
business form after a verified link, and "Creating your workplace".

**A8 Owner sign-up** (`/onboarding`, development (standalone sign-up host))

| Variant | en 390 | en 1440 | es 390 | es 1440 | Notable |
|---|---|---|---|---|---|
| check-email | B r · 48w · 2b · 6t | B r · 92w · 2b · 6t | B r · 47w · 2b · 6t | B r · 98w · 2b · 6t | 'Send it again in 58 s' is drawn as the filled primary button while it is only a countdown |
| closed | B n · 27w · 1b · 4t | B n · 71w · 1b · 6t | B n · 27w · 1b · 4t | B n · 78w · 1b · 6t | Closed sign-up is a band and a sentence with no card or way on except the footer |
| empty-submit | B r · 55w · 2b · 6t | B r · 99w · 2b · 7t | B r · 55w · 2b · 6t | B r · 106w · 2b · 7t | Email field shows a red border inside a teal focus ring (two outlines at once) |
| form | B r · 39w · 2b · 6t | B r · 83w · 2b · 7t | B r · 39w · 2b · 6t | B r · 90w · 2b · 7t | Clean one-field form; the closed and open states share the band, card and footer |
| server-unavailable | B e · 50w · 2b · 6t | B e · 94w · 2b · 8t | B e · 51w · 2b · 6t | B e · 102w · 2b · 8t | 'Signup is unavailable right now' sits above the form the person just filled; the form stays filled and Send stays filled-teal, inviting a blind retry |

**A9 Verify email (sign-up)** (`/onboarding/verify`, development (standalone sign-up host))

| Variant | en 390 | en 1440 | es 390 | es 1440 | Notable |
|---|---|---|---|---|---|
| bad-link | B n · 41w · 2b · 5t | B n · 85w · 2b · 6t | B n · 41w · 2b · 5t | B n · 92w · 2b · 6t | One action, but the title keeps a visible focus box on the band |
| business-form-empty-submit | B r · 110w · 2b · 7t | B r · 154w · 2b · 8t | B r · 120w · 2b · 7t | B r · 171w · 2b · 8t | Five red fields at once; each error repeats the length rule ('up to 160 characters') |
| link-server-unavailable | B e · 29w · 2b · 6t | B e · 73w · 2b · 7t | B e · 29w · 2b · 6t | B e · 80w · 2b · 7t | Title still says 'Confirming your email' while the card says it can't confirm: heading and state disagree |
| no-link | B n · 39w · 2b · 5t | B n · 83w · 2b · 6t | B n · 38w · 2b · 5t | B n · 89w · 2b · 6t | Clear one-action card ('Start signup'); the focused title draws a faint box on the band |
| progress-creating | B r · 36w · 1b · 5t | B r · 80w · 1b · 7t | B r · 38w · 1b · 5t | B r · 89w · 1b · 7t | Good: one sentence and the 3-step list; the spinner sits in the band text and is easy to miss |
| verified-business-form | B r · 87w · 2b · 7t | B r · 131w · 2b · 8t | B r · 97w · 2b · 7t | B r · 148w · 2b · 8t | Long single-column form (87 words at 390, about 1,700 px tall) under a 3-step list; the Owner section has no card break |

**Inspection.** The sign-up host is the cleanest public flow in the product: one band title, one card, one filled
button. Problems: (1) on the verify page with a well-formed link that the server can't confirm, the title stays
"Confirming your email" above "We can't confirm your email right now", so heading and state disagree; (2) the programmatic
focus on each new title draws a faint box on the band; (3) "Send it again in 58 s" is a filled primary button while it is
only a countdown; (4) the business form is one long column (about 1,700 px on a phone) whose errors all repeat their
length rule ("up to 160 characters"); (5) after "Signup is unavailable" the filled Send button invites the same request
again with no hint of when; (6) the closed page is a band and a sentence with no card.

## A10 Activate business

**Blocked before:** the sweep opened it without a link and got "Open this page from your signup".

**What I did:** opened `/onboarding/activate#proof=<43-character fictional token>`. The page checks only the token's
shape before it shows the form (`takeFragmentProof`), so a well-formed fictional token reaches the real password step.
Captured the form, a password mismatch (client check), a submit (the production build has no onboarding service, so the
server's real refusal is shown) and a malformed link, in English and Spanish. A successful activation needs a bootstrap
grant from the onboarding control service, which the owned harness doesn't run (only its isolated Step 4 runtime does,
and that one can't run as a production build).

**A10 Activate business (Owner)** (`/onboarding/activate`, production)

| Variant | en 390 | en 1440 | es 390 | es 1440 | Notable |
|---|---|---|---|---|---|
| bad-link | B n · 36w · 1b · 4t | B n · 80w · 1b · 6t | B n · 36w · 1b · 4t | B n · 87w · 1b · 6t | Malformed link: band only, no card and no link; it says 'Go back to your signup' but offers no way there (no sign-up origin in this build) |
| link-mismatch | B r · 58w · 3b · 7t | B r · 102w · 3b · 8t | B r · 67w · 3b · 7t | B r · 118w · 3b · 8t | Clear inline mismatch; the 3-step list above pushes the fields down on phones |
| link-ready | B r · 56w · 3b · 7t | B r · 100w · 3b · 8t | B r · 65w · 3b · 7t | B r · 116w · 3b · 8t | Desktop brand panel says 'Your week, in one place. Shifts, hours, time off and pay statements' on an Owner set-up page (Employee message) |
| link-server-refused | B e · 66w · 3b · 7t | B e · 110w · 3b · 9t | B e · 75w · 3b · 7t | B e · 126w · 3b · 9t | 'We can't set your password right now' appears inside the step list area, between step 3 and the fields |

**Inspection.** The step list (Confirm email, Prepare workplace, Set Owner password) gives good orientation, but on a phone
it pushes the fields below the fold and the refusal message lands between step 3 and the fields. On desktop the brand
panel says "Your week, in one place. Shifts, hours, time off and pay statements…", the Employee sign-in message, on an
Owner set-up page.

## A15–A19 billing pages

**Blocked before:** "Billing is temporarily unavailable" only; the harness had no billing service.

**What I did:** the code's own owned billing fixture (`central-billing-fixture.ts`, used by
`central-billing-browser.integration.ts`) runs the real commerce service against its own throwaway Postgres database and
the local Stripe stand-in, on a loopback port. The owned app accepts it through `centralBillingApiOrigin`
(`NEVORA_BILLING_ENVIRONMENT=development`, `NEVORA_BILLING_API_ORIGIN=http://127.0.0.1:<port>`). `centralBillingApiOrigin`
only accepts an http origin when `NODE_ENV` is not production, so this ran on the development build. Each visit used a
fresh one-time handoff (`#handoff=…`) from the fixture; the business was renamed "Northside Bakery". States: trial with no
plan, Small plan active, past due, canceled, and a provider state the service doesn't know. No checkout or portal
button was pressed; checkout.stripe.com and every other non-local origin were aborted.

**A15 Plans** (`/pages/plans`, development)

| Variant | en 390 | en 1440 | es 390 | es 1440 | Notable |
|---|---|---|---|---|---|
| active | B r · 113w · 4b · 5t | B r · 124w · 4b · 6t | B r · 127w · 4b · 5t | B r · 139w · 4b · 6t | Shows both 'Trial ends' and 'Paid through'; UTC disclaimer on every state; 2 buttons + 3 text links + 2 footnotes |
| canceled | B r · 110w · 3b · 5t | B r · 121w · 3b · 6t | B r · 124w · 3b · 5t | B r · 136w · 3b · 6t | Canceled still reads 'Access Active' with no line saying the subscription ended |
| past_due | B r · 113w · 4b · 5t | B r · 124w · 4b · 6t | B r · 127w · 4b · 5t | B r · 139w · 4b · 6t | Past due reads exactly like Active: 'Access Active', no warning, same buttons |
| provider-unknown | B e · 117w · 2b · 5t | B e · 128w · 2b · 6t | · | · | Grey 'Billing is temporarily unavailable' box sits under the old facts, which stay on screen |
| trial | B r · 106w · 3b · 5t | B r · 117w · 3b · 6t | B r · 120w · 3b · 5t | B r · 132w · 3b · 6t | Trial with no plan offers 'Review subscription in Stripe' (there is no subscription yet) plus three stacked text links |

**A16 Billing** (`/pages/nevora-billing`, development)

| Variant | en 390 | en 1440 | Notable |
|---|---|---|---|
| active | B r · 113w · 4b · 5t | B r · 124w · 4b · 6t | Same component as A15 (Plans) in the active state |

**A17 Billing return** (`/pages/nevora-billing-return`, development)

| Variant | en 390 | en 1440 | Notable |
|---|---|---|---|
| active | B r · 115w · 4b · 6t | B r · 126w · 4b · 7t | Return page puts 'Back to NEVORA sign-in' as the filled button above 'Manage billing in Stripe' |
| no-handoff | B n · 69w · 3b · 6t | B n · 80w · 3b · 7t | Direct visit: grey note and 'Back to NEVORA sign-in' |

**A18 Facturación (Spanish billing)** (`/pages/es-facturacion`, development)

| Variant | es 390 | es 1440 | Notable |
|---|---|---|---|
| active | B r · 127w · 4b · 5t | B r · 139w · 4b · 6t | Spanish entry renders the same page in Spanish |

**A19 Pago (Spanish payment)** (`/pages/es-pago`, development)

| Variant | es 390 | es 1440 | Notable |
|---|---|---|---|
| active | B r · 131w · 3b · 6t | B r · 143w · 4b · 7t | Spanish return page: the filled button 'Volver al inicio de sesión de NEVORA' wraps to two lines on a phone |

**Inspection.** The five routes are one component. (1) **Past due reads exactly like Active**: with the fixture's
subscription set to `past_due`, the page shows "Access Active", the same buttons and no warning; canceled also says "Active" with no line that the subscription ended; only the button label
changes. (2) The trial with no plan offers "Review subscription in Stripe" although there is no subscription. (3) Every
state carries the UTC disclaimer, both "Trial ends" and "Paid through", two buttons, three stacked text links (Refresh
status, Back to NEVORA sign-in, Close billing) and two footnotes: about 110 words for a status card. (4) On the return
pages (A17, A19) the filled button is "Back to NEVORA sign-in" and billing is the outlined one; in Spanish it wraps to two
lines on a phone. (5) The desktop brand panel says "Your week, in one place", the Employee message. (6) When the provider
state is unknown, a grey "temporarily unavailable" box appears under facts that stay on screen.

## J18 Billing (Owner)

**Blocked before:** "We can't check billing right now"; there is no billing service locally and the page's server side
needs an https commerce origin with an installation secret.

**What I did:** same run as A15–A19 (commerce on, so the Owner lands on `/app/billing`). The page reads its status in
the browser from `/api/commerce/status`; as `commerce-recovery-browser.integration.ts` does, those reads were answered in
the browser with fictional status replies: trial, trial ended, payment failed in grace, over the people limit, and paid
(Team). The first capture is the real read. "Open billing in Velani" was never pressed (its handoff request was
aborted).

**J18 Billing (account recovery / plan)** (`/app/billing`, development)

| Variant | en 390 | en 1440 | es 390 | es 1440 | Notable |
|---|---|---|---|---|---|
| over-limit | B r · 79w · 3b · 6t | B r · 90w · 3b · 7t | B r · 88w · 3b · 6t | B r · 100w · 3b · 7t | Red notice names 18 of 15 people; clear |
| paid | B r · 62w · 3b · 5t | B r · 73w · 3b · 6t | B r · 67w · 3b · 5t | B r · 79w · 3b · 6t | Desktop brand panel says 'Your week, in one place' beside a billing page |
| payment-failed-grace | B r · 79w · 3b · 6t | B r · 90w · 3b · 7t | B r · 89w · 3b · 6t | B r · 101w · 3b · 7t | Amber notice and 'Grace period ends'; three stacked text links under the button |
| trial | B r · 63w · 3b · 5t | B r · 74w · 3b · 6t | B r · 69w · 3b · 5t | B r · 81w · 3b · 6t | Fictional status reply; trial facts and one filled action |
| trial-ended | B r · 72w · 3b · 6t | B r · 83w · 3b · 7t | B r · 78w · 3b · 6t | B r · 90w · 3b · 7t | Red notice + 'Access paused'; links sit side by side here but stack in other states |
| unavailable | B e · 58w · 4b · 6t | B e · 69w · 4b · 7t | B e · 65w · 4b · 6t | B e · 77w · 4b · 7t | Outlined 'Open billing in Velani' above filled 'Refresh status': the main action is the weaker button |

**Inspection.** The status card reads well: one coloured notice, a short fact list, one filled "Open billing in Velani".
Problems: (1) in the real "can't check billing" state the main action is outlined and "Refresh status" is the filled one;
(2) the text links sit side by side in some states and stack in others; (3) the desktop brand panel again says "Your
week, in one place"; (4) the card speaks of Velani while the A15 pages speak of Stripe, for the same subscription.

## F8 Clocker PIN (Owner) and J17 Clocker PINs

**Blocked before:** the build had no PIN key, so F8 said "PINs can't be set right now".

**What I did:** set the fictional local key through the harness option `clockerPinKey`, which becomes
`NEVORA_CLOCKER_PIN_KEY` (read by `readPinKey` in `src/lib/clocker/pin-crypto.server.ts`). Gave James a PIN directly
(`setEmployeeClockerPin`) so the reset wording shows too. Captured on the production build: set (Maria, no PIN), a
mismatch, the save, reset (James). **The save is refused on the production build**: the save action runs
`clockerOriginFailure`, which needs an https `NEVORA_CLOCKER_ORIGIN` in production, and the harness sets the http
loopback origin. The page then shows "The PIN wasn't saved. Clocker setup is not configured for this environment." The
successful save comes from a development run with the same seed and key. J17 (the list) was recaptured with the key.

**F8 Clocker PIN** (`/app/employees/[employeeId]/clocker-pin`, production and development)

| Variant | en 390 | en 1440 | Notable |
|---|---|---|---|
| mismatch | B r · 42w · 1b · 6t | B r · 44w · 1b · 6t | Clear 'The two PINs don't match' in red under the boxes |
| reset-has-pin | B r · 36w · 1b · 6t | B r · 38w · 1b · 6t | Reset wording for a person who has a PIN |
| save-refused-prod | B e · 49w · 1b · 6t | B e · 51w · 1b · 6t | Production build: Save PIN answers 'The PIN wasn't saved. Clocker setup is not configured for this environment' (the plain-http origin refusal tablet setup also hits); a developer sentence shown to the Owner |
| saved-dev | B r · 34w · 2b · 4t | B r · 36w · 2b · 5t | Development build: the save succeeds: green check, 'Tell them in person', an outlined 'Back to Maria Rivera' and a 'Set another PIN' link |
| set-no-pin | B r · 37w · 1b · 6t | B r · 39w · 1b · 6t | Working form now that a local PIN key is set; on desktop a 400 px card in a wide empty canvas |

**J17 Clocker PINs (settings)** (`/app/settings/clocker/pins`, production)

| Variant | en 390 | en 1440 | Notable |
|---|---|---|---|
| pins-with-key | B r · 130w · 3b · 8t | B r · 130w · 3b · 8t | With the key the list works: 11 'Set PIN' outlined buttons, one per row |

**Inspection.** A tidy single card (4 boxes twice, one button). On desktop the 400 px card sits alone in a wide canvas.
The production refusal shows a developer sentence ("not configured for this environment") to an Owner. The J17 list now
works: 11 identical outlined "Set PIN" buttons, one per row.

## Clocker: K8, K9, the clock-out receipt, K12, K13, K14

**Blocked before:** the capture chain stopped after the saved-action help: once the help is open, "Check if it saved"
is not on screen (the help replaces the card until Back), and the later steps looked for older labels ("Retry same clock
action", "Review current status"; the kiosk now says "Send it again" and "See current status"). Every later step then
started from the wrong screen. K13 had no step, and K14's storage state failed in Spanish because it ran after the
lockout step had paused James's PIN.

**What I changed in the scratch flow:** a new focused flow (`clocker-fill.ts`): Back out of the help before checking; the
current labels; storage before any lockout. Each state is produced the way a tablet meets it:

- **K12:** the clock out's reply is lost (the request is aborted in the browser after 2.5 s) → "Check your last punch"
  with Check if it saved → the saved-punch help → Back → Check if it saved finds nothing → "Send it again" → the
  clock-out receipt (K11).
- **K9:** a clock in's reply is lost on this tablet, then James clocks in on a second Main Office tablet → Check if it
  saved → "Your earlier punch wasn't recorded" → See current status.
- **K13:** James's clock out is left unconfirmed, then Ana's PIN is checked on the same tablet (the PIN screen's own
  request, from the same browser) → James's Check if it saved finds another person signed in → "Someone else's punch is
  waiting". (A first attempt with a second tab failed: closing that tab clears the PIN, so the screen asked for the PIN
  again.)
- **K8:** the photo policy is answered in the browser (as `scripts/clocker-ipad-ui-qa.mjs` does) and Chromium's fake
  camera stands in for the tablet camera: notice, live camera, photo taken, and Continue without photo → receipt with the
  missing-photo note. No image is stored.
- **K14:** IndexedDB refused in this browser → "This tablet can't read its saved punches", in English and Spanish.

**Production:** not possible. Tablet setup (and the PIN save above) need an https `NEVORA_CLOCKER_ORIGIN` in production;
the owned harness hard-sets the http loopback origin, refuses `.env` input, and its only https path (isolated
workspaces) refuses production builds. The Clocker ran on the development build, as in the earlier sweep.

**K8 Photo (camera, local preview)** (`Clocker kiosk`, development)

| Variant | en 1024x768 | en 768x1024 | en 390x844 | es 1024x768 | es 768x1024 | es 390x844 | Notable |
|---|---|---|---|---|---|---|---|
| photo-camera | B r · 48w · 4b · 10t | B r · 44w · 4b · 10t | B r · 39w · 4b · 10t | B r · 53w · 4b · 10t | B r · 49w · 4b · 10t | B r · 43w · 4b · 10t | Live preview with face guide; Take photo, Continue without photo and Cancel |
| photo-notice | B r · 65w · 4b · 10t | B r · 61w · 4b · 10t | B r · 56w · 4b · 10t | B r · 68w · 4b · 10t | B r · 64w · 4b · 10t | B r · 58w · 4b · 10t | Notice card is clear; two disclosure links plus three actions |
| photo-receipt-without-photo | B r · 74w · 2b · 13t | B r · 70w · 2b · 13t | B r · 65w · 2b · 13t | B r · 79w · 2b · 13t | B r · 75w · 2b · 13t | B r · 69w · 2b · 13t | Amber missing-photo note inside the receipt; clear |
| photo-review | B r · 51w · 4b · 10t | B r · 47w · 4b · 10t | B r · 42w · 4b · 10t | B r · 59w · 4b · 10t | B r · 55w · 4b · 10t | B r · 49w · 4b · 10t | Four actions stacked (Use, Retake, Continue without photo, Cancel); on a phone the card runs past the fold |

**K9 Review the current punch** (`Clocker kiosk`, development)

| Variant | en 1024x768 | en 768x1024 | en 390x844 | es 1024x768 | es 768x1024 | es 390x844 | Notable |
|---|---|---|---|---|---|---|---|
| ready-after-review | B r · 82w · 4b · 13t | B r · 78w · 4b · 14t | B r · 72w · 4b · 13t | B r · 91w · 4b · 13t | B r · 87w · 4b · 14t | B r · 80w · 4b · 13t | Two stacked info notes (earlier punch kept; no breaks here) above the action |
| review-current | B r · 57w · 3b · 11t | B r · 53w · 3b · 11t | B r · 47w · 3b · 11t | B r · 63w · 3b · 11t | B r · 59w · 3b · 11t | B r · 52w · 3b · 11t | Amber ring, one filled action, Done and 'Something didn't save?' as links |

**K11 Recorded (receipt)** (`Clocker kiosk`, development)

| Variant | en 1024x768 | en 768x1024 | en 390x844 | es 1024x768 | es 768x1024 | es 390x844 | Notable |
|---|---|---|---|---|---|---|---|
| receipt-clock-out | B r · 62w · 2b · 13t | B r · 58w · 2b · 13t | B r · 52w · 2b · 13t | B r · 67w · 2b · 13t | B r · 63w · 2b · 13t | B r · 56w · 2b · 13t | Clean receipt: big time, facts, 8-second bar, grey Done |

**K12 Not confirmed / check status (recovery and retry)** (`Clocker kiosk`, development)

| Variant | en 1024x768 | en 768x1024 | en 390x844 | es 1024x768 | es 768x1024 | es 390x844 | Notable |
|---|---|---|---|---|---|---|---|
| check-if-it-saved | B r · 65w · 3b · 11t | B r · 61w · 3b · 11t | B r · 55w · 3b · 11t | B r · 74w · 3b · 11t | B r · 70w · 3b · 11t | B r · 63w · 3b · 11t | One filled action; 'Done' and 'Something didn't save?' share a row |
| saved-action-help | B r · 52w · 3b · 11t | B r · 48w · 3b · 11t | B r · 42w · 3b · 11t | B r · 57w · 3b · 11t | B r · 53w · 3b · 11t | B r · 46w · 3b · 11t | Outlined 'Ask Owner to check', teal 'Back' link and a 'Reference' disclosure: three action styles in a small card |
| send-it-again | B r · 58w · 3b · 11t | B r · 54w · 3b · 11t | B r · 48w · 3b · 11t | B r · 66w · 3b · 11t | B r · 62w · 3b · 11t | B r · 55w · 3b · 11t | Filled 'Send it again', underlined 'Check if it saved', then plain 'Done' and 'Something didn't save?': two link styles |

**K13 Someone else's punch in progress** (`Clocker kiosk`, development)

| Variant | en 1024x768 | en 768x1024 | en 390x844 | es 1024x768 | es 768x1024 | es 390x844 | Notable |
|---|---|---|---|---|---|---|---|
| someone-elses-punch | B r · 60w · 2b · 10t | B r · 56w · 2b · 10t | B r · 50w · 2b · 10t | B r · 66w · 2b · 10t | B r · 62w · 2b · 10t | B r · 55w · 2b · 10t | Real capture: amber ring, one sentence to the next person ('Nothing was recorded for you'), one filled Done; clear |

**K14 Sign-in / access changed; unavailable; storage problem** (`Clocker kiosk`, development)

| Variant | en 1024x768 | en 768x1024 | en 390x844 | es 1024x768 | es 768x1024 | es 390x844 | Notable |
|---|---|---|---|---|---|---|---|
| storage-problem | B r · 58w · 2b · 10t | B r · 54w · 2b · 10t | B r · 48w · 2b · 10t | B r · 69w · 2b · 10t | B r · 65w · 2b · 10t | B r · 58w · 2b · 10t | Band status says 'Can't save punches' while the card title says it can't read its saved punches |

**Inspection.** The recovery screens follow the Clocker Direction B rules (one ring, one filled action) and read calmly.
Problems: (1) "Send it again" sits over an underlined "Check if it saved", then a plain "Done" and "Something didn't
save?" row: two link styles and four ways out on one small card; (2) the saved-punch help uses an outlined button, a
teal Back link and a Reference disclosure, three action styles; (3) after See current status, two info notes stack
above the Clock out row; (4) the photo review stacks four actions (Use, Retake, Continue without photo, Cancel) and runs
past the fold on a phone; (5) K14's band says "Can't save punches" while the card says the tablet can't read them; (6) the
photo notice names the company from the policy while the band chip shows the workplace name; in a real tablet they are
the same business, but nothing ties them on screen.

## Still unreachable

- **A8/A9 on a production build:** the open form needs a mail transport, and production only accepts an authenticated
  https SMTP setup. Unblock: an owned local SMTP fixture that the production check accepts, or a harness option that
  passes a local sign-up origin and mail settings to the owned app.
- **A9 past the first step, and a completed A10:** need the onboarding control service (registrations, verification,
  workspace creation, bootstrap grants). Shown here with fictional replies. Unblock: run the Step 4 isolated onboarding
  runtime (`step4-lifecycle-browser.integration.ts`) with screenshots, which needs its custody directory and control
  database.
- **A15–A19 and J18 on a production build:** the billing page only accepts an http billing API outside production, and
  J18's server needs an https commerce origin with an installation secret. Unblock: a local https billing endpoint the
  production check accepts.
- **Clocker and the F8 save on a production build:** need an https `NEVORA_CLOCKER_ORIGIN`. Unblock: an https option in
  `owned-next-app.ts` (a local TLS front with a trusted test certificate and the origin set to it).
- **K8 "Use this photo":** not pressed; it would upload the fake-camera frame to the photo endpoint, which is only
  answered by a stand-in here.

## Gaps

- Desktop and phone only (390 and 1440; the Clocker at 1024×768, 768×1024 and 390×844); no 320.
- App and public pages ran with reduced motion; the Clocker with normal motion. Keyboard order was not re-checked.
- Fixture replies (marked in the JSON's `how`) show what the screen draws for a given reply, not that the service sends it.
- F8 has no Spanish (the page passes no language); J17 was recaptured in English only.
