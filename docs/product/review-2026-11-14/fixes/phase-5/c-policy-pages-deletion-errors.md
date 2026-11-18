# Phase 5, package C: policy and support pages, public account deletion, 404 and error pages, billing consistency, email design request

Builder C. Base `ad814bad`. Patch: `c.patch` (24 files). Evidence: `c-evidence/` (164 pictures, two HTML references,
one design request). Presentation only. No server module, action, route, token, redirect, email template or policy
sentence was changed.

Release sequence (Jose's policy, Nov 12): Development is the primary working release. This patch is for the
collaboration branch, to be integrated and verified in Development, then promoted to main only after Jose approves.
Nothing here was pushed, merged or deployed. All data in the pictures is fictional and local.

## 1. Findings

| Id | Status | What | Evidence |
|---|---|---|---|
| PB-001 (remainder) | fixed, one part needs builder A | Privacy and Terms now carry the sign-in language pill (same `LangSwitch`, same `nv-lang` cookie). In Spanish the band, back link, contents label, "Abrir todo" and closing links are Spanish, the document stays English (marked `lang="en"`) and one note at the top says so. The policy pages' closing links no longer say "(en inglés)". Support and Account deletion verified in Spanish. Still showing "(en inglés)": the sign-in footer line (`brand-legal.tsx`, builder A), which also appears under the 404 and the billing pages. | `privacy-default-390-es.png`, `terms-default-1440-es.png`, `support-default-390-es.png`, `delete-default-390-es.png`, `privacy-focus-language-390.png` |
| PB-024 | fixed | Subtitle is the finding's sentence in both languages. "Start deletion request" left the band. It is an outlined teal pill (1.5px, 48px) inside the card, at the end of the how-to, after the paragraph for someone who cannot sign in. Every policy fact kept. | `delete-default-1440.png`, `delete-default-390-es.png`, `delete-open-all-390.png` |
| PB-033 | fixed | Group headings are real `h2`s, 32px under the group before and 12px above their own. Measured in the browser: 32 / 12 for both headings, both languages, 390 and 1440. On Privacy, Terms and Account deletion the old group label no longer exists (sections are headings in one card). | `support-default-1440.png`, `support-question-open-390.png`, `scan-log` values in section 8 |
| PB-034 | fixed | Phones and tablets: first section open, "Open all" / "Abrir todo" at the top (it becomes "Close all" / "Cerrar todo"). Each heading is an `h2` holding a button with `aria-expanded` and `aria-controls`; Enter and Space work. Desktop: plain headings, no carets, no buttons, contents list beside the reading column, and "Questions" is in the list. | `privacy-default-390.png`, `privacy-open-all-390.png`, `privacy-closed-390.png`, `privacy-default-1440.png`, `privacy-contents-jump-1440.png` |
| PB-035 | fixed | Public 404 card is 560px and centred; the wordmark, pill and title share its edges; one VELANI line. Both languages. The signed-in 404 is a different component (`src/app/app/not-found.tsx`, the kit's `BStateScreen`) and already draws a 560px state card; verified, not changed. | `404-default-1440.png`, `404-default-390-es.png`, `app-not-found-default-1440.png` |
| Public error screens | fixed | `global-error.tsx` now passes the digest (it did not). The "Support reference" block from U11 is mounted on the public error screen through the seam's own `supportReferenceOfState`; the seam is unchanged. The "older system-state component" is dead code, see section 11. | `error-default-1440.png`, `error-offline-390.png`, `error-reference-default-390-es.png` |
| Consistency pass | fixed in my files, one item needs a page outside my list | Billing pages had up to four pills in a stack. Now one filled button per state, a second payment choice as one outlined pill, everything else as text links. | `billing-paid-1440.png`, `billing-paid-390-es.png`, `app-billing-trial-1440.png` |
| PB-022 | needs Codex | Design request delivered. Nothing wired. | `email-design-request.md`, `invitation-reference.html`, `invitation-reference-es.html`, four `email-invitation-reference-*.png` |

## 2. What was built

Public pages, no sign-in needed. Reached from the sign-in footer links and from each other.

- **`/privacy`, `/terms`** (`src/components/legal/policy-page.tsx`, `policy-sections.tsx`): one reading card. Language
  pill on the band. Desktop: sticky contents list (280px) beside the reading column, plain headings. Phone and tablet:
  disclosure headings, first open, "Open all". A section named in the address (`#legal-…`) opens. Until the script
  runs every section is open, so the document reads in full without it.
- **`/support`**: same frame. Group headings fixed. The three questions keep their native disclosure.
- **`/account-deletion`**: same frame. The how-to is always open with a plain heading and ends with the outlined
  action. The other four sections fold on phones.
- **Unknown public address** (`src/app/not-found.tsx`): 560px card, one legal line.
- **Public error screen** (`error.tsx`, `global-error.tsx`, `public-error-screen.tsx`): reference from both
  boundaries, Support reference mount.
- **Billing pages** (`/pages/plans`, `/pages/nevora-billing`, `/pages/nevora-billing-return`, `/pages/es-facturacion`,
  `/pages/es-pago`, and the Owner's `/app/billing`): button order and kinds only. No request, key, retry or state rule
  changed.
- **Clocker paused page**: checked, no change needed (one filled button or none, both languages, 320 to 1440).

New files: `policy-copy.ts`, `policy-page.tsx`, `policy-sections.tsx`, `policy-sections-state.ts`,
`policy-sections.test.tsx`. Removed: `open-on-desktop.tsx` (replaced). `legal-document.tsx` keeps `BlockView`,
`shortTitle` and `QuietPolicyLinks` for the signed-in pages that import them; the unused old `LegalDocumentPage` and
its styles are gone. `src/app/legal.css` is rewritten for the new markup.

## 3. States

| Screen | State | How produced | Evidence |
|---|---|---|---|
| Privacy, Terms | default, 4 widths, EN and ES | real local server | `privacy-default-*`, `terms-default-*` |
| Privacy, Terms | all open, all closed (phone) | real, clicked | `privacy-open-all-390*.png`, `privacy-closed-390.png`, `terms-open-all-390.png` |
| Privacy | contents link followed (desktop) | real, keyboard | `privacy-contents-jump-1440.png` |
| Support | default, question open | real | `support-default-*`, `support-question-open-*` |
| Account deletion | default, all open | real | `delete-default-*`, `delete-open-all-390*.png` |
| 404 | default | real | `404-default-*` |
| Signed-in 404 | default | real, signed in as the fictional Owner | `app-not-found-default-*.png` |
| Public error | server fault with short reference | a temporary probe page that throws (not in the patch) | `error-default-*` |
| Public error | offline | same probe, browser set offline | `error-offline-390*.png` |
| Public error | with a Support reference | same probe, error carrying a fictional UUID | `error-reference-default-*` |
| Global error boundary | reference passed | unit test only | n/a |
| `/app/billing` Owner | status not reachable | real local server (it answers 503 with no billing service) | `app-billing-real-server-*` |
| `/app/billing` Owner | trial, paid, grace, paused, not the Owner, open failed | forced answers (`page.route`), fictional figures | `app-billing-*` |
| `/app/billing` non-Owner | both messages | unit test only | n/a |
| Central billing | no handoff (entry) | real page, no billing service | `billing-entry-*` |
| Central billing | trial, paid, grace, paused, trial ended, over 30, refused, no answer, return confirming, return subscribed | forced answers for the billing service, fictional business and prices | `billing-*` |
| Clocker paused | paused, could not be checked | real | `clocker-*` |

No picture of a forced state is a claim of a real end-to-end run. No Stripe, no payment, no real billing service.

## 4. Keyboard and focus

- Policy page, phone (390): wordmark, language pill, back link (white ring on the band), then in Spanish the note's
  email link, "Open all", each section button, links inside open text (teal ring). Enter closed the section, Space
  opened it again; `aria-expanded` followed. `privacy-focus-section-390.png`, `privacy-focus-open-all-390.png`.
- Policy page, desktop (1440): wordmark, pill, back link, the 13 contents links, then links in the text. No section
  buttons exist on desktop (counted 0 buttons, 0 visible carets, 13 headings). Enter on a contents link put the
  section 24px from the top. `privacy-focus-contents-1440.png`.
- Language pill by keyboard: Enter changed Privacy from `en` to `es`, the cookie read `nv-lang=es`, the back link read
  "Iniciar sesión", and `/login` then rendered in Spanish. Same in reverse.
- 404 and error: focus pictures on the main action. Billing: tab order recorded (language, main button, outlined
  choice, text links, Sign out or Close, footer); every stop has a 2px ring.
- Targets: closing links raised from 42px to a 44px band; contents links are 44px; "Open all" 44px; section buttons
  52px; the deletion pill 48px.
- Reduced motion: the caret has no transition (`0s`); without the preference it is 150ms.
  `privacy-reduced-motion-390.png`.
- Not done: no screen reader was run.

## 5. English and Spanish

These surfaces are bilingual and render both languages from the existing source (`readAuthLang`, the `nv-lang`
cookie). Every screen above has pictures in both. Privacy and Terms are the exception by rule: their text is legal
text and stays English; only the page around them is Spanish. A unit test checks the English document is byte-equal
in both languages.

**Counsel flag kept:** the Spanish retention and backup wording on Account deletion (`src/app/account-deletion/copy.ts`)
is a translation of approved policy facts from round 1 and still needs legal review. I did not change it. A Spanish
Privacy Policy or Terms needs counsel.

## 6. Copy (new strings, for Jose)

`src/components/legal/policy-copy.ts`:

| Key | English | Spanish |
|---|---|---|
| openAll / closeAll | Open all / Close all | Abrir todo / Cerrar todo |
| contents | In this policy / In these terms | En esta política / En estos términos |
| questions | Questions | Preguntas |
| links | Privacy Policy · Terms of Use · Support · Account deletion | Privacidad · Términos · Ayuda · Eliminar cuenta |
| linksLabel | NEVORA policies and help | Políticas y ayuda de NEVORA |
| englishOnly | (none) | Este documento está disponible solo en inglés por ahora. Si necesitas ayuda para entenderlo, escribe a support@thevelani.com. |
| metaTitle | Privacy Policy · NEVORA / Terms of Use · NEVORA | Privacidad · NEVORA / Términos · NEVORA |

`src/app/account-deletion/copy.ts`, `sub`: "How to delete your account and what happens to your records." /
"Cómo eliminar tu cuenta y qué pasa con tus registros."

Under the policy pages' links: "© 2026 VELANI LLC" (the old subtitle "VELANI LLC" on Account deletion moved here).

No payroll sentence. No policy sentence changed. The email copy is in `email-design-request.md`.

## 7. Billing consistency pass, in detail

Checked against the sign-in look: one filled button, field and error style, sentence case, no system words, both
languages, 44px targets, focus.

- Fixed: `central.tsx` and `billing.tsx`. "Refresh status", the way back, "My pay statements" and "Close billing" were
  outlined pills. They are now text links in one centred row. The way back is the filled button only when it is the
  only thing to do (no status, or the subscription is confirmed). Refresh is the filled button only when the status
  could not be read. Counted in the browser: at most one filled button in every captured billing state.
- Already right: callouts with an icon and a tone, no enum names, both languages, focus on the red message after a
  refusal, 44px targets, no overflow at 320.
- The text links sit inside the card, under the buttons, not under the card. Under the card is the frame's `below`
  slot, which the page fills (`src/app/app/billing/page.tsx`, outside my list). See section 12.
- Not changed: the central page keeps its two-option language control (it cannot reload; round 1 decision).

## 8. Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src`.
- `npx eslint` on every changed `.ts` and `.tsx`: clean.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 893 files passed, 2 failed, 24
  skipped; 13,641 tests passed, 2 failed. The two failures are `src/lib/operations/managed-runtime.test.ts` and
  `src/lib/scheduling/generation/planner.test.ts` (a timing measurement). Neither imports anything I changed. The run
  shared the machine with other builders. Rerun alone, both files pass (2 files, 76 tests). `src/test/manual-publication.test.ts` is outside the directories that
  command runs.
- Tests added or changed: `policy-sections.test.tsx` (new, 9), `legal-pages.test.tsx` (5 new cases, 2 assertions
  updated: the deletion button's class and the "(en inglés)" links), `app-error-screen.test.tsx` (the global boundary
  now shows the reference, which the old assertion forbade; 1 new case for the Support reference),
  `central-recovery.test.tsx` (1 new case, both languages). No auth or security assertion was touched.
- Browser captures with `cap.sh` (owned local Postgres, fictional data): public run 103 files, billing run 84 files.
  Overflow 0 on every route and width. No `pageerror` except the probe's own thrown error.
- Measured: Support headings 32 above / 12 below; 404 and error cards 560 wide, centred, title on the card's left
  edge at 1440; signed-in 404 title at 88, band to 196, card 560, 24px under the band.
- Email reference: 0 remote requests, 0 overflow at 390 and 640, both languages.

Not run: the CI browser suites `central-billing-browser.integration.ts` and `commerce-recovery-browser.integration.ts`
(they find controls by role and name, which did not change, but I did not run them); WebKit; a screen reader; 200%
text size on the policy pages.

## 9. For Codex

- The email design request (`c-evidence/email-design-request.md`, section 4): company name and first name at send
  time, the reader's language, an HTML part in `sendRegistered` and the commerce `sendMail`, the expiry as a date.
- Support reference on the error screens: a boundary error carries no reference today. If a failed render should
  carry one, put a UUID on the error as `supportReference`; the screen already shows it and drops the short digest
  line. Otherwise nothing is needed.
- `global-error.tsx` renders without the root layout. I did not confirm that the `--b-*` tokens are loaded there, so
  the band and the reference block may fall back to plain colours on that one screen. It was the case before this
  patch too.

## 10. For Jose to decide

- The copy in section 6 and every email sentence in the design request.
- The Spanish note's wording on Privacy and Terms (it is the finding's sentence).
- Whether Privacy and Terms should go to counsel for a Spanish version.
- The policy pages now end with "© 2026 VELANI LLC".

## 11. Needed from another package

- **Builder A** (`src/components/brand-legal.tsx`): remove "(en inglés)" from the sign-in footer line. Until then the
  404 and billing footers still show it in Spanish. `src/components/auth-premium/doc-links.tsx` is no longer imported
  by anything; it can be deleted (I left it alone in case A edits it).
- **Clocker owner** (`src/app/clocker/[location]/not-found.tsx`): the tablet's own 404 still has the old lockup with
  three VELANI lines and 18px-tall footer links. Not my file. It does pick up the 560px card.
- **Signed-in app owner**: `src/components/signature/system-state.tsx` (`SignatureError`) still says "Check your
  connection". Nothing imports it, so no person sees it. Delete it or fix the sentence.
- **Whoever owns `src/app/app/billing/page.tsx`**: to put the billing text links under the card with Sign out, the
  page would pass them in the frame's `below` slot. The non-Owner branch there also still draws "My pay statements" as
  an outlined pill.
- Nothing is needed from builder A's shell for the policy pages: they use `DocBrand` and `AuthBackNav` as they are.

## 12. Not verified

- Captures were taken at commit `206bafb6`, which is the delivered code plus one temporary page that throws
  (`src/app/zz-error-probe`). The patch is that commit with the probe removed. Nothing else differs.
- The public error screen was only seen through that probe, in development mode, with Next's overlay hidden.
- The policy pages without JavaScript were reasoned from the server markup (all sections open), not opened in a
  browser with scripts off.
- `DESIGN.MD` was not updated with the new policy-page rules.
- The tracker `status.json` was not updated.
