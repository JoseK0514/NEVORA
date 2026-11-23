'use client';

import {useEffect, useId, useMemo, useState, type ReactNode} from 'react';
import {Button, Field} from './controls';
import {ClockerIcon, type ClockerIconName} from '../clocker-icon';
import {StatusLabel, type Tone} from './feedback';

export function TabletFrame({
  location,
  status,
  tone = 'success',
  children,
}: {
  location: string;
  status: string;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section className="np-tablet" aria-label={location}>
      <header>
        <span>
          <ClockerIcon name="location" weight="fill" size={18} />
          {location}
        </span>
        <StatusLabel tone={tone}>{status}</StatusLabel>
      </header>
      <div className="np-tablet-body">{children}</div>
    </section>
  );
}

export function PinPad({
  value,
  onChange,
  onSubmit,
  error,
  length = 4,
  label = 'Employee PIN',
  submitLabel = 'Continue',
  deleteLabel = 'Delete last digit',
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string;
  length?: number;
  label?: string;
  submitLabel?: string;
  deleteLabel?: string;
  disabled?: boolean;
}) {
  function update(next: string) {
    onChange(next.replace(/[^0-9]/g, '').slice(0, length));
  }
  return (
    <form
      className="np-pin"
      onSubmit={e => {
        e.preventDefault();
        if (!disabled && value.length === length) onSubmit();
      }}
    >
      <Field
        label={label}
        error={error}
        disabled={disabled}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={length}
        value={value}
        onChange={e => update(e.target.value)}
      />
      <div className="np-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
          <button
            key={n}
            type="button"
            disabled={disabled || value.length >= length}
            onClick={() => update(value + n)}
          >
            {n}
          </button>
        ))}
        <span />
        <button
          type="button"
          disabled={disabled || value.length >= length}
          onClick={() => update(value + '0')}
        >
          0
        </button>
        <button
          type="button"
          aria-label={deleteLabel}
          disabled={disabled || !value}
          onClick={() => update(value.slice(0, -1))}
        >
          <ClockerIcon name="delete" weight="bold" size={20} />
        </button>
      </div>
      <Button type="submit" disabled={disabled || value.length !== length}>
        {submitLabel}
      </Button>
    </form>
  );
}

export function PunchAction({
  label,
  description,
  icon,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  description?: string;
  icon: Extract<ClockerIconName, 'clock-in' | 'clock-out' | 'break' | 'rest' | 'meal' | 'resume'>;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="np-punch"
      data-primary={!!primary}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="np-disc">
        <ClockerIcon name={icon} weight="fill" size={23} />
      </span>
      <span className="np-row-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <ClockerIcon name="arrow" weight="bold" size={17} />
    </button>
  );
}

export function PhotoCapture({
  onAccept,
  onCancel,
  label = 'Take or choose a photo',
  acceptLabel = 'Use this photo',
  cancelLabel = 'Cancel',
  previewAlt = 'Selected photo',
  errorLabel = 'Choose an image file.',
}: {
  onAccept: (file: File) => void;
  onCancel: () => void;
  label?: string;
  acceptLabel?: string;
  cancelLabel?: string;
  previewAlt?: string;
  errorLabel?: string;
}) {
  const id = useId(),
    [file, setFile] = useState<File | null>(null),
    [error, setError] = useState(false);
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <div className="np-photo">
      <div className="np-viewfinder">
        {url ? (
          <img src={url} alt={previewAlt} />
        ) : (
          <ClockerIcon name="camera" size={44} weight="fill" />
        )}
      </div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="user"
        onChange={e => {
          const selected = e.target.files?.[0];
          if (!selected) return;
          const ok = selected.type.startsWith('image/');
          setError(!ok);
          setFile(ok ? selected : null);
        }}
      />
      {error && <p role="alert">{errorLabel}</p>}
      <div className="np-actions">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          disabled={!file}
          onClick={() => {
            if (file) onAccept(file);
          }}
        >
          {acceptLabel}
        </Button>
      </div>
    </div>
  );
}
