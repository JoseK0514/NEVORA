import type { PortalLang } from "@/lib/i18n/portal-lang";

export function DeclineNote({ note, lang }: { note?: string; lang: PortalLang }) {
  if (!note) return null;
  return <span className="tod-decline-note"><strong>{lang === "es" ? "Motivo del rechazo" : "Reason for declining"}</strong>{note}</span>;
}
