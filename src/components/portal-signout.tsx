"use client";
import type { ReactNode } from 'react';
import { logout } from '@/app/login/actions';
import { cleanupForSignout } from '../lib/notifications/device-client';
export function startSignoutCleanup(cleanup: () => void | Promise<unknown> = cleanupForSignout): void {
  try { void Promise.resolve(cleanup()).catch(() => {}); } catch { /* Native server-action submission must proceed. */ }
}
export function PortalSignout({ children, className }: { children: ReactNode; className?: string }) {
  return <form action={logout} className={className} onSubmit={() => startSignoutCleanup()}>{children}</form>;
}
