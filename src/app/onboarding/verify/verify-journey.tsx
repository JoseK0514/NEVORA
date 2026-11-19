"use client";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { AUTH_LANG_COOKIE, type AuthLang } from "@/lib/auth-copy";
import { readableText, validWorkspaceSlug, type WorkspaceCommand, type WorkspacePayload } from "@/lib/onboarding/contracts";
import { normalizePhoneNumber } from "@/lib/phone";
import {
  deriveOperationId, locationKey, readCurrent, readGrant, readOperation, readVerification, signupRequest, signupStep, suggestSlug, takeFragmentProof,
  type OperationOutcome, type ProvisioningStage,
} from "@/lib/onboarding/signup-client";
import type { OnboardingSnapshot } from "@/lib/onboarding/contracts";
import { SIGNUP_COPY, fill } from "@/lib/onboarding/signup-copy";
import { FieldError, NotConfirmed, SignupHeader, SignupNote, SignupSteps, focusTitle } from "@/components/onboarding/signup-ui";

type View =
  | "checking" | "invalid" | "missing" | "unavailable" | "unknown-verify" | "session-ended"
  | "business" | "unknown-create" | "progress" | "review" | "owner" | "ready";

const ZONES = ["America/Puerto_Rico", "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"] as const;
type Zone = typeof ZONES[number];
type Fields = { businessName: string; slug: string; timeZone: Zone; location: string; firstName: string; lastName: string; phone: string; signInId: string };
type FieldName = keyof Fields;
const SIGN_IN_ID = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,126}[A-Za-z0-9])?$/;

function defaultZone(): Zone {
  try { const zone = Intl.DateTimeFormat().resolvedOptions().timeZone; return (ZONES as readonly string[]).includes(zone) ? zone as Zone : "America/Puerto_Rico"; } catch { return "America/Puerto_Rico"; }
}

/** Email verification and the verified signup journey (SCRUM-190) on the signup origin.
 *  1. The email link arrives as `/onboarding/verify?lang=xx#proof=…`. The proof is scrubbed from the address bar before
 *     anything else runs and kept in memory only. `lang` becomes the page language and the saved sign-in language.
 *  2. POST /verification with an operation ID derived from the proof, so the same link always replays the same claim: a
 *     lost response, a reload or a second click recovers the original receipt instead of being refused.
 *  3. With a verified signup cookie, GET /registrations/current says where to continue: the business form, or progress.
 *  4. POST /workspaces creates the workplace; uncertainty replays the identical command; progress polls the operation.
 *  5. At OWNER_ACTIVATION_REQUIRED, POST /bootstrap-grants (one operation ID, repeated until ready) and follow the
 *     company-host link only when it is that workplace's `/onboarding/activate`. */
export function VerifyJourney({ lang, portalBaseDomain }: { lang: AuthLang; portalBaseDomain: string | null }) {
  const t = SIGNUP_COPY[lang], b = t.business, p = t.progress, o = t.owner, v = t.verify;
  const [view, setView] = useState<View>("checking");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<ProvisioningStage | null>(null), [trouble, setTrouble] = useState(false);
  const [notice, setNotice] = useState<{ tone: "red" | "amber" | "teal"; text: string } | null>(null);
  const [fields, setFields] = useState<Fields>(() => ({ businessName: "", slug: "", timeZone: defaultZone(), location: "", firstName: "", lastName: "", phone: "", signInId: "" }));
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const mounted = useRef(true), started = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), failures = useRef(0);
  const verifyBody = useRef<{ schemaVersion: 1; operationId: string; proof: string } | null>(null);
  const version = useRef<string | null>(null), createCommand = useRef<WorkspaceCommand | null>(null), operationId = useRef<string | null>(null);
  const grantBody = useRef<{ schemaVersion: 1; operationId: string } | null>(null), knownSlug = useRef<string | null>(null);
  const unknownRef = useRef<HTMLDivElement | null>(null);
  // A field to focus after the next render (the fieldset is disabled while sending, so focusing earlier is lost).
  const focusAfterRender = useRef<string | null>(null);
  useEffect(() => { if (focusAfterRender.current && !busy) { document.getElementById(focusAfterRender.current)?.focus(); focusAfterRender.current = null; } });

  const host = knownSlug.current && portalBaseDomain ? `${knownSlug.current}.${portalBaseDomain}` : null;
  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const go = (next: View) => { if (!mounted.current) return; viewRef.current = next; setView(next); setBusy(false); focusTitle(); };
  const later = (ms: number, work: () => void) => { clearTimer(); timer.current = setTimeout(() => { timer.current = null; if (mounted.current) work(); }, ms); };

  useEffect(() => () => { mounted.current = false; clearTimer(); }, []);
  const viewRef = useRef<View>("checking");
  useEffect(() => { viewRef.current = view; }, [view]);

  // 1. Scrub, then verify or resume. Runs once; StrictMode's second setup only re-arms `mounted`.
  useEffect(() => {
    mounted.current = true;
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search), chosen = params.get("lang");
    if (chosen === "en" || chosen === "es") {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${AUTH_LANG_COOKIE}=${chosen}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    }
    let taken: { proof: string | null; hadFragment: boolean };
    try { taken = takeFragmentProof(window.location, window.history); window.history.replaceState(null, "", window.location.pathname); }
    catch { window.location.replace("/onboarding/verify"); return; }
    if (taken.proof) {
      const proof = taken.proof;
      void deriveOperationId(proof, "verification").then(id => { verifyBody.current = { schemaVersion: 1, operationId: id, proof }; return verify(); });
    } else if (taken.hadFragment) go("invalid");
    else void resume();
    // eslint-disable-next-line hooks-preserved/exhaustive-deps -- runs once on arrival: the scrub must happen exactly once
  }, []);

  function route(snapshot: OnboardingSnapshot) {
    version.current = snapshot.version;
    if (signupStep(snapshot.registrationState) === "business") go("business");
    else { go("progress"); void poll(); }
  }

  async function verify() {
    if (!verifyBody.current) return;
    setBusy(true);
    const outcome = readVerification(await signupRequest("/api/onboarding/verification", { method: "POST", body: verifyBody.current }));
    if (!mounted.current) return;
    if (outcome.state === "verified") { verifyBody.current = null; route(outcome.snapshot); return; }
    if (outcome.state === "invalid") {
      verifyBody.current = null;
      // A used link with a live signup session (a second click after success) continues instead of stopping.
      const current = readCurrent(await signupRequest("/api/onboarding/registrations/current", { method: "GET" }));
      if (current.state === "ready") route(current.snapshot); else go("invalid");
      return;
    }
    go(outcome.state === "unavailable" ? "unavailable" : "unknown-verify");
  }

  async function resume() {
    setBusy(true);
    const current = readCurrent(await signupRequest("/api/onboarding/registrations/current", { method: "GET" }));
    if (!mounted.current) return;
    if (current.state === "ready") route(current.snapshot);
    else go(current.state === "no_session" ? "missing" : "unavailable");
  }

  function retryUnavailable() { if (verifyBody.current) void verify(); else void resume(); }

  // 4. Progress: poll the durable operation, respecting the server's pollAfterMs.
  async function poll() {
    clearTimer();
    const outcome = readOperation(await signupRequest(`/api/onboarding/operations/${operationId.current ?? "current"}`, { method: "GET" }));
    if (!mounted.current) return;
    applyProgress(outcome);
  }
  function applyProgress(outcome: OperationOutcome) {
    if (outcome.state === "pending") {
      failures.current = 0; setTrouble(false); operationId.current = outcome.operationId; setStage(outcome.stage);
      if (outcome.stage === "OWNER_ACTIVATION_REQUIRED") { if (viewRef.current !== "owner") go("owner"); return; }
      if (outcome.stage === "ACTIVATED") { go("ready"); return; }
      if (viewRef.current !== "progress") go("progress");
      later(outcome.pollAfterMs, () => void poll());
      return;
    }
    if (outcome.state === "no_session") { go("session-ended"); return; }
    if (outcome.state === "unavailable" && ["RESOURCE_REVIEW_REQUIRED", "PROVISIONING_SOURCE_CHANGED"].includes(outcome.reasonCode)) { go("review"); return; }
    // Unknown, lost or a temporary failure: keep checking with backoff; nothing is created by a read.
    failures.current += 1; setTrouble(failures.current >= 3);
    later(Math.min(30000, 1000 * 2 ** Math.min(failures.current, 5)), () => void poll());
  }

  function set<K extends FieldName>(name: K, value: Fields[K]) {
    setFields(f => {
      const next = { ...f, [name]: value };
      if (name === "businessName" && !slugTouched) next.slug = suggestSlug(String(value));
      return next;
    });
    if (errors[name]) setErrors(e => ({ ...e, [name]: undefined }));
  }

  function validate(f: Fields): { payload: WorkspacePayload | null; errors: Partial<Record<FieldName, string>> } {
    const e: Partial<Record<FieldName, string>> = {};
    const name = f.businessName.trim(), location = f.location.trim(), first = f.firstName.trim(), last = f.lastName.trim(), id = f.signInId.trim().toUpperCase();
    if (!readableText(name, 160)) e.businessName = b.nameInvalid;
    if (!validWorkspaceSlug(f.slug)) e.slug = b.addressInvalid;
    if (!readableText(location, 160)) e.location = b.locationInvalid;
    if (!readableText(first, 160)) e.firstName = b.nameRequired;
    if (!readableText(last, 160)) e.lastName = b.nameRequired;
    const phone = normalizePhoneNumber(f.phone);
    if (!phone) e.phone = b.phoneInvalid;
    if (!SIGN_IN_ID.test(id)) e.signInId = b.signInIdInvalid;
    if (Object.keys(e).length) return { payload: null, errors: e };
    return { errors: e, payload: { businessName: name, timeZone: f.timeZone, requestedSlug: f.slug, initialLocation: { name: location, shortName: [...location].slice(0, 48).join("").trim(), key: locationKey(location) }, ownerProfile: { id, firstName: first, lastName: last, phone: phone! } } };
  }

  async function sendCreate(fromUnknown: boolean) {
    if (!createCommand.current || busy) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setNotice({ tone: "amber", text: t.offline }); return; }
    setBusy(true); setNotice(null);
    const outcome = readOperation(await signupRequest("/api/onboarding/workspaces", { method: "POST", body: createCommand.current }));
    if (!mounted.current) return;
    setBusy(false);
    if (outcome.state === "pending") { knownSlug.current = createCommand.current.payload.requestedSlug; createCommand.current = null; go("progress"); applyProgress(outcome); return; }
    if (outcome.state === "unknown") { if (!fromUnknown) { setView("unknown-create"); requestAnimationFrame(() => unknownRef.current?.focus()); } return; }
    if (outcome.state === "no_session") { go("session-ended"); return; }
    createCommand.current = null;
    if (fromUnknown) setView("business");
    if (outcome.state === "conflict" && outcome.reason === "slug_unavailable") { setErrors(e => ({ ...e, slug: b.addressTaken })); setSlugTouched(true); focusAfterRender.current = "su-slug"; return; }
    if (outcome.state === "conflict") {
      const current = readCurrent(await signupRequest("/api/onboarding/registrations/current", { method: "GET" }));
      if (!mounted.current) return;
      if (current.state === "ready") { version.current = current.snapshot.version; if (signupStep(current.snapshot.registrationState) === "progress") { go("progress"); void poll(); return; } }
      setNotice({ tone: "amber", text: b.versionChanged }); return;
    }
    if (outcome.state === "invalid") { setNotice({ tone: "red", text: outcome.fieldErrors.some(e => e.code === "CURRENT_POLICY_ACCEPTANCE_REQUIRED") ? b.policyRequired : b.fix }); return; }
    if (outcome.state === "limited") { setNotice({ tone: "amber", text: b.limited }); return; }
    if (outcome.state === "unavailable") {
      if (outcome.reasonCode === "BUSINESS_ALREADY_RESERVED") { go("progress"); void poll(); return; }
      if (outcome.reasonCode === "ACCESS_DENIED") { go("session-ended"); return; }
      setNotice({ tone: "red", text: outcome.reasonCode === "PROVISIONING_DISABLED" ? b.disabled : outcome.reasonCode === "PROVISIONING_CAPACITY" ? b.capacity : b.unavailable });
    }
  }

  function submitBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validate(fields);
    setErrors(checked.errors); setNotice(null);
    if (!checked.payload || !version.current) {
      const first = (["businessName", "slug", "location", "firstName", "lastName", "phone", "signInId"] as FieldName[]).find(name => checked.errors[name]);
      if (first) { focusAfterRender.current = `su-${first === "businessName" ? "name" : first === "signInId" ? "id" : first}`; setErrors({ ...checked.errors }); }
      return;
    }
    const same = createCommand.current && JSON.stringify(createCommand.current.payload) === JSON.stringify(checked.payload) && createCommand.current.expectedVersion === version.current;
    if (!same) createCommand.current = { schemaVersion: 1, operationId: crypto.randomUUID(), expectedVersion: version.current, payload: checked.payload };
    void sendCreate(false);
  }

  // 5. The single-use Owner link. One operation ID is repeated until the grant is ready; a refused or expired grant is
  // retired, and the next Continue asks for a new one.
  async function grant() {
    if (busy && !grantBody.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setNotice({ tone: "amber", text: t.offline }); return; }
    grantBody.current ??= { schemaVersion: 1, operationId: crypto.randomUUID() };
    setBusy(true); setNotice(null);
    const outcome = readGrant(await signupRequest("/api/onboarding/bootstrap-grants", { method: "POST", body: grantBody.current }), portalBaseDomain);
    if (!mounted.current) return;
    if (outcome.state === "ready") { window.location.assign(outcome.url); return; }
    if (outcome.state === "pending") { later(outcome.pollAfterMs, () => void grant()); return; }
    if (outcome.state === "unknown") { later(2000, () => void grant()); return; }
    setBusy(false);
    if (outcome.state === "no_session") { go("session-ended"); return; }
    grantBody.current = null;
    if (outcome.state === "invalid") setNotice({ tone: "amber", text: o.expired });
    else if (outcome.state === "limited") setNotice({ tone: "amber", text: o.limited });
    else { setNotice({ tone: "red", text: o.unavailable }); void poll(); }
  }

  const noteView = notice ? <SignupNote tone={notice.tone}>{notice.text}</SignupNote> : null;
  const requestNew = <nav className="q-auth__links" aria-label={v.requestNew}><a href="/onboarding">{v.requestNew}</a></nav>;

  if (view === "checking") return <SignupHeader title={v.checkingTitle} sub={<><span className="su-wait" aria-hidden="true" />{v.checkingBody}</>} live />;
  if (view === "invalid") return <><SignupHeader title={v.invalidTitle} sub={v.invalidBody} /><div className="q-card q-auth__card su-card"><a className="q-btn" href="/onboarding">{v.requestNew}</a></div></>;
  if (view === "missing") return <><SignupHeader title={v.missingTitle} sub={v.missingBody} /><div className="q-card q-auth__card su-card"><a className="q-btn" href="/onboarding">{v.startSignup}</a></div></>;
  if (view === "session-ended") return <><SignupHeader title={v.missingTitle} sub={v.sessionEnded} /><div className="q-card q-auth__card su-card"><a className="q-btn" href="/onboarding">{v.requestNew}</a></div></>;
  if (view === "unavailable") return <><SignupHeader title={v.checkingTitle} /><div className="q-card q-auth__card su-card"><SignupNote tone="red">{v.unavailable}</SignupNote><button type="button" className="q-btn" onClick={retryUnavailable} disabled={busy}>{v.tryAgain}</button></div>{requestNew}</>;
  if (view === "unknown-verify") return <><SignupHeader title={t.unknown.title} /><NotConfirmed copy={t.unknown} busy={busy} onCheck={() => void verify()} focusRef={unknownRef} />{requestNew}</>;
  if (view === "unknown-create") return <><SignupHeader title={t.unknown.title} /><NotConfirmed copy={t.unknown} busy={busy} onCheck={() => void sendCreate(true)} focusRef={unknownRef} /></>;
  if (view === "review") return <><SignupHeader title={p.reviewTitle} sub={fill(p.reviewBody, { support: t.support })} /></>;
  if (view === "ready") return <>
    <SignupHeader done title={o.readyTitle} sub={o.readyBody} />
    {host ? <div className="q-card q-auth__card su-card"><SignupSteps current={3} c={p} /><a className="q-btn" href={`https://${host}/login`}>{fill(o.readyLink, { host })}</a></div> : <div className="q-card q-auth__card su-card"><SignupSteps current={3} c={p} /></div>}
  </>;
  if (view === "owner") return <>
    <SignupHeader title={o.title} sub={host ? fill(o.body, { host }) : o.bodyNoHost} />
    <div className="q-card q-auth__card su-card">
      <SignupSteps current={2} c={p} />
      {noteView}
      <button type="button" className="q-btn" onClick={() => void grant()} disabled={busy} aria-busy={busy || undefined}>{busy ? o.preparing : o.continue}</button>
    </div>
  </>;
  if (view === "progress") return <>
    <SignupHeader title={p.title} sub={<><span className="su-wait" aria-hidden="true" />{p.body}</>} live />
    <div className="q-card q-auth__card su-card" aria-busy="true">
      <SignupSteps current={1} c={p} />
      {stage === "RECONCILING_RESOURCE" ? <SignupNote tone="teal" icon="wait">{p.reconciling}</SignupNote> : null}
      {trouble ? <SignupNote tone="amber" icon="offline">{p.unavailable}</SignupNote> : null}
    </div>
  </>;

  // view === "business"
  const field = (name: FieldName, id: string, label: string, input: ReactNode, help?: string) => <div className="q-fl" data-invalid={errors[name] ? "true" : undefined}>
    <label htmlFor={id}>{label}</label>{input}
    {errors[name] ? <FieldError id={`${id}-error`}>{errors[name]}</FieldError> : help ? <p className="q-help" id={`${id}-help`}>{help}</p> : null}
  </div>;
  const describe = (name: FieldName, id: string, help?: boolean) => errors[name] ? `${id}-error` : help ? `${id}-help` : undefined;
  const text = (name: Exclude<FieldName, "timeZone">, id: string, extra: InputHTMLAttributes<HTMLInputElement>, help?: boolean) =>
    <input id={id} className="q-in" value={fields[name]} onChange={event => { if (name === "slug") setSlugTouched(true); set(name, (name === "slug" ? event.target.value.toLowerCase() : event.target.value) as Fields[typeof name]); }}
      aria-invalid={errors[name] ? true : undefined} aria-describedby={describe(name, id, help)} required {...extra} />;
  const previewHost = portalBaseDomain ? `${fields.slug || b.addressExample}.${portalBaseDomain}` : fields.slug || b.addressExample;
  return <>
    <SignupHeader title={b.title} sub={b.sub} />
    <form className="q-auth__form su-form" onSubmit={submitBusiness} noValidate aria-busy={busy || undefined}>
      <SignupSteps current={1} c={p} />
      {noteView}
      <fieldset className="q-auth__fields" disabled={busy}>
        {field("businessName", "su-name", b.name, text("businessName", "su-name", { autoComplete: "organization", maxLength: 160 }))}
        {field("slug", "su-slug", b.address, text("slug", "su-slug", { autoComplete: "off", autoCapitalize: "none", spellCheck: false, maxLength: 63, inputMode: "url" }, true), fill(b.addressHelp, { host: previewHost }))}
        {field("timeZone", "su-zone", b.timeZone, <select id="su-zone" className="q-in" value={fields.timeZone} onChange={event => set("timeZone", event.target.value as Zone)}>
          {ZONES.map(zone => <option key={zone} value={zone}>{b.zones[zone]}</option>)}
        </select>)}
        {field("location", "su-location", b.location, text("location", "su-location", { autoComplete: "off", maxLength: 160 }, true), b.locationHelp)}
        <fieldset className="su-group">
          <legend>{b.you}</legend>
          <div className="su-pair">
            {field("firstName", "su-firstName", b.firstName, text("firstName", "su-firstName", { autoComplete: "given-name", maxLength: 160 }))}
            {field("lastName", "su-lastName", b.lastName, text("lastName", "su-lastName", { autoComplete: "family-name", maxLength: 160 }))}
          </div>
          {field("phone", "su-phone", b.phone, text("phone", "su-phone", { autoComplete: "tel", inputMode: "tel", type: "tel", maxLength: 32 }))}
          {field("signInId", "su-id", b.signInId, text("signInId", "su-id", { autoComplete: "username", autoCapitalize: "characters", spellCheck: false, maxLength: 128, className: "q-in su-id" }, true), b.signInIdHelp)}
        </fieldset>
      </fieldset>
      <button type="submit" className="q-btn" disabled={busy} aria-busy={busy || undefined}>{busy ? b.submitting : b.submit}</button>
    </form>
  </>;
}
