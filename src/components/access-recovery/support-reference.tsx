"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopySimpleIcon } from "@phosphor-icons/react/dist/ssr/CopySimple";
import type { AuthLang } from "@/lib/auth-copy";
import { ACCESS_COPY } from "./copy";
import { shown } from "./support-reference-seam";
import "./access-recovery.css";

/** "Support reference" (contract B10): the label, the reference in a monospaced tabular face, and Copy with a
 * confirmation that is also announced. Renders nothing without a valid reference. The caller passes the reference of
 * the one failed response the surrounding message is about; a new attempt passes a new value (or null), and the copied
 * mark never carries over to it. It is a diagnostic handle only: never shown as proof that anything was saved. */
export function SupportReference({ reference, lang = "en", id = "support-reference" }: { reference: string | null | undefined; lang?: AuthLang; id?: string }) {
  const t = ACCESS_COPY[lang].supportRef;
  const value = shown(reference);
  const [copied, setCopied] = useState<{ of: string; ok: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  if (!value) return null;
  const state = copied && copied.of === value ? copied : null;
  async function copy(text: string) {
    let ok = true;
    try { await navigator.clipboard.writeText(text); } catch { ok = false; }
    setCopied({ of: text, ok });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 4000);
  }
  return <div className="ar-ref" role="group" aria-labelledby={`${id}-label`}>
    <span className="ar-ref__label" id={`${id}-label`}>{t.label}</span>
    <code className="ar-ref__value" id={`${id}-value`} tabIndex={0} aria-describedby={`${id}-hint`}>{value}</code>
    <button type="button" className="ar-ref__copy" onClick={() => void copy(value)} aria-describedby={`${id}-value`}>
      {state?.ok ? <CheckIcon size={16} weight="bold" aria-hidden="true" /> : <CopySimpleIcon size={16} weight="bold" aria-hidden="true" />}
      <span>{state?.ok ? t.copied : t.copy}</span>
    </button>
    <p className="ar-ref__hint" id={`${id}-hint`}>{t.hint}</p>
    <span className="ar-sr" role="status" aria-live="polite">{state ? (state.ok ? t.copiedStatus : t.failed) : ""}</span>
  </div>;
}
