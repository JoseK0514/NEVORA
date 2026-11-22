'use client';

import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import {BBusyLabel} from '../owner-b/b-kit';
import {Mark, type MarkName} from './artwork';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger' | 'glass';
  busy?: boolean;
  busyLabel?: string;
  icon?: MarkName;
};

export function Button({
  variant = 'primary',
  busy,
  busyLabel,
  icon,
  children,
  disabled,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  const label = (
    <>
      {icon && <Mark name={icon} size={18} />}
      {children}
    </>
  );
  return (
    <button
      {...props}
      type={type}
      className={`np-button ${className}`}
      data-variant={variant}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
    >
      {busyLabel ? (
        <BBusyLabel busy={!!busy} busyLabel={busyLabel}>
          {label}
        </BBusyLabel>
      ) : (
        label
      )}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  ...props
}: Omit<ButtonProps, 'icon' | 'children'> & {icon: MarkName; label: string}) {
  return (
    <Button
      variant="quiet"
      {...props}
      className={'np-icon-button ' + (props.className ?? '')}
      aria-label={label}
      title={label}
    >
      <Mark name={icon} weight="bold" />
    </Button>
  );
}

export function Switch({
  label,
  description,
  checked,
  onChange,
  busy = false,
  disabled = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <button
      type="button"
      className="np-switch-row"
      role="switch"
      aria-checked={checked}
      aria-labelledby={id}
      aria-describedby={description ? id + '-hint' : undefined}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
    >
      <span className="np-row-copy">
        <strong id={id}>{label}</strong>
        {description && <small id={id + '-hint'}>{description}</small>}
      </span>
      <span className="np-switch-track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export function Choice({
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type: 'checkbox' | 'radio';
  label: ReactNode;
}) {
  return (
    <label className="np-choice">
      <input {...props} />
      <span>{label}</span>
    </label>
  );
}

type FieldCopy = {label: string; hint?: string; error?: string};
export function Field({
  label,
  hint,
  error,
  id,
  type = 'text',
  ...props
}: FieldCopy & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId(),
    key = id ?? auto;
  return (
    <div className="np-field">
      <label htmlFor={key}>{label}</label>
      <div className="np-input-wrap">
        {type === 'search' && <Mark name="search" size={18} weight="bold" />}
        <input
          {...props}
          id={key}
          type={type}
          aria-invalid={!!error || undefined}
          aria-describedby={
            [props['aria-describedby'], (error || hint) && key + '-note']
              .filter(Boolean)
              .join(' ') || undefined
          }
        />
      </div>
      {(error || hint) && (
        <small data-error={!!error} id={key + '-note'}>
          {error || hint}
        </small>
      )}
    </div>
  );
}

export function Select({
  label,
  hint,
  error,
  id,
  children,
  ...props
}: FieldCopy & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId(),
    key = id ?? auto;
  return (
    <div className="np-field">
      <label htmlFor={key}>{label}</label>
      <div className="np-select-wrap">
        <select
          {...props}
          id={key}
          aria-invalid={!!error || undefined}
          aria-describedby={
            [props['aria-describedby'], (hint || error) && key + '-note']
              .filter(Boolean)
              .join(' ') || undefined
          }
        >
          {children}
        </select>
        <Mark name="down" size={15} weight="bold" />
      </div>
      {(error || hint) && (
        <small id={key + '-note'} data-error={!!error}>
          {error || hint}
        </small>
      )}
    </div>
  );
}

export type Option<K extends string> = {value: K; label: string; count?: number};
export function Options<K extends string>({
  label,
  options,
  value,
  onChange,
  style = 'segment',
}: {
  label: string;
  options: readonly Option<K>[];
  value: K;
  onChange: (v: K) => void;
  style?: 'segment' | 'chips';
}) {
  return (
    <div className="np-options" role="group" aria-label={label} data-style={style}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <small>{o.count}</small>}
        </button>
      ))}
    </div>
  );
}
