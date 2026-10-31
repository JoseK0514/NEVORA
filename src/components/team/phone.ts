import { normalizePhoneNumber } from "@/lib/phone";

/** A ten-digit phone as the boards show it: "(787) 555-0142". Anything else is shown as stored. */
export function phoneDisplay(value: string | null | undefined) {
  if (!value) return "";
  const normal = normalizePhoneNumber(value);
  if (!normal) return value;
  const [area, prefix, line] = normal.split("-");
  return `(${area}) ${prefix}-${line}`;
}

/** Formats a phone while it's typed: "(787) 555-0142". The saved value is normalized by the form's command. */
export function phoneTyping(value: string) {
  const raw = value.replace(/\D/g, "");
  const digits = raw.length === 11 && raw.startsWith("1") ? raw.slice(1) : raw.slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
