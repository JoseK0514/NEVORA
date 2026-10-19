"use client";

import { useLayoutEffect, type RefObject } from 'react';

/** Keep an Enter-initiated field focused while the operation's existing guard locks edits. */
export function usePendingPayrollFields(form: RefObject<HTMLFormElement | null>, locked: boolean) {
  useLayoutEffect(() => {
    const root = form.current;
    if (!locked || !root) return;
    const active = document.activeElement;
    const fields = [...root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>('fieldset input, fieldset textarea, fieldset select, fieldset button')];
    const original = fields.map(field => ({ field, disabled: field.disabled, readOnly: 'readOnly' in field ? field.readOnly : undefined }));
    for (const { field } of original) {
      // Submit controls stay focusable; their form handler and operation retain duplicate guards.
      if (field instanceof HTMLButtonElement && field.type === 'submit') continue;
      const supportsReadOnly = field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement && !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes(field.type);
      if (field === active && supportsReadOnly) (field as HTMLInputElement | HTMLTextAreaElement).readOnly = true;
      else field.disabled = true;
    }
    if (active instanceof HTMLElement && root.contains(active) && active.matches(':disabled')) root.querySelector<HTMLButtonElement>('button[type="submit"]:not(:disabled)')?.focus({ preventScroll: true });
    return () => { for (const { field, disabled, readOnly } of original) { field.disabled = disabled; if (readOnly !== undefined && 'readOnly' in field) field.readOnly = readOnly; } };
  }, [form, locked]);
}
