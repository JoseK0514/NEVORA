"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { UserIcon } from "@phosphor-icons/react/dist/ssr/User";
import { HandshakeIcon } from "@phosphor-icons/react/dist/ssr/Handshake";
import { TimerIcon } from "@phosphor-icons/react/dist/ssr/Timer";
import { CopySimpleIcon } from "@phosphor-icons/react/dist/ssr/CopySimple";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { keepWhole } from "@/lib/keep-whole";
import { durationSentence } from "@/lib/duration-format";
import type { AuthLang } from "@/lib/auth-copy";
import { ACCESS_COPY, fill } from "./copy";
import { encodeQr, qrPath } from "./qr";
import "./access-recovery.css";
import { formatWithZone } from "@/lib/time-zone-label";

/** The largest QR version drawn in the 220px card: above it the modules are too small to scan from a screen. */
const QR_MAX_VERSION = 15;
const QUIET = 4;

/** The reset page with the one-time code in the URL fragment, exactly the form /reset-access already accepts. A fragment
 * is never sent to a server. Built in the browser, only when it is drawn or copied; never logged or stored. */
function resetLink(proof: string): string {
  return `${window.location.origin}/reset-access#proof=${proof}`;
}

/** Phase 5 (Nov 17, 2026, PB-008): the helper's receipt of "Help someone sign in". The one-time code is handed over as a
 * QR code the other person scans with their own phone, or as a link the helper copies; the raw code stays behind
 * "Show code". The receipt says until when it works, how long is left, and what each person does.
 *
 * Custody of the code: it lives in AccountRecovery's state, as before. Here it is drawn as an inline SVG made in the
 * browser (no image request, no network), put on the clipboard only when the helper presses a copy button, and shown as
 * text only while "Show code" is open. This component is mounted only while a code is issued, so when AccountRecovery
 * clears it (leaving the page, the window losing focus, the tab hidden, going offline, expiry, or "Make another link")
 * the SVG, the field and this component's state all leave the DOM together. */
export function AssistedReceipt({ issued, timeZone, lang = "en", feedback, onStartAgain }: {
  issued: { proof: string; expiresAt: string; employeeId: string };
  timeZone?: string;
  lang?: AuthLang;
  feedback: RefObject<HTMLDivElement | null>;
  onStartAgain: () => void;
}) {
  const u = ACCESS_COPY[lang].assisted;
  const [copied, setCopied] = useState<"link" | "linkFailed" | "code" | "codeFailed" | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const code = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0), timer = setInterval(tick, 5000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);
  const until = keepWhole(formatWithZone(lang === "es" ? "es-PR" : "en-US", { hour: "numeric", minute: "2-digit" }, new Date(issued.expiresAt), timeZone));
  // Drawn after hydration only: the link needs this browser's own address.
  const mounted = now !== null;
  const qr = useMemo(() => (mounted ? encodeQr(resetLink(issued.proof), QR_MAX_VERSION) : undefined), [issued.proof, mounted]);
  const minutes = now === null ? null : Math.max(0, Math.floor((Date.parse(issued.expiresAt) - now) / 60000));
  const left = minutes === null ? "" : minutes < 1 ? u.leftLast : fill(u.left, { n: durationSentence(minutes) });
  const write = (text: string, ok: "link" | "code", failed: "linkFailed" | "codeFailed") => {
    const done = navigator.clipboard?.writeText(text);
    if (done) done.then(() => setCopied(ok), () => setCopied(failed)); else setCopied(failed);
  };
  const status = copied === "link" ? fill(u.linkCopied, { time: until }) : copied === "linkFailed" ? u.linkCopyFailed : copied === "code" ? u.copied : copied === "codeFailed" ? u.copyFailed : "";
  const size = qr ? qr.size + QUIET * 2 : 0;
  return <section className="ar-issued b-card" aria-labelledby="assisted-receipt-title">
    <div ref={feedback} tabIndex={-1} role="status" aria-labelledby="assisted-receipt-title" className="q-lead">
      <b id="assisted-receipt-title">{u.readyTitle}</b>
      <i>{`${fill(u.readyFor, { id: issued.employeeId })} `}<time dateTime={issued.expiresAt}>{until}</time></i>
    </div>
    <div className="ar-share">
      <div className="ar-qr" data-empty={qr ? undefined : ""}>
        {qr ? <svg role="img" aria-label={fill(u.qrLabel, { id: issued.employeeId })} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges"><path d={qrPath(qr, QUIET)} /></svg>
          : qr === null ? <p>{u.qrTooLong}</p> : null}
      </div>
      <div className="ar-share__side">
        {qr === null ? null : <p className="ar-share__scan">{fill(u.scan, { time: until })}</p>}
        <p className="ar-share__left"><TimerIcon size={16} weight="bold" aria-hidden="true" /><span>{left}</span></p>
        <div className="ar-codeacts">
          <button type="button" className="b-btn b-btn--teal" onClick={() => write(resetLink(issued.proof), "link", "linkFailed")}>
            {copied === "link" ? <CheckIcon size={16} weight="bold" aria-hidden="true" /> : <CopySimpleIcon size={16} weight="bold" aria-hidden="true" />}<span>{u.copyLink}</span></button>
          <button type="button" className="ar-showcode" aria-expanded={showCode} aria-controls="assisted-code" onClick={() => setShowCode(!showCode)}>
            <span>{showCode ? u.hideCode : u.showCode}</span><CaretDownIcon size={16} weight="bold" aria-hidden="true" /></button>
        </div>
        <p className="ar-codeacts__status" role="status" aria-live="polite">{status}</p>
      </div>
    </div>
    <div id="assisted-code" className="ar-code" hidden={!showCode}>
      {showCode ? <div className="q-fl">
        <label className="q-fl__label" htmlFor="assisted-proof">{u.codeLabel}</label>
        <div className="q-in__wrap ar-code__wrap"><input ref={code} id="assisted-proof" className="q-in" readOnly value={issued.proof} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} aria-describedby="assisted-code-help" />
          <button type="button" className="q-bs ar-code__select" onClick={() => { code.current?.focus(); code.current?.select(); }}>{u.select}</button></div>
        <div className="ar-codeacts">
          <button type="button" className="b-btn b-btn--ghost" onClick={() => write(issued.proof, "code", "codeFailed")}>
            {copied === "code" ? <CheckIcon size={16} weight="bold" aria-hidden="true" /> : <CopySimpleIcon size={16} weight="bold" aria-hidden="true" />}<span>{u.copy}</span></button>
        </div>
        <p className="q-help" id="assisted-code-help">{u.codeHelp}</p>
      </div> : null}
    </div>
    <section className="ar-handover" aria-labelledby="assisted-handover-title">
      <h2 className="ar-handover__label" id="assisted-handover-title">{u.handoverLabel}</h2>
      <ul className="ar-handover__rows" id="assisted-proof-hint">
        <li><span className="ar-handover__ico" aria-hidden="true"><HandshakeIcon size={18} weight="bold" /></span><span className="ar-handover__main"><b>{u.you}</b><span>{fill(u.youDo, { id: issued.employeeId })}</span></span></li>
        <li><span className="ar-handover__ico" aria-hidden="true"><UserIcon size={18} weight="bold" /></span><span className="ar-handover__main"><b>{u.they}</b><span>{u.theyDo}</span>
          <Link className="ar-handover__link" href="/reset-access">{u.seePage}</Link></span></li>
        <li><span className="ar-handover__ico" aria-hidden="true"><TimerIcon size={18} weight="bold" /></span><span className="ar-handover__main"><b>{u.time}</b><span>{fill(u.timeDo, { time: until })}</span></span></li>
      </ul>
      <p className="ar-handover__after">{u.after}</p>
    </section>
    <button className="q-btn q-btn--sec" type="button" onClick={onStartAgain}>{u.another}</button>
    <p className="q-help">{u.anotherNote}</p>
  </section>;
}
