'use client';

import {useEffect, useId, useRef, type ReactNode} from 'react';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {OfflineGlyph} from '../owner-b/b-glyphs';
import {BSpin} from '../owner-b/b-kit';
import {Mark, type MarkName} from './artwork';
import {IconButton} from './controls';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
const toneMarks: Record<Tone, MarkName> = {
  neutral: 'clock',
  info: 'info',
  success: 'approve',
  warning: 'warning',
  danger: 'blocked',
};

export function StatusLabel({tone = 'neutral', children}: {tone?: Tone; children: ReactNode}) {
  return (
    <span className="np-status" data-tone={tone}>
      <i aria-hidden="true" />
      {children}
    </span>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
  action,
  announce = false,
}: {
  tone?: Tone;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  announce?: boolean;
}) {
  return (
    <div
      className="np-notice"
      data-tone={tone}
      role={announce ? (tone === 'danger' ? 'alert' : 'status') : undefined}
    >
      <span className="np-notice-mark">
        <Mark name={toneMarks[tone]} size={21} weight="bold" />
      </span>
      <div>
        <strong>{title}</strong>
        {children && <div className="np-detail">{children}</div>}
        {action}
      </div>
    </div>
  );
}

export function Skeleton({label, rows = 2}: {label: string; rows?: number}) {
  return (
    <div className="np-skeleton" role="status" aria-label={label}>
      {Array.from({length: rows}, (_, i) => (
        <div key={i} aria-hidden="true">
          <i />
          <span>
            <b />
            <em />
          </span>
        </div>
      ))}
    </div>
  );
}
export function Spinner({label}: {label: string}) {
  return (
    <span className="np-spinner" role="status">
      <BSpin small />
      {label}
    </span>
  );
}
export function Progress({value, label}: {value: number; label: string}) {
  const id = useId(),
    percent = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className="np-progress">
      <label htmlFor={id}>
        {label}
        <b>{percent}%</b>
      </label>
      <progress id={id} max={100} value={percent} />
    </div>
  );
}
export type ResultKind =
  'empty' | 'no-results' | 'offline' | 'stale' | 'denied' | 'error' | 'saved' | 'unconfirmed';
const results: Record<ResultKind, [Tone, MarkName]> = {
  empty: ['neutral', 'empty'],
  'no-results': ['neutral', 'search'],
  offline: ['warning', 'warning'],
  stale: ['warning', 'clock'],
  denied: ['danger', 'lock'],
  error: ['danger', 'blocked'],
  saved: ['success', 'approve'],
  unconfirmed: ['warning', 'wait'],
};
export function Result({
  kind,
  title,
  description,
  action,
}: {
  kind: ResultKind;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  const [tone, mark] = results[kind];
  return (
    <div className="np-result" data-tone={tone}>
      <span className="np-disc">
        {kind === 'offline' ? (
          <OfflineGlyph size={24} />
        ) : kind === 'unconfirmed' ? (
          <QuestionIcon size={24} weight="bold" aria-hidden="true" focusable="false" />
        ) : (
          <Mark name={mark} size={24} weight={kind === 'error' ? 'bold' : 'fill'} />
        )}
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Toast({
  message,
  onDismiss,
  dismissLabel = 'Dismiss',
}: {
  message: string;
  onDismiss: () => void;
  dismissLabel?: string;
}) {
  return (
    <div className="np-toast">
      <span role="status">
        <Mark name="approve" size={18} />
        {message}
      </span>
      <IconButton icon="close" label={dismissLabel} onClick={onDismiss} />
    </div>
  );
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  actions,
  sheet,
  closeLabel = 'Close',
  embedded = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  sheet?: boolean;
  closeLabel?: string;
  embedded?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const element = ref.current;
    if (!element || !open || embedded) return;
    const previous = document.activeElement;
    if (!element.open) element.showModal();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open, embedded]);
  const content = (
    <>
      <header>
        <h2 id={id}>{title}</h2>
        <IconButton icon="close" label={closeLabel} onClick={onClose} />
      </header>
      <div className="np-dialog-body">{children}</div>
      {actions && <footer>{actions}</footer>}
    </>
  );
  if (embedded)
    return (
      <div role="group" className="np-dialog" data-sheet={!!sheet} aria-labelledby={id}>
        {content}
      </div>
    );
  return (
    <dialog
      ref={ref}
      className="np-dialog"
      data-sheet={!!sheet}
      aria-labelledby={id}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      {content}
    </dialog>
  );
}
