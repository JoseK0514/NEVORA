'use client';
import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';
import { BBusyLabel } from '@/components/owner-b/b-kit';
import { ERROR_SCREENS_COPY } from '@/components/error-screens-copy';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { useRetryPress } from './use-retry-press';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children'> & {
  onClick?: () => unknown; children: ReactNode;
  /** The kit's own button (CorpButton, for example); a plain <button> by default. Extra props go to it unchanged. */
  as?: ComponentType<ButtonHTMLAttributes<HTMLButtonElement>>;
  [extra: string]: unknown;
};

/** An in-card "Try again" on any kit (English flag A6, Nov 26, 2026). While its retry runs the button says "Trying
 * again…" with the spinner at its resting width (both labels share one cell), carries aria-busy, stays focusable
 * (aria-disabled, presses ignored) and takes no second press. */
export function RetryButton({ as: Button, onClick, children, disabled, ...rest }: Props) {
  const { busy, press } = useRetryPress(onClick);
  const words = ERROR_SCREENS_COPY[usePortalLang()];
  const props = { type: 'button' as const, ...rest, disabled, 'aria-busy': busy || undefined, 'aria-disabled': busy || undefined, onClick: busy || disabled ? undefined : press };
  const label = <BBusyLabel busy={busy} busyLabel={words.tryingAgain}>{children}</BBusyLabel>;
  return Button ? <Button {...props}>{label}</Button> : <button {...props}>{label}</button>;
}
