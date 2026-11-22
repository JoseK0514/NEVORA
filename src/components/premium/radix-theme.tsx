'use client';
import {Theme} from '@radix-ui/themes';
import type {ReactNode} from 'react';
import '@radix-ui/themes/styles.css';
import './radix-theme.css';

/** Scope the upstream theme to an opted-in surface in the NEVORA kit. */
export function NevoraRadixTheme({children}: {children: ReactNode}) {
  return (
    <Theme
      appearance="light"
      accentColor="teal"
      grayColor="sage"
      radius="medium"
      hasBackground={false}
      className="nv-radix"
    >
      {children}
    </Theme>
  );
}
