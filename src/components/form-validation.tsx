"use client";

import { useEffect, type ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { usePortalLang, type PortalLang } from "@/lib/i18n/portal-lang";
import { VALIDATION_WORDS } from "./shell-copy";

/** The person's language for the messages built in the listeners below (set by FormValidation, which the shell renders once). */
let validationLang: PortalLang = "en";

/** Inline validation for every portal form, built on native constraints
 * (required, pattern, min/max, type). Errors appear under the field once the
 * person leaves it or submits, clear as soon as the value becomes valid, and
 * replace the browser's floating bubble so focus lands on the first problem.
 * Server validation remains authoritative; this only reports what the form
 * already declares. */
type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const SKIP = new Set(["hidden", "submit", "button", "reset", "image"]);

function isField(target: EventTarget | null): target is Field {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return false;
  if (target instanceof HTMLInputElement && SKIP.has(target.type)) return false;
  const form = target.form;
  return !!form && !form.noValidate && !!target.closest(".page-frame");
}

/** The label's own words, without nested hints, fields or earlier errors. */
function labelText(field: Field) {
  if (field.dataset.labelText !== undefined) return field.dataset.labelText;
  const label = field.labels?.[0];
  let text = field.getAttribute("aria-label") ?? "";
  if (label) {
    const copy = label.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("input, select, textarea, small, p, .field-error, [aria-hidden='true'], [id$='hint'], [class*='hint']").forEach(node => node.remove());
    text = copy.textContent ?? "";
  }
  // Sentence case for the message, keeping acronyms such as ID and PIN.
  const clean = text.replace(/\s+/g, " ").replace(/\s*\*?\s*\(?(required|optional)\)?\s*$/i, "").trim()
    .split(" ").map(word => /^[A-Z]{2,}$/.test(word) ? word : word.toLowerCase()).join(" ");
  field.dataset.labelText = clean;
  return clean;
}

function message(field: Field) {
  const v = field.validity, label = labelText(field), V = VALIDATION_WORDS[validationLang];
  if (v.valueMissing) {
    // Review Nov 11 (OW-023): a field may say its own sentence ("Enter a first name"): the label alone cannot give the
    // article. Fields without one keep the sentence built from their label.
    if (field.dataset.missing) return field.dataset.missing;
    if (field instanceof HTMLSelectElement) return label ? V.choose(label) : V.chooseOption;
    if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) return V.selectToContinue;
    return label ? V.enter(label) : V.fillIn;
  }
  if (v.typeMismatch && field instanceof HTMLInputElement && field.type === "email") return V.email;
  if (v.tooShort && "minLength" in field) return V.atLeast(field.minLength);
  // Review 30 (D03): a field may word its own floor ("Enter a date in 1900 or later"); a date's raw minimum reads as
  // "Use 1900-01-01 or more" while the field shows mm/dd/yyyy.
  if (v.rangeUnderflow && field.dataset.underflow) return field.dataset.underflow;
  if (v.rangeUnderflow && field instanceof HTMLInputElement) return V.orMore(field.min);
  if (v.rangeOverflow && field instanceof HTMLInputElement) return V.orLess(field.max);
  if (v.patternMismatch && field.title) return field.title;
  return field.validationMessage;
}

function errorId(field: Field) {
  if (!field.dataset.errorId) field.dataset.errorId = `${field.id || field.name || "field"}-error-${Math.random().toString(36).slice(2, 7)}`;
  return field.dataset.errorId;
}

/** The field's aria-describedby with the message's id in it exactly once, whatever the attribute holds now. */
export function describedByWith(current: string | null, id: string) {
  const tokens = (current ?? "").split(/\s+/).filter(Boolean);
  return (tokens.includes(id) ? tokens : [...tokens, id]).join(" ");
}

/** `announce` is false on submit: focus then moves to the first problem and its description (this message) is read, so an
 * alert as well would say it twice. */
function show(field: Field, announce = true) {
  const id = errorId(field);
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("p");
    node.id = id; node.className = "field-error";
    field.insertAdjacentElement("afterend", node);
  }
  // Nov 14 inspection (RA-9): the link from the field to its message is re-asserted every time the message shows (it was
  // set only when the message was first created, so a re-render that reset aria-describedby left the field unlinked).
  const describedBy = describedByWith(field.getAttribute("aria-describedby"), id);
  if (field.getAttribute("aria-describedby") !== describedBy) field.setAttribute("aria-describedby", describedBy);
  // …and a message that appears when the person leaves the field, or changes while they type, is announced (role="alert").
  if (announce) node.setAttribute("role", "alert"); else node.removeAttribute("role");
  // Review F2 (NV-112): every message leads with the 16px bold warning glyph (Phosphor WarningCircle), so an error never
  // relies on its red colour alone. Final verification F (F08): the glyph has its own column and the words theirs, so a
  // second line starts under the words, not under the glyph; the words are 500 (spec 3.3) and the glyph and the gap are
  // in em, so they grow with the text. Written on the elements: the stylesheets of every era style the paragraph only.
  const text = message(field);
  if (node.textContent !== text || !node.querySelector("svg")) {
    node.replaceChildren(errorLine(text));
  }
  field.setAttribute("aria-invalid", "true");
}

/** The message's one line: the glyph, then the words, in a row that the paragraph's own look (display, font, colour)
 * cannot undo. A form that renders its own message uses FieldErrorLine, the same line in React. */
function errorLine(text: string) {
  const row = document.createElement("span");
  row.className = "field-error__row";
  row.setAttribute("style", ERROR_ROW_STYLE);
  const words = document.createElement("span");
  words.className = "field-error__text";
  words.setAttribute("style", ERROR_TEXT_STYLE);
  words.textContent = text;
  row.append(warningGlyph(), words);
  return row;
}

/** The field error's row, glyph and words (F08), shared with forms that render the message themselves (FieldErrorLine). */
const ERROR_ROW = { display: "flex", alignItems: "flex-start", gap: ".4em" } as const;
const ERROR_TEXT = { minWidth: 0, fontWeight: 500, textWrap: "pretty" } as const;
const ERROR_GLYPH = { display: "block", flex: "none", width: "1.1875em", height: "1.1875em", marginTop: "calc((1lh - 1.1875em) / 2)" } as const;
const cssText = (style: Record<string, string | number>) => Object.entries(style).map(([key, value]) => `${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}:${value}`).join(";");
const ERROR_ROW_STYLE = cssText(ERROR_ROW), ERROR_TEXT_STYLE = cssText(ERROR_TEXT), ERROR_GLYPH_STYLE = cssText(ERROR_GLYPH);

/** The same message line for a form that renders its own `p.field-error` (Shift matching): the glyph, then the words. */
export function FieldErrorLine({ children }: { children: ReactNode }) {
  return <span className="field-error__row" style={ERROR_ROW}>
    <WarningCircleIcon size={16} weight="bold" aria-hidden="true" focusable="false" style={ERROR_GLYPH} />
    <span className="field-error__text" style={ERROR_TEXT}>{children}</span>
  </span>;
}

const SVG = "http://www.w3.org/2000/svg";
function warningGlyph() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 256 256"); svg.setAttribute("width", "16"); svg.setAttribute("height", "16");
  svg.setAttribute("fill", "currentColor"); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
  svg.setAttribute("style", ERROR_GLYPH_STYLE);
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", "M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm-12-80V80a12,12,0,0,1,24,0v52a12,12,0,0,1-24,0Zm28,40a16,16,0,1,1-16-16A16,16,0,0,1,144,172Z");
  svg.append(path);
  return svg;
}

function clear(field: Field) {
  const id = field.dataset.errorId;
  if (!id) return;
  document.getElementById(id)?.remove();
  const rest = (field.getAttribute("aria-describedby") ?? "").split(" ").filter(token => token && token !== id).join(" ");
  if (rest) field.setAttribute("aria-describedby", rest); else field.removeAttribute("aria-describedby");
  field.removeAttribute("aria-invalid");
  delete field.dataset.errorId;
}

/** Final verification F (F13): focus lands on a field whose message is under it; when the field or its message is outside
 * the window (or under the phone's tab bar), the field is brought to the middle of the window so both are read. */
export function revealField(field: HTMLElement) {
  const message = field.dataset.errorId ? document.getElementById(field.dataset.errorId) : null;
  const top = field.getBoundingClientRect().top, bottom = (message ?? field).getBoundingClientRect().bottom;
  const height = window.visualViewport?.height ?? window.innerHeight;
  if (top < 64 || bottom > height - 72) field.scrollIntoView({ block: "center" });
}

export function FormValidation() {
  const lang = usePortalLang();
  useEffect(() => { validationLang = lang; }, [lang]);
  useEffect(() => {
    let firstInvalid: Field | null = null;
    // Final verification F (F06): a message shown while a pointer is pressed (leaving a field by pressing Next) pushed the
    // button down under the pointer, so the press never became a click and Next did nothing. While a pointer is down the
    // message waits; when the press ends (its click has run, so Next's own check has already said it), it shows.
    let pressed = false, waiting: Field[] = [], safety: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      pressed = false; clearTimeout(safety);
      const fields = waiting; waiting = [];
      for (const field of fields) {
        if (!field.isConnected || !isField(field) || field === document.activeElement) continue;
        if (field.validity.valid) clear(field); else if (!field.dataset.errorId) show(field);
      }
    };
    const onPointerDown = () => { pressed = true; clearTimeout(safety); safety = setTimeout(flush, 1500); };
    const onPressEnd = () => { if (pressed) setTimeout(flush, 0); };
    const onBlur = (event: FocusEvent) => {
      const field = event.target;
      if (!isField(field)) return;
      // A checkbox or radio always has a value, so "untouched" can't be read from it: it's checked on change and submit only.
      if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio") && !field.dataset.errorId) return;
      if (!field.value && !field.dataset.errorId && field.validity.valueMissing) return; // don't nag an untouched empty field
      if (pressed && !field.validity.valid && !field.dataset.errorId) { if (!waiting.includes(field)) waiting.push(field); return; }
      // validity.valid, not checkValidity(): checkValidity() fires "invalid", which moved focus back into the field (Wave C focus trap).
      if (field.validity.valid) clear(field); else show(field);
    };
    const onInput = (event: Event) => {
      const field = event.target;
      if (isField(field) && field.dataset.errorId && field.validity.valid) clear(field);
      else if (isField(field) && field.dataset.errorId) show(field);
    };
    const onInvalid = (event: Event) => {
      const field = event.target;
      if (!isField(field)) return;
      event.preventDefault(); // replace the floating bubble with the inline message
      show(field, false);
      if (!firstInvalid) {
        firstInvalid = field;
        // After every invalid event of this submission has fired (microtasks
        // would run between them), focus the first problem in document order.
        setTimeout(() => {
          const field = firstInvalid; firstInvalid = null;
          if (!field) return;
          field.focus({ preventScroll: true });
          revealField(field);
        }, 0);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onPressEnd, true);
    document.addEventListener("pointercancel", onPressEnd, true);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onInput);
    document.addEventListener("invalid", onInvalid, true);
    return () => {
      clearTimeout(safety);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("click", onPressEnd, true);
      document.removeEventListener("pointercancel", onPressEnd, true);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("input", onInput);
      document.removeEventListener("change", onInput);
      document.removeEventListener("invalid", onInvalid, true);
    };
  }, []);
  return null;
}
