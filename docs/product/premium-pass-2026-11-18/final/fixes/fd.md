# FD: signed-out pages, final verification fixes (premium pass, Nov 18, 2026)

Fix builder FD for final review D (`U/p9/fin-review-d.md`, 24 rows). Worktree `U/wt/fd`, base `16a64b001` (the combined
premium tree), detached temporary commits only, never pushed, no branch. Final source commit `407af4584`. Patch:
`U/p9/fd.patch` (`git diff 16a64b001 HEAD --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`, 1,216 lines, 21 files).
Evidence: `U/p9/fd-evidence/` (48 before and after pairs, each named by row). Helper scripts (local, not app code):
`U/keep/fd/` (`pair.mjs` composes the pairs, `evidence.py` lists them, `px.mjs` samples pixels). Capture worktrees kept:
`U/wt/fdbase` (before) and `U/wt/fdcap` (after, at `407af4584`).

Release sequence (Jose's policy): this is local UI work on fictional data. It goes to the development release for
integration and verification with the other packages, and to main or production only after Jose approves that exact
verified release. Nothing was deployed, pushed, published or sent; no real email, SMS or provider call was made.

Source and environment evidence: captures built by `U/cap.sh` from the committed tree of `U/wt/fdcap` (a detached copy
of `U/wt/fd` at the commit named in each log; the source check held at start and end of every run). Before pictures:
`U/wt/fdbase` at `16a64b001` plus a harness-only commit, and the reviewer's own sets `cap/fin-public-desk` and
`cap/fin-public-touch` (also `16a64b001`). Mobile Access on, local throwaway Postgres, Northside QA Workforce.

Skills used: nevora-ui-readiness, tastemaker, better-interface, stop-slop. DESIGN.MD "Current direction" and the
Inspection fixes through Phase 8, spec 3.2 and 3.3, `packages/p5.md` and the coordinator's note on the tracked harness
were read first.

## Rows

| # | Result | What changed | Evidence |
|---|---|---|---|
| 1 | Fixed | Desktop with Mobile Access (footer with "Need help?" in its own row): the column keeps only what hangs under the card, plus 12px (`--fd-hang`: 0 when the links sit in the card, 68px for Sign in in English and for Find your Employee ID, 156px for Spanish Sign in with its two link rows and language line, 119px for Welcome), in the same layer as the old reserves so it replaces them. The footer row keeps 28px above "Need help?" and 20px under the legal line. A card now ends 52px above the words "Need help?" on every page. The card's top is unchanged (16vh: 144px at 900, 128px at 800). Page heights at 1440x900: Sign in ES 989 to 900 (no scroll, help and legal line in view), Sign in EN 900 to 900, Sign in error ES 1073 to 977, Forgot EN 1011 to 943, ES 1120 to 1052, Check your email ES 1363 to 1151, EN 1279 to 1087, Reset link ES 1048 to 1036, Set up step 2 ES 1073 to 1005. At 1440x800 Sign in EN 821 to 800; ES 973 to 877 (still scrolls 77px: card and links need 805px from a 128px top). The reviewer's `:nth-child(3)` match on Check your email no longer adds 208px. | 01, 02, 03, 04 |
| 2 | Fixed | Under forced colours (layer rules): every field draws a 1px FieldText border, every button, language pill, back pill and workplace pill a 1px ButtonText border, and every card (the phone card, the content card, the desktop column card, policy cards) a 1px CanvasText outline inside its edge, so nothing moves. Seen on Sign in, Forgot refused and Privacy in Spanish at 390 touch. | 05, 06, 07 |
| 3 | Fixed | The tablet rule now holds at every width under 1024: a title inside the content card sits on the card's text edge (Access help, Find your Employee ID, the help topics). Centred phone titles on Forgot, Reset and Set up at 320 checked: unchanged. | 08, 09, 33 |
| 4 | Fixed, one part kept | Recovery and setup notes are the kit's `BCallout`, words unchanged, at every width (desktop and phone markup): Forgot refused (red, WarningCircle), Forgot offline (amber, the kit's offline glyph), Reset refused, passwords differ and access ended (red), Reset reply lost and Reset not confirmed (amber, Question), Reset link accepted (green, Check, with "Use a different code" as its action), Set up offline (amber), Set up not available (red), Set up not confirmed (amber, Question), Check your email's "this page can't tell you" (teal, Info). A wrapper (`.ar-note`) keeps each note's id, role and the focus it takes after a submit. A short first sentence is the title; see row 17 for the rule. Kept as they are: the setup facts under the passwords (key and ID-card lines): they are the form's quiet helper lines, like the rules above them, and a tinted box right above the one button would compete with it. The `noscript` lines were not converted (they show only without JavaScript). | 10 to 16, 34 to 37 |
| 5 | Fixed | A finish (Check your email, Password updated, You're set) has one alignment where its title shares the card with the mark (every desktop; tablets with Mobile Access): the 56px mark sits centred above the title, the head (title, workplace pill, line) is centred, the steps label is centred over its bars, and the second copy of the mark lower in the card is not drawn. Phones and tablets without Mobile Access (title on the band) keep the card's own mark at its head. Done stays green, the envelope teal. | 02, 17, 18 |
| 6 | Fixed | Where the content itself is the card (tablet Forgot, Reset, Set up and finishes; the phone help pages), it overlaps the band by 40px as Sign in's card does; the card rule's `margin: 0` had cancelled the overlap. The band keeps its height; the card rises to it (Forgot at 900: card 164 to 124, band ends 164). | 19, 08 |
| 7 | Fixed | `text-wrap: balance` on the links under the card ("¿Primera vez? / Configura tu cuenta"), `pretty` on help-row sub-lines, and the workplace name in Set up's line kept whole (a `Whole` inline block, so a name longer than the line still wraps inside itself). Checked at 320, 390, 900, 1440 in Spanish. | 21, 22, 48 |
| 8 | Fixed | Forgot's Email and Reset's code field: the error sits directly under its field, then the helper, as on Sign in (desktop and phone markup). | 23, 27 |
| 9 | Fixed | You're set on a phone: the Employee ID is a plain field with its label above it (13.5/18 600), the value at 20/26 600, 52px tall with room for the copy button, the helper under it; the grey panel is gone. | 38 |
| 10 | Fixed (layout); wording for Jose | Check your email, words unchanged: the envelope and a centred head, then the request's own sentence as body text, one teal callout "This page can't tell you whether the email was sent or has arrived. The reset link works once and expires in 15 minutes.", then what to do at body size, then the limit as a 13.5px grey line, then the button. Both paragraphs that were 13.5px or in a grey box now read at one size; no grey box. A shorter wording is under "For Jose". | 02, 39 |
| 11 | Fixed | Sign in's Spanish line is centred under its centred links at every width (it was left-aligned at 900). | 24 |
| 12 | Fixed | "Need help? / ¿Necesitas ayuda?" is teal 600 like the links under the card. | 01, 24, 48 |
| 13 | Fixed | The expired or used invitation has the phone's design at every width: title "You need a new invitation", the workplace pill, what happened and what to do as the line under the title (announced once, `role="status"`), the steps line, why a link lasts and what to do if already set up, then the one button (Mobile Access) and "Already set up? Sign in" under the card. No amber banner, no explanation split in two places. The no-link state now also reads explanation first, then the button. | 25, 26 |
| 14 | Fixed | Forgot's Employee ID placeholder on phones is the example "e.g. 10482 / p. ej., 10482", as on Sign in and the desktop form; it no longer repeats the label or clips at 320. | 27 |
| 15 | Fixed | A phone held sideways (844x390) gets what the app gives it (tablet layout, 560px form block, compact band): the card is 560px and centred (it was 772px); the way back joins the wordmark's row; Sign in's greeting (figure size) and workplace share one row on the card's text edge. Both fields and Sign in now sit in the 390px window (Sign in page 796 to 706 tall). Query: `B_WIDE_SHORT` with `(pointer: coarse)` on top, so a short desktop window keeps the desktop layout. | 40, 41 |
| 16 | Not changed (wording) | Support's title still repeats its sentence. Suggestion under "For Jose". | 46 |
| 17 | Fixed | One rule (`noteParts`, `src/components/auth-premium/note-parts.ts`, unit-tested): a note's bold title is a short first sentence (48 characters or fewer, two lines at 320) that more text follows; a one-sentence message, or one whose first sentence is longer, is all body text with its own period. Result: the deletion note is plain text (was 4 bold lines at 320, 2 at 1440); wrong ID or password is plain text in both languages (was a 3-line bold title in Spanish at 320); "Too many attempts", "We couldn't start setting your new password", "Your account is set up" and "You were signed out to keep your account safe" keep their titles. In Sign in's notes the address moves to the next line whole when it fits (no more "support@ / thevelani.com" at 1440); the policy note keeps its own wrapping. | 28, 29, 42 |
| 18 | Not changed (wording) | Step names on Check your email and Choose a new password: suggestion under "For Jose". | 02 |
| 19 | Partly (punctuation only) | Final periods added to the three setup facts (EN and ES). The offline lines keep no final period: `access-recovery.test.tsx` pins the Phase 3 rule "an inline alert has no closing period"; listed for Jose now that they are callouts. The other wording items are under "For Jose". | (copy diff) |
| 20 | Fixed | Tablets with Mobile Access: the page is a column whose footer follows the content and sits at the window's foot when the content is short. Every Mobile Access page at 900x1024 and 768x1024 is now 1024 tall (was 1036: the absolute footer's 44px link band ran 12px past the window). This also fixed an overlap the review did not list: at 900, Spanish Check your email ran 22px under "¿Necesitas ayuda?". | 19, 20 |
| 21 | Partly | The policy pages' language pill grows with text size (rem: 15px words in a 36px pill at 100%, 30px in a 72px pill at 200%). The footer's links wrap in balanced rows ("Eliminar cuenta" no longer alone on a third row at 320). Terms at 320: not a defect; "Using NEVORA" is one paragraph that happens to wrap after "law."; the legal text is untouched. | 32, 43 |
| 22 | Fixed | Access help's "I can't use my email" row takes the Info glyph; Question stays with "not confirmed". | 22 |
| 23 | Fixed | Support's note keeps "bank details" and "datos bancarios" together (a no-break space at render; the copy string is unchanged). | 46 |
| 24 | Fixed | Welcome: 24px from its line to Sign in (was 51px). Find your Employee ID: its card holds the explanation and Sign in, 24px apart (was 60px), and "Set up account / Configurar cuenta" is the link centred under the card (phones, tablets and desktop). | 30, 31, 09 |

## Every changed word

| Where | Before | After (English) | After (Spanish) |
|---|---|---|---|
| Set up, expired invitation, desktop and tablet title | Set up your account / Configura tu cuenta | You need a new invitation | Necesitas otra invitación |
| Same page, line under the title (moved from the amber banner and a second note; same words) | This link has expired or was already used. + Ask your Owner or manager to send a new invitation. | This link has expired or was already used. Ask your Owner or manager to send a new invitation. | Este enlace venció o ya se usó. Pide al dueño o a tu gerente que te envíe una invitación nueva. |
| Forgot on phones, Employee ID placeholder | Employee ID from your workplace / ID de empleado de tu lugar de trabajo | e.g. 10482 | p. ej., 10482 |
| Set up, the three facts (final period only) | …stays the same / …can tell you / …in Profile | …stays the same. / …can tell you. / …in Profile. | …sigue igual. / …te lo puede decir. / …en tu perfil. |

No other word changed. Shown differently, words unchanged: every note's first sentence as a title follows the row 17
rule (the title drops its period); "bank details" and "datos bancarios" use a no-break space; "Set up account /
Configurar cuenta" on Find your Employee ID is now a link under the card (its group is named "Find your Employee ID /
Encuentra tu ID de empleado", an existing string); "Need help?" changed colour and weight only.

## Files

`src/components/auth-premium/auth-b.css` (one "Premium pass FD" block at the end), `src/components/auth-premium/note-parts.ts`
(new) and `note-parts.test.ts` (new), `src/components/auth-premium/whole.tsx` (new), `src/components/auth-premium/signed-out-footer.css`,
`src/app/login/page.tsx`, `src/components/recovery-request.tsx`, `src/components/recovery-reset.tsx`,
`src/components/mobile-access/recovery-views.tsx`, `src/components/mobile-access/activation-view.tsx`,
`src/components/mobile-access/help-view.tsx`, `src/app/activate/activation-invitation.tsx`, `src/app/support/page.tsx`,
`src/components/access-recovery/copy.ts` (three final periods in each language). Tests: `src/app/login/page-message.test.tsx`,
`src/components/recovery-u11.test.tsx`, `src/app/activate/activation-u11.test.tsx`, `src/app/activate/activation-invitation.test.tsx`,
`src/components/access-recovery/phase5.test.tsx`, `src/app/legal-pages.test.tsx`, `src/components/auth-premium/phase8.test.tsx`.
Not touched: `b-kit.tsx`, `owner-b.css`, `b-tokens.css`, any signed-in page, the Clocker, `src/lib/legal/**`, server files.

CSS: `!important` follows the sheet's own ladder (`:not(#fd1)…`, six steps above P9's five) or sits in `@layer nv-b`
(the bottom reserve and the High Contrast rules). New media queries are the aliases (`B_DESKTOP`, `B_TABLET`, `B_PHONE`
range, `B_WIDE_SHORT` plus `(pointer: coarse)`) and `forced-colors`; two rules (rows 6 and 9) reuse this sheet's
established Mobile Access phone query `(max-height: 500px) and (orientation: landscape) and (pointer: coarse)`, because
they correct rules that live under that exact query. No colour literal added (system colours only under forced colours).

## Checks run

- Captures (`U/cap.sh`, role `sparse`, Mobile Access on, English and Spanish), one at a time:
  - Before: `cap/fd-before-desk` (all 21 pages at 1440, 1440x800, 1024, 900, 768, 320), `cap/fd-before-states` (19 states
    at 1440, 900, 320: Sign in ended, set up, too many attempts, deleting, replace, wrong details; Forgot empty, refused,
    lost reply, offline; Reset empty, passwords differ, refused, not confirmed, lost reply; Set up empty, not available,
    lost reply, offline), `cap/fd-before-touch` (390 and 844 touch, pages and states), `cap/fd-before-extra` (High
    Contrast and 200% text on Privacy, Sign in, too many attempts, Forgot refused and You're set, 390 touch).
  - After (final): `cap/fd-a3-desk` (39 pages and states at 1440, 1440x800, 1024, 900, 768, 320: 468 page loads),
    `cap/fd-a4-touch` (the same at 390 and 844 touch, plus High Contrast and 200%), `cap/fd-a5-touch` (the last two fixes:
    the sideways greeting edge and the address rule). Every run exit 0, no failed step, 0 horizontal overflow, 0 page
    errors. Console errors are only the scan's own forced 503, 400 and aborted requests.
  - The harness copy in `zz-scan/` (tracked in this base by mistake, committed before each capture, excluded from the
    patch) gained: a `WxH` width (`1440x800`), the state pages above, a geometry probe (`NEVORA_SCAN_PUBLIC_GEO`), and
    High Contrast and 200% shots (`NEVORA_SCAN_PUBLIC_EXTRA`). Chrome's default-font setting did not reach these pages in
    this harness (the root stayed 16px), so 200% is the root set to 200% directly, which scales every rem and em rule.
  - Every after picture was compared region by region with its before; 48 pairs are in the evidence folder.
- Small targets: the only new entries in the scan's under-44 list are the kit callout's quiet actions ("Use a different
  code", "Get a new reset link", "Try signing in"): 32px drawn with the kit's 44px hit band (`::after`, owner-b.css);
  the scan measures the drawn box. Before, these were 44px text links inside the old receipt.
- Type check `heavy.sh npx tsc --noEmit -p .`: `src` clean; the 7 errors are in `zz-scan/` (the capture tool).
- `npx eslint` on every changed TypeScript file: clean.
- Tests for the touched areas: 23 files, 330 tests pass.
- Full run `heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` at `407af4584`:
  936 files passed, 24 skipped; 14,429 tests passed, 741 skipped, 0 failed. (An earlier full run found one pinned CSS
  rule in `phase8.test.tsx` for the footer; that test now pins the balanced-row rule.)
- `git apply --check -R U/p9/fd.patch` in the worktree: clean.

## Band glass contrast (coordinator's note)

The signed-out pages keep the 12% band glass; nothing changed here, because every pill with white words on glass passes.
Every signed-out band is the solid `--b-band-solid` (#0C726C), so the band's lightest pixel under a pill is that colour;
the pill's fill measured in the captures is #29837D (12% white over #0C726C):

| Pill | Where | Measured fill | White text ratio |
|---|---|---|---|
| Language pill "English / Español" | phones and tablets (Sign in and sub-pages), policy pages at every width | #29837D at 390 touch (`fd-a4-touch/pub-signin-es-390.png`) and 1440 (`fd-a3-desk/pub-privacy-es-1440-fold.png`) | 4.53:1 |
| Workplace pill on the band | Sign in on phones and tablets, sideways phones | #29837D at 390 touch | 4.53:1 |
| "Sign in / Iniciar sesión" back link | phones, tablets, policy pages | plain text on the band (#0C726C), no pill | 5.77:1 |
| Language and back pills on desktop sign-in pages | 1024 and up | white pills with ink words (not glass) | not applicable |

4.53:1 clears 4.5:1 by a thin margin. If you want the same headroom as the signed-in shell, the 8% glass gives #1F7D78
and 4.93:1; it would be one token override in this sheet's band rules. Not applied, per your note.

## Needed from the kit

`BCallout` cannot take focus or disable its action, so the recovery notes sit in a wrapper (`.ar-note`) that carries the
id, role, `tabIndex={-1}` and the ref. Proposed diff to `src/components/owner-b/b-kit.tsx` (not applied):

```diff
-export type BCalloutAction = { label: ReactNode; href?: string; onClick?: () => void; aria?: string };
+export type BCalloutAction = { label: ReactNode; href?: string; onClick?: () => void; aria?: string; disabled?: boolean };
@@
-export function BCallout({ tone, icon, title, children, action, id, role }: { tone: BTone; icon?: BMeaning; title?: ReactNode; children?: ReactNode;
-  action?: BCalloutAction | ReactNode; id?: string; role?: "status" | "alert" }) {
+export function BCallout({ tone, icon, title, children, action, id, role, focusRef }: { tone: BTone; icon?: BMeaning; title?: ReactNode; children?: ReactNode;
+  action?: BCalloutAction | ReactNode; id?: string; role?: "status" | "alert";
+  /** A note that takes focus after the action it reports (a refusal under a form). */
+  focusRef?: Ref<HTMLDivElement> }) {
@@
-      : <button type="button" className="b-callout__a" aria-label={a.aria} onClick={a.onClick}>{a.label}</button>; })();
+      : <button type="button" className="b-callout__a" aria-label={a.aria} onClick={a.onClick} disabled={a.disabled}>{a.label}</button>; })();
-  return <div className="b-callout" data-tone={tone} id={id} role={role}>
+  return <div className="b-callout" data-tone={tone} id={id} role={role} ref={focusRef} tabIndex={focusRef ? -1 : undefined}>
```

With that, the wrappers and their two CSS rules can go. Also (as P5 noted): `BCallout` brings all of `owner-b.css` to the
signed-out pages, now Forgot, Reset and Set up too; a small callout sheet that `b-kit.tsx` imports would be lighter.

## For Codex

Nothing. No server, route, data or contract change.

## For Jose

- Row 10, a shorter Check your email (EN / ES), for your choice:
  - Drop the line "We asked for a reset email to be sent. / Pedimos que se envíe un correo para restablecer tu
    contraseña." (the next sentence says it).
  - Note: "We can't see whether the email arrived. The link works once and expires in 15 minutes. / No podemos ver si el
    correo llegó. El enlace funciona una sola vez y vence en 15 minutos."
  - Next: "Nothing after a few minutes? Check your spam folder, then your Employee ID and email. / ¿No llega nada en
    unos minutos? Revisa el correo no deseado y luego tu ID de empleado y tu correo."
  - Limit: "You can ask 3 times in 15 minutes. / Puedes pedirlo 3 veces cada 15 minutos."
  - The request's own sentence ("If the details match an active account, we'll email a reset link. …") is the server's
    and its translation; it stays unless you change it with Codex.
- Row 16: Support's title repeats its sentence. Option: "Protect your account / Protege tu cuenta", or keep.
- Row 18: name every step ("Step 2 of 3 · Check your email", "Paso 3 de 3 · Elige una contraseña nueva"). Phase 8 left the
  name off where the title already says it; the names exist, only a switch changes.
- Row 19: one casing for the roles ("Owner or manager" and "manager or Owner" both appear); "Use a phrase you don't use
  anywhere else" could be "Pick a phrase you don't use anywhere else / Elige una frase que no uses en otro sitio";
  "Ahora: inicia sesión." reads as a calque of "Next:" ("Siguiente paso: inicia sesión."); "Un trabajo más brillante por
  delante" is a calque; Support says "documentos de nómina" in one answer and "documentos de pago" in the note; in Spanish
  the footer's "Ayuda" (Support) and "¿Necesitas ayuda?" (Account help) lead to different pages.
- The offline notes end without a period ("…Reconnect, then try again"), by the Phase 3 rule for inline alerts; as
  callouts they could take one, like every other note body.
- Words changed in this package (also in the table above): the expired invitation's desktop and tablet title, and Forgot's
  phone placeholder; both reuse existing approved strings.

## Observed, not changed

- After a lost reset reply ("Check your sign-in first"), the green "Reset link accepted" note still shows under the amber
  one (the page's existing rule: only a refused link stops being "accepted"). Two tones side by side; whether the
  accepted line should leave once the result is unknown is a behaviour question.
- At 200% text on phones, a field's floating label overlaps the typed value, and the skip link "Ir al contenido" shows
  over the card in the full-page shot. Both are present before and after.
- Sign in in Spanish at 1440x800 still scrolls 77px (the card's 16vh top and its links need 805px).

## Not verified

- Real devices (iOS Safari, Android Chrome), Windows High Contrast themes (only Chromium's forced-colors emulation) and
  screen readers. Roles are unchanged in meaning (`alert` for refusals, `status` for receipts and the accepted link);
  the refusal's focus target is now the wrapper around the callout.
- Mobile Access off (the production configuration) was not captured. The row 1 and row 20 rules apply only where "Need
  help?" renders or `#mobile-access-page` exists; the callouts, field order, finish head and expired-invitation design
  apply with Mobile Access off too and were covered by unit tests only there.
- Keyboard order beyond the capture's first nine Tab stops on Sign in; reduced motion (nothing in this package moves).
- 1280x720 and 1100 widths; 1023 and 1024 exact boundaries.
