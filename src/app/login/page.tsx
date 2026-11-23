import {mobileAccessMetadata} from "@/components/mobile-access/metadata.server";
import Link from "next/link";
import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MOBILE_ACCESS_COPY} from "@/components/mobile-access/copy";
import {AccessEmployeeIdInput} from "@/components/mobile-access/journey";
import {AccessCard, AccessOutside} from "@/components/mobile-access/chrome";
import {CaretDownIcon} from "@phosphor-icons/react/dist/ssr/CaretDown";
import { BCallout, BEmail } from "@/components/owner-b/b-kit";
import { SUPPORT_EMAIL } from "@/lib/legal/policies";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { noteParts } from "@/components/auth-premium/note-parts";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { login } from "@/app/login/actions";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { QuietAuthShell } from "@/components/auth-premium/auth-shell";
import { Greeting } from "@/components/auth-premium/greeting";
import { PasswordInput } from "@/components/auth-premium/password-input";
import { PasskeySlot, PasswordSignInMarker } from "@/components/auth-premium/passkey-slot";
import { AuthValidation, FieldInvalid } from "@/components/auth-premium/auth-validation";
import "@/components/quiet/quiet.css";
import { LoginSubmit } from "./login-submit";
import { readKeptLoginId } from "./kept-id";
import "./auth-premium.css";
import "./auth-signature.css";

/* Phase 9 (Nov 18, 2026): the notes at the top of the form are the kit's callout (BCallout): red stops you (WarningCircle,
 * the glyph the field errors use too), amber waits (HourglassMedium), green is done (Check), teal informs (Info). A short
 * first sentence is the note's 600 title and the rest is its body, word for word; a one-sentence message (a wrong ID or
 * password) or a long first sentence (the deletion note) is all body text (noteParts, premium pass FD, Nov 18). */
/** The support address in a note's body is the note's one teal link and wraps only after "@" (BEmail), as on the policy
 * pages. The words around it are the message's own. */
function withEmail(text: string | null) {
  const at = text ? text.indexOf(SUPPORT_EMAIL) : -1;
  if (!text || at < 0) return text;
  return <>{text.slice(0, at)}<a href={`mailto:${SUPPORT_EMAIL}`}><BEmail address={SUPPORT_EMAIL} /></a>{text.slice(at + SUPPORT_EMAIL.length)}</>;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; activated?: string; ended?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const [workspaceName, lang] = await Promise.all([getPublicWorkspaceName(), readAuthLang()]);
  const t = AUTH_COPY[lang], mobile=mobileAccessEnabled(), mt=MOBILE_ACCESS_COPY[lang];
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const errorId = params.error ? "login-error" : undefined;
  // Review B4 (Nov 10, 2026, NV-189): a wrong ID or password marks both fields red (it never says which one). Too many
  // attempts is a wait (amber) and a deleting account is not a field problem, so neither marks the fields.
  // A temporary password that was right but couldn't start its replacement ("replace") isn't a field problem either.
  const fieldsInvalid = params.error && params.error !== "busy" && params.error !== "deleting" && params.error !== "replace" ? true : undefined;
  const wait = params.error === "busy";
  // Inspection Nov 14, 2026. PB-006: after an error the Employee ID comes back as typed and only the password is retyped.
  // RA-5: a session that ended says so, calmly (teal, not red), and sign-in returns to the page the person was on.
  const keptId = params.error ? await readKeptLoginId() : null;
  const ended = params.ended === "1" && !params.error && !params.activated;
  const error = params.error ? noteParts(params.error === "deleting" ? t.loginDeleting : params.error === "replace" ? t.loginReplace : wait ? t.loginBusy : t.loginError) : null;
  const activated = params.activated ? noteParts(t.activated) : null;
  const endedNote = ended ? noteParts(returnTo ? t.sessionEndedReturn : t.sessionEnded) : null;
  // Phase 5 (Nov 17, 2026, PB-036): straight from activation the greeting is "Welcome", not "Welcome back".
  const greeting = <div className="q-hd q-auth__hd"><Greeting words={t.greeting} className="" first={Boolean(params.activated)}/><p>{workspaceName ?? t.workspaceUnavailable}</p></div>;
  // Phase 5: what sits under the card (PB-012, PB-009, PB-010). The two links say who each is for; in Spanish one grey
  // line says the app itself is in English for now; the proof rows are the desktop panel's foot only (Nov 17: phones keep field, field, button).
  const under = <>
    <nav className="q-auth__links" aria-label={t.accountHelp}>
      <Link className={mobile ? "ma-desktop" : undefined} href="/forgot-access">{t.forgotAccess}</Link>
      <Link href={`/activate${returnQuery}`}>{t.setUpAccount}</Link>
    </nav>
    {mobile ? <details id="login-id-help" className="ma-details ma-only"><summary>{mt.idHelp}<CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/></summary><p>{mt.idHelpBody}</p></details> : null}
  </>;

  // Quiet (v4, approved Oct 23): the wordmark and Español, the greeting and the workspace, two fields, Sign in, Face ID,
  // then Forgot password? and Activate account on one line. With mobile Access on, phones show the form on a card
  // with Forgot password? under the password field and the other links below the card (approved Oct 27).
  // Mock 7 (review B4, NV-192): with mobile Access on the greeting and the workspace sit on the teal band above the card,
  // as without it; the card holds only the form.
  return (
    <QuietAuthShell lang={lang} t={t}>
      {mobile ? greeting : null}
      <AccessCard mobile={mobile}>
        {mobile ? null : greeting}
        <form action={login} className="q-auth__form" data-invalid={params.error ? "" : undefined}>
          <AuthValidation />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          {/* Direction B (Nov 8, 2026): the error and the activated notice read at the top of the form card. Red stops you,
            * amber means wait, green is done; each note leads with its icon. */}
          {error ? <BCallout tone={wait ? "amber" : "red"} icon={wait ? "wait" : "stop"} id="login-error" role="alert" title={error.title ?? undefined}>{withEmail(error.body)}</BCallout> : null}
          {activated ? <BCallout tone="green" role="status" title={activated.title ?? undefined}>{activated.body}</BCallout> : null}
          {endedNote ? <BCallout tone="teal" role="status" title={endedNote.title ?? undefined}>{endedNote.body}</BCallout> : null}
          <PasswordSignInMarker />
          <div className="q-fl">
            <label htmlFor="login-employee-id">{t.employeeId}</label>
            <AccessEmployeeIdInput id="login-employee-id" className="q-in" name="employeeId" placeholder={t.quiet.idPlaceholder}
              autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby={[errorId, "login-employee-id-invalid", "login-employee-id-help"].filter(Boolean).join(" ")} required
              defaultValue={keptId ?? undefined}
              aria-invalid={fieldsInvalid} data-msg-required={t.invalid.employeeId} />
            <FieldInvalid id="login-employee-id" />
            {/* Phase 5 (PB-012): what the ID is and who to ask, at every width. Phones with mobile Access keep their own
              * "Where do I find my Employee ID?" under the card instead. */}
            <p className={`q-auth__fieldhelp${mobile ? " ma-desktop" : ""}`} id="login-employee-id-help">{t.employeeIdHelp}</p>
          </div>
          <div className="q-fl">
            <label htmlFor="login-password">{t.password}</label>
            <PasswordInput quiet id="login-password" name="password" autoComplete="current-password" enterKeyHint="go"
              aria-describedby={[errorId, "login-password-invalid"].filter(Boolean).join(" ")} required showLabel={t.showPassword}
              aria-invalid={fieldsInvalid} data-msg-required={t.invalid.password} />
            <FieldInvalid id="login-password" />
            {mobile ? <Link className="ma-forgot ma-only" href="/forgot-access">{t.forgotAccess}</Link> : null}
          </div>
          <LoginSubmit idle={t.signIn} busy={t.signingIn} className="q-btn" focusPassword={Boolean(params.error || params.activated)} />
        </form>
        <PasskeySlot t={mobile ? {...t,passkeyPhone:t.passkeyDesktop,passkeyBusyPhone:t.passkeyBusyDesktop,passkeyNotFoundPhone:t.passkeyNotFoundDesktop,passkeyUnavailablePhone:t.passkeyUnavailableDesktop} : t} quiet lang={lang} />
      </AccessCard>
      {mobile ? <AccessOutside mobile>{under}</AccessOutside> : <div className="q-auth__under">{under}</div>}
    </QuietAuthShell>
  );
}

export const generateMetadata=()=>mobileAccessMetadata("signin");
