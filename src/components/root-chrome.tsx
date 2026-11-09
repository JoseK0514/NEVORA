'use client';
import { useEffect } from 'react';
import { claimRootChrome } from '@/lib/root-chrome';

/** Renders nothing; while mounted, the shell shows a tab page's phone header (QA D16, the signed-in 404). */
export function RootChrome() {
  useEffect(() => claimRootChrome(), []);
  return null;
}
