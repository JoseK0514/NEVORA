'use client';

import { FileCsvIcon, WalletIcon, FileTextIcon, SlidersHorizontalIcon } from '@phosphor-icons/react/ssr';

/* Phase 1 (inspection Oct 24): page entrances are off. Content painted, jumped back and animated in on every visit,
 * which read as lag; a page now appears in place. */
export function PayrollExportMotion({ kind = 'export' }: { kind?: 'export' | 'payroll' | 'statement' | 'settings' }) {
  const Icon = kind === 'payroll' ? WalletIcon : kind === 'statement' ? FileTextIcon : kind === 'settings' ? SlidersHorizontalIcon : FileCsvIcon;
  return <span aria-hidden="true"><Icon size={28} weight="duotone" /></span>;
}
