import type { FocusEvent, FormEvent, KeyboardEvent } from 'react';

/* Payroll forms on a phone keyboard (Owner premium P9, P10). Client-only behaviour: no field, name, rule or request
 * changes. Return moves to the next field and never sends a form; the last field's Return closes the keyboard. A send
 * that finds problems marks every one of them at once and names them in one message, instead of the browser's bubble
 * on the first field only. */

const TYPING = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]), select, textarea';

const usable = (field: HTMLElement) => !(field as HTMLInputElement).disabled && !(field as HTMLInputElement).readOnly && field.getClientRects().length > 0;
function typingFields(form: HTMLElement) {
  return [...form.querySelectorAll<HTMLElement>(TYPING)].filter(usable);
}

/** The next field's Return label: "next" until the last field, then "done". Search fields keep "search". */
export function hintOnFocus(event: FocusEvent<HTMLElement>) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
  if (field instanceof HTMLInputElement && field.type === 'search') { field.enterKeyHint = 'search'; return; }
  // A multi-line field keeps Return for a new line.
  if (field instanceof HTMLTextAreaElement) return;
  const fields = typingFields(event.currentTarget);
  field.enterKeyHint = fields.indexOf(field) === fields.length - 1 ? 'done' : 'next';
}

/** Return on a one-line field moves to the next field (or closes the keyboard on the last one). */
export function nextOnEnter(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
  const field = event.target;
  if (!(field instanceof HTMLInputElement) || !field.matches(TYPING) || field.type === 'search') return;
  event.preventDefault();
  const fields = typingFields(event.currentTarget);
  const next = fields[fields.indexOf(field) + 1];
  if (next) next.focus();
  else field.blur();
}

/** A field the person corrected stops showing as a problem. */
export function clearInvalid(event: FormEvent<HTMLFormElement>) {
  const field = event.target as HTMLElement & { checkValidity?: () => boolean };
  if (field.getAttribute?.('aria-invalid') === 'true' && field.checkValidity?.()) field.removeAttribute('aria-invalid');
}

/** The props every payroll form takes for Return and validation. */
export const formKeys = { noValidate: true, onKeyDown: nextOnEnter, onFocus: hintOnFocus, onInput: clearInvalid } as const;
/** The same Return keys for a group of fields that is not a form (nothing to send; Return moves on). */
export const fieldKeys = { onKeyDown: nextOnEnter, onFocus: hintOnFocus } as const;

type Validatable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isValidatable = (element: Element): element is Validatable => element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;

/** The words a person sees for a field: its aria-label, the label it points at, or its label's own text. */
export function fieldName(field: Validatable) {
  const aria = field.getAttribute('aria-label');
  if (aria) return aria.trim();
  const by = field.getAttribute('aria-labelledby');
  const labelled = by ? by.split(/\s+/).map(id => field.ownerDocument.getElementById(id)?.textContent?.trim() ?? '').filter(Boolean).join(' ') : '';
  if (labelled) return labelled;
  const label = field.labels?.[0];
  if (label) {
    // A wrapping label also holds the field and its help; take only the label's own words.
    const own = [...label.childNodes].filter(node => node.nodeType === 3 || (node instanceof HTMLElement && !node.matches('input, select, textarea, small, .wb-help, .c-field__help') && !node.querySelector('input, select, textarea'))).map(node => node.textContent ?? '').join(' ').replace(/\s+/g, ' ').trim();
    if (own) return own;
  }
  return field.name || 'This field';
}

function listWords(names: string[]) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** One message for every field that needs attention. */
export function problemsMessage(fields: Validatable[]) {
  const names = [...new Set(fields.map(fieldName))];
  const missing = fields.every(field => field.validity.valueMissing);
  if (names.length === 1) return missing ? `Fill in ${names[0]}.` : `Check ${names[0]}. ${fields[0].validationMessage}`.trim();
  return `${missing ? 'Fill in' : 'Check'} ${names.length} fields: ${listWords(names)}.`;
}

/** Marks every invalid field at once, opens the rows that hold them, focuses the first and returns the message (or
 * null when the form is ready to send). The native bubble never shows. */
export function flagProblems(form: HTMLFormElement): string | null {
  for (const element of form.querySelectorAll('[aria-invalid="true"][data-pay-flagged]')) { element.removeAttribute('aria-invalid'); element.removeAttribute('data-pay-flagged'); }
  const invalid = [...form.elements].filter(isValidatable).filter(field => field.willValidate && !field.checkValidity());
  if (!invalid.length) return null;
  for (const field of invalid) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('data-pay-flagged', '');
    for (let node: HTMLElement | null = field; node && node !== form; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
  }
  invalid[0].focus();
  return problemsMessage(invalid);
}
