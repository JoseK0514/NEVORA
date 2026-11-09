# Employee/Lead mobile account deletion: independent UI/UX review

- **Reviewer role:** independent senior UI/UX reviewer (NEVORA UI Designer agent). Read-only; no application or test code changed.
- **Revision reviewed:** `3df9513d12c1a870f0d7b8c4258860839ec4ad87` (worktree `.claude/worktrees/emp-mobile-p2`, clean).
- **Date:** 2026-10-28
- **Authority applied:** `docs/product/specs/employee-mobile-teal/README.md` (the scoped Employee mobile authority), `src/components/employee-mobile/mobile.css` tokens. Comparison surfaces: `device-alerts.tsx/.css`, `profile.tsx/.css`, `requests.css` (shared buttons and heading).
- **Subject:** `src/components/employee-mobile/deletion.tsx`, `deletion.css`, owner `src/components/account-deletion-form.tsx`, facts in `src/lib/legal/policies.ts`.
- **Evidence:** `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8dc318c3-a7c1-41c9-b2d0-c675318ab347/scratchpad/evidence/deletion-run-4/` plus `results.json` (contrast samples, media metrics, console messages).

## Images inspected

Review: `chromium-review-light-390.png`, `webkit-review-light-320.png`, `webkit-review-dark-390.png`, `firefox-review-dark-430.png`, `chromium-review-text200.png`.
States: `chromium-validation.png`, `chromium-failed.png`, `webkit-failed.png`, `chromium-uncertain.png`, `firefox-uncertain.png`.
Receipt: `chromium-receipt-light-390.png`, `firefox-receipt-light-430.png`, `webkit-receipt-dark-320.png`, `firefox-receipt-text200.png`.
Other: `chromium-signin-refused.png`, `webkit-landscape-coarse.png`, `chromium-manager-390.png`.
I also cropped and enlarged the error line in `chromium-validation.png` to check its colour.

## What works

- The page order is right for a destructive own-account task, and it matches established workforce products. The page shows your account, then what happens (access ends now, deletion follows later, your job doesn't change), then what may be kept (in a disclosure), then the password, the explicit acknowledgement, the destructive action, and finally the safe exit. Password and checkbox come last, so you read the consequences before you can act.
- The scoped tokens are used consistently: rem type roles, the 16/12 px radii, the 24 px inset and 28 px section gap, regular Phosphor icons only, and 48 px actions with 44 px or larger targets. Sampled contrast clears AA everywhere. The lowest light sample is help text at 5.03:1, and dark is 7.71:1 or higher. The dark red action (`#f3a79d` with `#0c1817` text) is 9.34:1.
- Received/duplicate is clearly different from the other states. It has a teal wash and a check, uses past-tense wording, shows a large reference with the time it was received, offers a working Copy button with a written-down fallback, and removes the back link.
- Coarse landscape (`webkit-landscape-coarse.png`) and 200% root text keep both actions above the navigation. The Manager at 390 px correctly stays on the incumbent Quiet page (`chromium-manager-390.png`).
- The copy is mostly truthful and hedged ("We aim to…", "If we have your email address…"). It keeps "Your job doesn't change" in front of the user. "We'll never ask for your password" is a good anti-phishing line.

## Findings

### DEL-UI-1: Material. Field errors render in supporting grey, not error red
- **Screen/state:** Review, validation (checkbox missing). The same cascade affects the password errors ("Enter your password…" and "That password isn't right"). Image: `chromium-validation.png`; the enlarged crop shows grey text.
- **What is wrong:** `.em-delete-error { color:var(--em-red) }` (deletion.css:50) loses to two more specific rules. `.em-delete-section > p { color:var(--em-muted) }` (line 13) beats it for the checkbox error. `.em-delete-field > p { color:var(--em-muted) }` (line 41) beats it for the password error. Both have a class plus an element under the same prefix. As a result, "Check this box to confirm you understand." looks like help text, and only the red outline marks the problem. A wrong-password reply would put two grey lines under the field (help, then error), and nothing separates them except weight. The most common recovery in this flow is therefore the hardest to see.
- **Recommendation:** Raise the error selector to `.em-delete :is(.em-delete-section,.em-delete-field) > p.em-delete-error`, or move the muted rules to `:not(.em-delete-error)`. Add a leading 18 px regular `WarningCircle` (aria-hidden) so the error doesn't rely on colour alone. Capture wrong-password and missing-password states in light and dark.

### DEL-UI-2: Material. "Failed" and "uncertain" look almost the same to a nontechnical person
- **Screen/state:** Failed (`chromium-failed.png`, `webkit-failed.png`) compared with uncertain (`chromium-uncertain.png`, `firefox-uncertain.png`).
- **What is wrong:** The headings differ by one verb: "We couldn't **send** your request" and "We couldn't **confirm** your request". Both use the same `WarningCircle` icon in the same position and the same layout. Only the wash colour differs (red or amber), and the scoped spec says status never depends on colour alone. "Couldn't confirm" reads as another failure. A user who skims will think nothing happened. In fact the request may have been accepted and every session ended.
- **Recommendation:** Make the outcome in the heading unmistakable, and use a different icon for each state:
  - **Failed:** `XCircle`/`WarningCircle`, heading "Your request wasn't sent". Body: "Nothing changed. You're still signed in. Try again."
  - **Uncertain:** `Question` or `HourglassMedium` (regular), heading "We don't know yet if your request was saved". Body: "Your connection dropped before we heard back. Your account may already be signed out everywhere."
  - Keep the amber and red washes as secondary cues.

### DEL-UI-3: Material. The uncertain recovery hides that "Check my request" can submit a deletion
- **Screen/state:** Uncertain (`chromium-uncertain.png`).
- **What is wrong:** The copy reads "Check your request to find out. If it wasn't saved, it's sent again." "It's sent again" is passive and vague. It doesn't say that pressing the button will make the deletion request now if none exists. The body also says "Check your request" while the button says "Check my request". For an irreversible request, the user has to know that this button is a second consent, not a read-only lookup.
- **Recommendation:** "Tap **Check my request** to find out. If we don't find your request, this sends it now. Your password and confirmation are still filled in." Keep the button red, because it may submit.

### DEL-UI-4: Material. "Keep my account" is offered after the request may already have been accepted
- **Screen/state:** Uncertain, and busy while checking. The button sits just below the fold in `chromium-uncertain.png` and `firefox-uncertain.png`; deletion.tsx:111 renders it in every form state except unavailable.
- **What is wrong:** No self-service cancellation exists. Once the reply is lost after COMMIT, the request may be saved and all sessions ended. "Keep my account" then promises something the service can't deliver. Following it to Profile with an ended session also leads to sign-in, where the user sees the "being deleted" refusal. That is a contradiction they will find upsetting.
- **Recommendation:** In uncertain and busy-checking, replace the secondary with a neutral "Back to Profile", or remove it. Never use "Keep my account" when the outcome is unknown. In idle, validation, failed and wrong-password, "Keep my account" stays truthful.

### DEL-UI-5: Material. The review never says the request can't be undone in the app
- **Screen/state:** Review, "What happens" (`chromium-review-light-390.png`, `webkit-review-light-320.png`).
- **What is wrong:** "Your account is deleted later … within 30 calendar days" is the familiar consumer grace-period pattern, where people expect to be able to change their mind. Nothing on the review or the receipt says there is no cancel. The checkbox line ("I won't be able to sign in again") implies it, but it doesn't say so. The brief requires no promises beyond what the service does. Silence here lets the user assume a promise.
- **Recommendation:** Add one plain sentence to the "Your access ends right away" fact or just above the password: "You can't cancel this in NEVORA after you confirm." Don't suggest that support can reverse it unless an operational process for that exists. Optionally echo it on the receipt under "What happens next".

### DEL-UI-6: Material. App navigation stays live after every session has ended
- **Screen/state:** Receipt in every capture (`chromium-receipt-light-390.png`, `webkit-receipt-dark-320.png`, `firefox-receipt-text200.png`). The ended states (signed out, changed) and uncertain use the same shell.
- **What is wrong:** The bottom navigation (Home, Schedule, Requests, Hours, More) stays tappable, even at 200% where it takes about 250 px of an 844 px screen. The account can't be used any more. Any tab leaves the receipt for a dead session or sign-in, and the reference is lost if the user didn't copy it. The page subtitle tells them to "Keep your reference until it's done", and the nav works against that.
- **Recommendation:** On receipt and ended states, hide the mobile navigation or make it inert. There is precedent: `mobile.css:175` already hides it for `.q-page[data-q-sheet]`. That makes Done (sign-out) the single exit. Also consider showing the reference above Done again, or keeping the Copy action near Done at 200%.

### DEL-UI-7: Minor. The failed body blames the connection
- **Screen/state:** Failed (`chromium-failed.png`).
- **What is wrong:** "Check your connection, then try again." The evidenced failed path is a server or database rejection that rolled back. A lost connection maps to *uncertain*. The guidance points the user at the wrong cause.
- **Recommendation:** "Nothing was saved and you're still signed in. Try again in a moment. If it keeps happening, email support@…"

### DEL-UI-8: Minor. "What may be kept" is one sentence of about 120 words, and it repeats itself
- **Screen/state:** Review with the disclosure open (`chromium-review-light-390.png`, `webkit-review-dark-390.png`, `firefox-review-dark-430.png`).
- **What is wrong:** The lead-in ("Some attendance, payroll, security or dispute records… must keep:") runs into `RETENTION_SCHEDULE`, which starts with "attendance…" again. The disclosure is the right progressive-disclosure choice, but it holds an unbroken legal paragraph. Even at 430 px it fills the screen, and hourly employees can't scan it.
- **Recommendation:** Show the categories as a short list (pay and time records, 3 years; tax records, 4 years or more; security logs, up to 90 days; privacy request records, 24 months; legal holds, until released). Reuse the structure of the PRIVACY "How long we keep information" list. Drop the duplicated lead-in and keep "They're restricted and never used to restore your account." plus the full-details link.

### DEL-UI-9: Minor. An ambiguous clause in the deletion timing
- **Screen/state:** Review, "Your account is deleted later" (all review captures).
- **What is wrong:** "…and the content you contributed within 30 calendar days after we receive the request." This can be read as content contributed *within* 30 days.
- **Recommendation:** Lead with the time: "Within 30 calendar days of your request, we aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed."

### DEL-UI-10: Minor. The receipt keeps the imperative title
- **Screen/state:** Receipt (`chromium-receipt-light-390.png`, `webkit-receipt-dark-320.png`).
- **What is wrong:** The H1 still says "Delete your account" after the request is accepted. That reads as if the action is still pending, and it competes with the status card.
- **Recommendation:** On receipt and duplicate, title the page "Deletion requested" or "Your account is being deleted". Keep "Keep your reference until it's done." as the subtitle.

### DEL-UI-11: Minor. The reference typeface changes by engine
- **Screen/state:** Receipt. Chromium renders Courier, a serif monospace (`chromium-receipt-light-390.png`). Firefox renders Menlo (`firefox-receipt-light-430.png`) and WebKit renders SF Mono (`webkit-receipt-dark-320.png`).
- **What is wrong:** `ui-monospace,"SF Mono",monospace` falls back to Courier in Chromium. The reference, the one fact the user must keep, looks dated and off-brand there.
- **Recommendation:** Use the system UI font with `font-variant-numeric: tabular-nums` and wide tracking, or use a fuller stack: `ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono",monospace`. Make sure the reference alphabet avoids look-alike characters such as 0/O and 1/I/L.

### DEL-UI-12: Minor. The destructive action has no hover or pressed state
- **Screen/state:** Review, failed and uncertain ("Confirm deletion request", "Check my request").
- **What is wrong:** `.em-delete .em-delete-confirm { background:var(--em-red) }` outranks the shared `.em-request-primary:hover` press colour, and no `:active` exists. Tapping the most consequential button gives no visual feedback until the label changes on submit.
- **Recommendation:** Add `--em-red-press` (light around `#922a20`; dark around `#f6bdb5`), and apply it on `:hover:not(:disabled)` and `:active`.

### DEL-UI-13: Minor. The status surfaces don't match the accepted Alerts treatment
- **Screen/state:** Every outcome card compared with `device-alerts.css` (`.em-device-symbol`).
- **What is wrong:** Alerts, the accepted sibling recovery page, puts status icons in a 44 px tinted tile. Deletion uses a bare 24 px icon. Across this one page the icons are 18 (back), 20 (caret), 22 (facts, summary, eye) and 24 px (status). The receipt also nests a white card inside the wash card, which cuts the content width to about 196 px at 320.
- **Recommendation:** Reuse the Alerts symbol tile for outcome headings. Standardise on 22 px for in-row icons and 20 px for carets. Flatten the reference block into the status card, separated by a divider, instead of nesting a second card.

### DEL-UI-14: Advisory. The show/hide control is described twice
- **What is wrong:** The control switches both `aria-pressed` and `aria-label` ("Show password" or "Hide password"). Screen readers may announce "Hide password, toggle button, pressed", which is a double negative.
- **Recommendation:** Keep a static `aria-label="Show password"` and let `aria-pressed` carry the state.

### DEL-UI-15: Advisory. The email address breaks mid-domain at 200%
- **Screen/state:** `firefox-receipt-text200.png` shows "support@thevelani.c / om".
- **Recommendation:** Insert `<wbr>` after "@" and before the final "." so the address breaks at a natural point. It must still never show a hyphen, as now.

### DEL-UI-16: Advisory. The next screen in the flow (incumbent sign-in) delivers the refusal coldly
- **Screen/state:** `chromium-signin-refused.png`.
- **What is wrong:** A "Good evening" greeting sits above red error text. There's no icon, the support address isn't a link, and "Forgot access?" still invites a recovery attempt that can't succeed.
- **Recommendation:** This is outside this port, but record it for the Sign-in batch. Use a calm caution surface with an icon and a linked address, and consider hiding the greeting while the refusal shows.

### DEL-UI-17: Advisory. The receipt drops "Your job doesn't change"
- **What is wrong:** Desktop and Quiet keep the workplace group on the receipt. Mobile drops it at the moment someone might worry about their employment.
- **Recommendation:** Add it as a third "What happens next" fact, using `Briefcase` as on the review.

### DEL-UI-18: Advisory (evidence condition). Coverage gaps in the frozen captures
- No review capture shows the top of the page (back link, H1, account card).
- Validation, failed and uncertain were captured only in light at 390. There are no dark, 320 or 200% captures of them.
- No captures exist of wrong password, missing password, pending ("Sending request…" or "Checking…"), busy, unavailable, duplicate, signed out, or changed.
- The only visible-focus evidence is the checkbox ring.
- Recommendation: capture these before release sign-off, especially after DEL-UI-1, DEL-UI-2 and DEL-UI-4 change.

## Verdict

**GO with conditions.** The structure, tokens, targets, contrast and receipt are at the bar of established workforce apps. The conditions before acceptance are DEL-UI-1 through DEL-UI-6:
- the error colour cascade (DEL-UI-1);
- clear failed and uncertain outcomes, and honest second consent for "Check my request" (DEL-UI-2 and DEL-UI-3);
- no "Keep my account" when the outcome is unknown (DEL-UI-4);
- an explicit no-cancel statement (DEL-UI-5);
- no live navigation after sessions end (DEL-UI-6).

Then recapture the states listed in DEL-UI-18. DEL-UI-7 to DEL-UI-13 should land in the same pass. DEL-UI-14 to DEL-UI-17 can follow later.

## Closure at cb3c67ee

- **Revision checked:** `cb3c67eed16a4a40ff33a461ac33bc9fdeee45bb`, covering commits `208271dd`, `625ef2e8` and `cb3c67ee`. I read the source diff of `deletion.tsx`, `deletion.css` and `account-deletion-form.tsx` from `3df9513d`. (The worktree has unrelated uncommitted payroll edits. They don't touch deletion.)
- **Evidence:** `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8dc318c3-a7c1-41c9-b2d0-c675318ab347/scratchpad/evidence/deletion-run-7/`. `results.json` lists 39 checks across three engines, and sampled contrast is unchanged: at least 5.03:1 in light and 7.71:1 in dark.
- **Images inspected:**
  - `chromium-wrong-password.png`
  - `webkit-validation-dark.png`
  - `firefox-uncertain.png`, `chromium-uncertain-dark.png`
  - `chromium-failed-dark.png`
  - `webkit-pending.png`
  - `chromium-receipt-light-320-top.png`, `firefox-receipt-dark-390.png`, `firefox-receipt-text200.png`
  - `webkit-landscape-signed-out.png`
  - `webkit-review-light-320-top.png`, `chromium-review-light-390.png`
- **Method:** I checked each claim against the code and the pixels. I didn't take the author's description on trust.

| ID | Status | Basis |
|---|---|---|
| DEL-UI-1 | **Closed** | Selector raised to `.em-delete :is(.em-delete-field,.em-delete-section) > p.em-delete-error`. Red text is visible for the wrong password (`chromium-wrong-password.png`) and the dark checkbox error (`webkit-validation-dark.png`). The leading error icon I suggested wasn't added. The text, the red border and the field link are enough. |
| DEL-UI-2 | **Closed** | Failed: `XCircle`, "Your request wasn't sent". Uncertain: `Question`, "We don't know yet if your request was saved". The two outcomes now differ in icon, heading and colour in both themes. |
| DEL-UI-3 | **Closed** | The copy now states that checking "sends your deletion request now, so only check if you still want your account deleted". The wording problem is DEL-UI-19. |
| DEL-UI-4 | **Closed** | "Keep my account" isn't rendered while checking (`!checking`). The header "Profile" back link stays as a neutral exit. |
| DEL-UI-5 | **Closed** | "You can't undo it in NEVORA … After you confirm, NEVORA has no way to cancel it." This is truthful, and it doesn't imply that support can reverse it. |
| DEL-UI-6 | **Closed for receipt, duplicate and signed-out; minor residual for uncertain** | The navigation is hidden (`firefox-receipt-dark-390.png`, `webkit-landscape-signed-out.png`). In uncertain (`chromium-uncertain-dark.png`) the navigation is still live, though every session may have ended. Tapping a tab leads to sign-in and drops the retained recovery. This is acceptable because the sign-in refusal names the deletion, so I'm tracking it as DEL-UI-22 rather than blocking. |
| DEL-UI-7 | **Closed** | "Check your connection" is removed. Redundancy is noted in DEL-UI-20. |
| DEL-UI-8 | **Partially closed (minor, open)** | The duplicated lead-in is gone, and the restriction sentence is now its own paragraph. The schedule is still one sentence of about 110 words with no list (`chromium-review-light-390.png`). |
| DEL-UI-9 | **Closed** | "Within 30 calendar days after we receive the request, we aim to delete…" |
| DEL-UI-10 | **Closed** | The H1 reads "Deletion requested" (`chromium-receipt-light-320-top.png`). |
| DEL-UI-11 | **Closed** | The reference uses the system font with tabular numbers and tracking. It looks the same across engines. |
| DEL-UI-12 | **Closed** | `filter:brightness(.9)` applies on `:hover` and `:active` when the button isn't disabled. I accepted this without a separate token, because it keeps the semantic red in both themes. |
| DEL-UI-13 | **Open (minor, not changed)** | Status icons are still bare 24 px, the icon sizes are still mixed, and the reference card is still nested inside the status card. This doesn't block. |
| DEL-UI-14 | **Closed (mobile)** | Static "Show password" label with `aria-pressed`. The desktop Quiet input still switches its label, but that's outside this port. |
| DEL-UI-15 | **Open (advisory)** | The address still breaks mid-domain ("thevelani.c / om", `firefox-receipt-text200.png`). No hyphen appears. |
| DEL-UI-16 | **Deferred (advisory)** | The incumbent sign-in page is outside this scope. Carry it to the Sign-in batch. |
| DEL-UI-17 | **Closed with copy note** | The Briefcase fact is on the receipt. See DEL-UI-21. |
| DEL-UI-18 | **Closed, with a recorded gap** | Captures now cover the page top, validation/failed/uncertain in light and dark, pending, wrong password and signed-out in landscape. Busy, unavailable, duplicate and changed are covered only by unit tests. That gap remains and is acceptable for local acceptance. |

### New findings at cb3c67ee

#### DEL-UI-19: Minor. A broken sentence in the uncertain recovery copy
- **Image:** `firefox-uncertain.png`.
- **What is wrong:** "Enter your password again, then Check my request finds out." The button name is dropped into the sentence as its subject, so the sentence doesn't parse.
- **Recommendation:** "Enter your password again and tap **Check my request** to find out. If it wasn't saved, checking sends your deletion request now, so only check if you still want your account deleted."

#### DEL-UI-20: Minor. The failed copy says "not saved" twice
- **Image:** `chromium-failed-dark.png`.
- **What is wrong:** "NEVORA couldn't save it. Nothing was saved and you're still signed in."
- **Recommendation:** "Nothing was saved and you're still signed in. Enter your password again to try again."

#### DEL-UI-21: Minor. The receipt job note overstates
- **Image:** `firefox-receipt-dark-390.png`.
- **What is wrong:** "…the records your employer has to keep stay the same" promises that the records won't change. They can still be corrected under the employer's process.
- **Recommendation:** Reuse the review wording: "Deleting your NEVORA account doesn't end your employment or remove records your employer has to keep."

#### DEL-UI-22: Minor. The recovery outcome sits below the field it asks you to refill, and navigation is live in uncertain
- **Images:** `firefox-uncertain.png`, `chromium-failed-dark.png`, `webkit-pending.png`.
- **What is wrong:** Since `cb3c67ee`, the password field is empty after every reply, which is an acceptable privacy behaviour change. Focus moves to the outcome, though, and the outcome sits *below* the empty field it tells you to fill. The user has to scroll back up to type, then down again to act. While the retry is pending, the previous "Your request wasn't sent" card stays visible above "Sending request…" (`webkit-pending.png`), so the screen briefly says two things at once. The uncertain navigation residual from DEL-UI-6 also lands here.
- **Recommendation:**
  - Render failed and uncertain outcomes directly above "Confirm it's you", or add a "Go to password" link in the outcome that focuses the field.
  - Hide or dim the previous outcome while `pending`.
  - Hide the mobile navigation in uncertain as well, as receipt does.

### Updated verdict

**GO.** All six material conditions are closed, with DEL-UI-6 closed for the states where every session has definitely ended. The remaining items are minor or advisory: DEL-UI-8, DEL-UI-13, DEL-UI-15, DEL-UI-16 and DEL-UI-19 to DEL-UI-22. None of them misstates the outcome, the consequence or the lack of a cancel. I recommend landing DEL-UI-19 to DEL-UI-22 in the next deletion touch. These are local three-engine results; physical devices, screen readers, hosted transport and release limits still apply.
