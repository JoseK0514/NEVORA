'use client';

import { useId, useState } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { usePayrollCopy } from './payroll-copy';

/** "Mon, Oct 26, 2026"; Spanish "lun, 26 oct 2026" (voice.md: no period after the month, September is "sep"). */
const shown = (value: string, lang: 'en' | 'es' = 'en') => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const text = new Intl.DateTimeFormat(lang === 'es' ? 'es-PR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
  return lang === 'es' ? text.replace(/\./g, '').replace(/\bsept\b/g, 'sep') : text;
};

/** A kit date field ("Mon, Oct 26, 2026" in a 48px field). The native date input sits invisibly over it, so the field
 * still opens the system picker, keeps its form name and validation, and shows no browser glyph or numeric format. */
export function PayDateField({ name, label, defaultValue = '', required, disabled, help, onChange }: {
  name: string; label: string; defaultValue?: string; required?: boolean; disabled?: boolean; help?: string; onChange?: (value: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const t = usePayrollCopy();
  return <div className="c-field">
    <label className="c-field__label" htmlFor={id}>{label}</label>
    <span className="c-in c-pay__date" data-empty={value ? undefined : ''}>
      <span aria-hidden="true">{shown(value, t.lang) || t.settings.chooseDate}</span>
      <CalendarBlankIcon weight="bold" className="c-ic c-ic--s" aria-hidden="true" />
      <input id={id} type="date" name={name} required={required} disabled={disabled} defaultValue={defaultValue} aria-describedby={help ? `${id}-help` : undefined}
        onChange={event => { setValue(event.target.value); onChange?.(event.target.value); }}
        onClick={event => { try { event.currentTarget.showPicker?.(); } catch { /* Focus is enough where pickers can't open. */ } }} />
    </span>
    {help ? <span className="c-field__help" id={`${id}-help`}>{help}</span> : null}
  </div>;
}
