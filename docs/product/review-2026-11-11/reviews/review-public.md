# NEVORA signed-out pages: premium-quality review

Reviewed November 11, 2026, read only. 68 screenshots (English and Spanish, 390 and 1440) plus the code for states the screenshots can't show. Full findings with fixes and file references are in `review-public.json` (37 findings: 9 High, 17 Medium, 11 Low).

**Verdict.** The visual base is sound and already looks like one product: teal band, white 22px cards, pill buttons, clear focus rings, real inline errors, no horizontal overflow in either language. What keeps it below Gusto, ADP or Homebase is not the look. It is the journeys: the moments after a button is pressed (email sent, account activated, password changed, session ended) are thin or silent, Spanish stops at the edge of the sign-in pages, and several screens tell people to do something without giving them a way to do it.

## What the captures did and didn't show

- `/welcome` and `/access-help` render the 404 page in this environment, because mobile Access is off. Their screenshots are byte-identical to `pub-404-*`.
- `pub-activate-bad-*` is byte-identical to `pub-activate-*`, and `pub-reset-bad-*` to `pub-reset-*`. A bad link or code changes nothing on load. That is itself a finding (PB-007, PB-013).
- The Spanish captures of Privacy, Terms, Support and Account deletion are byte-identical to the English ones (PB-001).
- Everything after a successful submit was assessed from code only: check-your-email, reset success, activation with a real invitation, activation success, rate limiting, passkey, session expiry, the emails, and the manager's assisted-recovery page.

## Top 10 changes

1. **PB-001 (High). Put Spanish on Support, Account deletion and the policy chrome, and add the language switch there.** Today Spanish users get four fully English pages with an English back link.
2. **PB-002 (High). Stop saying "Invitation verified" before the server has checked it, and show whose account it is.** Title "Set up your account" / "Configura tu cuenta", subtitle "Choose a password to join {workspace}."
3. **PB-003 (High). Fix the activation hand-off.** Carry the Employee ID into sign-in at every width, focus the password, add a success mark, and show "Account activated. Enter your password to sign in."
4. **PB-004 (High). Give desktop a real "Check your email" screen.** Say the link works once and expires in 15 minutes, mention spam, offer "Back to sign in" and "Didn't get it? Check your details".
5. **PB-005 (High). Explain a session that ended.** Send people to sign-in with a calm note ("You were signed out to keep your account safe. Sign in to pick up where you left off.") and return them to the page they were on.
6. **PB-006 (High). After a wrong password, keep the Employee ID and say what to do next.** Mark only the password field; link "reset your password" in the message.
7. **PB-007 (High). Turn the empty Activate page into a three-step explainer, and give a damaged link its own message.** Today "Activate account" on Sign in leads to a card with nothing to do.
8. **PB-008 (High). Replace the 43-character code hand-off in assisted recovery with a QR code and "Copy link".**
9. **PB-009 (High). Close the Spanish cliff.** The app is English after a Spanish sign-in; say so in Spanish on the sign-in page now, and schedule translation of the employee screens.
10. **PB-010 + PB-011 + PB-012 (Medium). Make sign-in a proper front door.** One redirect from `/`, three proof rows in the brand panel in place of the repeated VELANI line, "New here? Set up your account", and visible help for Employee ID.

Next in line: one vocabulary for password reset (PB-014), one place for secondary actions on all six pages (PB-015), password rules beside the field they describe (PB-016), and the Spanish footer wrap (PB-018).

## Keep

- The split layout on desktop and the band-plus-lifted-card on phones. Card position is the same on all four auth pages, so nothing jumps between them.
- Labels above fields, 48px fields, 52px primary pill, one filled button per card on Sign in.
- Inline validation in the page's language under each field, with the browser bubble suppressed (`pub-signin-empty-*`).
- The double focus ring: 2px teal inside plus an outer ring. It is visible on white and on the band (`pub-focus-*`).
- Amber for "wait" (rate limit) and red for "wrong". The distinction is right.
- The neutral recovery answer that never reveals whether an account exists, and the same response time for every sign-in failure.
- The show-password eye that reveals both fields, with one stable name and a pressed state.
- Pending buttons that keep their fill, width and focus and refuse a second press.
- The Support page's safety note ("Never email passwords, codes, bank details or pay documents.") and the stated two-business-day response.
- The 404 page: plain words, one action, and the time-clock hint for tablets.
- Spanish copy overall: natural, informal "tú", correct punctuation. No layout breaks at 390 or 1440 apart from the footer wrap.

## Landing page recommendation

**What happens today.** `/` redirects to `/app`, which redirects a signed-out visitor to `/login`. There is no marketing or landing page. A visitor to the bare domain sees "Good morning", a workspace name, and a form asking for an Employee ID. Nothing says what NEVORA is, who it is for, or how to get an account. Accounts are created by a workplace; there is no self-serve sign-up.

**What comparable products do.** They split it. The main domain is a marketing site (gusto.com, adp.com, joinhomebase.com). The app lives on its own host and goes straight to sign-in (app.gusto.com, workforcenow.adp.com, app.joinhomebase.com). Going straight to sign-in is the standard for an app address. It is only a gap when the app address is also the only address people have.

**Options.**

| Option | What it is | When it fits | Cost |
|---|---|---|---|
| A. Sign-in as the front door | Keep the redirect (one hop, not two). Strengthen the sign-in page: proof rows in the brand panel, "New here?" path, Employee ID help, Spanish by browser default. | NEVORA is sold person to person and every user arrives by invitation. This is today's situation. | Small. PB-010, PB-011, PB-012, PB-020. |
| B. Minimal front door at `/` | One screen in the existing shell, signed-out visitors only. Signed-in visitors still go to `/app`. | Owners or prospects type or share the bare domain, or the link appears on printed material. | Small to medium. The flagged `/welcome` page is most of it already. |
| C. Marketing site on the main domain, app on a subdomain | A separate site with product pages, pricing and a demo request. | When NEVORA is sold to companies that haven't met Jose, or self-serve sign-up exists. | Large; a separate project. |

**Recommendation.** Do A now. Add B if the bare domain is what people are given. Hold C until there is something to sell from it; a "Get started" button with no sign-up behind it is worse than no page.

**If Jose wants B, it should contain only this:**

- Wordmark and the language switch.
- One line that says what it is: "Schedules, hours and pay for your team, in one place." / "Horarios, horas y pago de tu equipo, en un solo lugar."
- Two buttons: "Sign in" (filled) and "Set up your account" (outlined), with the note "Your workplace creates your account first."
- Three proof points, one line each: schedules and shift cover; time and timecards; payroll preparation. One real product image at most.
- One line for employers: "Want NEVORA for your company? Write to support@thevelani.com." No form.
- The legal line: Privacy, Terms, Support.

It should not contain pricing, testimonials, feature grids, animation, or a sign-up form.

## Journey 1: a new account

### As a new hire

| Step | What happens | Where it hurts | Finding |
|---|---|---|---|
| 1. Invitation email | Plain text, English then Spanish, a long raw link. Subject "Activate your NEVORA account / Activa tu cuenta de NEVORA". No company name, no person's name. | Looks like the emails people are taught to delete. | PB-022 |
| 2. Open the link | Activate account. Subtitle "Invitation verified · {workspace}". Two password fields. | "Verified" is claimed before the server checks. No name or email, so the person can't confirm the account is theirs. | PB-002 |
| 2b. Link is damaged or cut off | The same screen as having no link: "Open the invitation link in your email." | The person just did that. No message says the link is incomplete. | PB-007 |
| 2c. Link expired or used | Found only after typing both passwords: "This invitation link can't be used. Ask your Owner for a new invitation." | Late, and "your Owner" is internal vocabulary. | PB-002, PB-007 |
| 3. Set password | One rule: 8 characters. Checklist below the second field. | Rule shown twice, away from its field. Thin for a pay product. | PB-016, PB-026 |
| 4. Success | "Account activated. Keep your Employee ID." A read-only field with a copy button, then "Continue to sign in". | First sight of the Employee ID. No success mark on desktop. Not signed in. | PB-003 |
| 5. Sign in | Empty form: type the ID seen once, and the password again. Title may say "Welcome back". | A memory test at the peak moment. | PB-003, PB-036 |
| 6. First screen | Employee Home. A short guide appears only on phones with mobile Access on. In English even after a Spanish sign-in. | No welcome, and a language change. | PB-023, PB-009 |

### As a new Owner

- There is no sign-up. The Owner's account is created for them, and the only path in is the same invitation email, which says "Your Owner invited you" (PB-022).
- If they start at the bare domain, they get a sign-in form asking for an "Employee ID", and an "Activate account" link that leads to "No invitation? Ask your Owner." (PB-007, PB-012).
- Steps 2 to 5 are the same as the new hire's.
- First screen: the working dashboard. No first-run welcome or setup steps were found in code (PB-023). I could not see what a brand-new, empty company looks like.

**Most abrupt points:** the claim of verification before checking (step 2), the manual sign-in after activation (steps 4 to 5), and the dead-end Activate page for anyone who arrives without a link.

## Journey 2: password reset

### By email

| Step | What happens | Where it hurts | Finding |
|---|---|---|---|
| 1. Sign in → "Forgot password?" | Forgot password. Needs Employee ID and "Recovery email". Button "Request recovery". | Jargon. The helper that says which email to use is hidden from sighted users. No help for someone who also forgot the ID (desktop). | PB-014, PB-012 |
| 2. Submit | Button shows "Requesting recovery…". | Fine. | |
| 3. Confirmation | Desktop: title unchanged, a card "Request received" with one hedged sentence. | No expiry, no spam hint, no resend, no way back. The phone variant behind the flag does this properly. | PB-004 |
| 4. Email | "Reset your NEVORA password". Link expires in 15 minutes. Plain text, bilingual. | 15 minutes is short and is stated only here. | PB-022 |
| 5. Open the link | New password. A 43-character "Recovery code" field, pre-filled, then two passwords. | The token is exposed as the first field. An expired link looks normal until submit. | PB-013 |
| 6. Submit | Success: "Password updated" / "Your next step" / "Sign in with new password". | Says it three times, no success mark. Signing out other devices is a good, under-sold detail. | PB-017 |
| 7. Sign in | Empty form. | Acceptable; carry the ID if known. | PB-017 |

Error cases, from code: an expired or used code gives "This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager." with a "Request a new recovery code" link. That wording is good; it just arrives late. If the network drops, the page says to try signing in with the new password before asking for another code. That is honest and worth keeping.

### "I have a recovery code"

- From Forgot password, an outlined pill the same size as the primary button (PB-015) opens New password with an empty code field.
- The person pastes 43 characters. Placeholder, subtitle and helper all say roughly the same thing (PB-013).
- Field-level messages exist ("Paste the complete recovery code."). Good.

### Assisted by a manager

| Step | What happens | Where it hurts | Finding |
|---|---|---|---|
| 1. Employee | "Can't use your email?" opens: "Contact your manager or Owner for assisted recovery. They must verify your identity before issuing a recovery code." | Clear. On desktop it is a disclosure inside the card; fine. | |
| 2. Manager | Team → "Help someone sign in": Employee ID, how they checked, a confirmation switch, "Issue recovery code". | Well designed. Records how identity was verified. | Keep |
| 3. Hand-off | A 43-character code in a read-only field with "Select". "Share it privately." Expires at a stated time. | No copy, no link, no QR. This is the hardest step of any journey reviewed. | PB-008 |
| 4. Employee | Forgot password → "I have a recovery code" → paste → two passwords. | Three screens to reach the field. | PB-008, PB-013 |

Owner and Manager accounts need another Owner to help them; a sole Owner is sent to email support. That path exists only in the flagged Access Help pages, which were not visible.

## Other states, from code

- **Rate limiting.** "Too many sign-in attempts. Wait 15 minutes, then try again." in amber with an hourglass; fields not marked red. Correct tone. Add the reset alternative (PB-030).
- **Passkey.** Off in this environment. A grey words-only pill under Sign in; its error is styled differently from other alerts (PB-031).
- **Pending buttons.** Label swaps to "Signing in…" with a spinner; width and focus are held. Good.
- **Session expired.** Silent redirect to a bare sign-in page (PB-005).
- **Account being deleted.** "This account is being deleted, so it can't be used to sign in. Email support@thevelani.com with your deletion reference…" Clear and shown only after the password matches. Keep.
- **Public error page.** English only, no language switch (PB-025).

## What I could not see

- Any screen after a successful submit, and any state that needs a real invitation or reset link (listed at the top).
- `/welcome` and all `/access-help` topics: mobile Access was off, so they returned 404. With it on, phones use different forms (`src/components/mobile-access/*`), which I read but did not see rendered.
- The passkey button, the rate-limit and session-expired screens, and the public error page.
- The emails as delivered, and the manager's assisted-recovery page.
- A brand-new Owner's first screen with an empty company; only an established Owner Home was captured.
- Tablet widths (768 to 1023), keyboard and autofill behaviour on a real phone, reduced motion, and 200% zoom.
- Whether the Employee ID survives a failed sign-in in a real browser. In code it is dropped when mobile Access is off; the error screenshots show empty fields but may have been opened by address.
- The eight skill files were skimmed for their rules, not read line by line.
