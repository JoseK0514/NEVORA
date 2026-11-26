'use client';
import type { ReactNode } from 'react';
import { BButton, type BtnKind } from './b-kit';
import { useRetryPress } from '@/components/kit/use-retry-press';
import { ERROR_SCREENS_COPY } from '@/components/error-screens-copy';
import { usePortalLang } from '@/lib/i18n/portal-lang';

/** A card's "Try again" on the Direction B kit (English flag A6): busy with "Trying again…" and the spinner at its
 * resting width while the retry runs, and still focusable (keepFocus), like the full-page error screens. */
export function BRetryButton({ kind = 'teal', full, onClick, label, children }: { kind?: BtnKind; full?: boolean; onClick?: () => unknown; label?: string; children: ReactNode }) {
  const { busy, press } = useRetryPress(onClick);
  return <BButton kind={kind} full={full} onClick={press} busy={busy} busyLabel={ERROR_SCREENS_COPY[usePortalLang()].tryingAgain} keepFocus label={label}>{children}</BButton>;
}
