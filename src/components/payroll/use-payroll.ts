'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PayrollReceipt, PayrollRunCommand, PayrollSettingsCommand } from '@/lib/payroll/contracts';
import type { NativeProfileCommand } from '@/lib/payroll/native/contracts';
import { PayrollRequestError, payrollRequest, readReceipt } from './api';
import { toast } from '../toaster';
import { announceOfflineHeld, steppedAway } from '@/lib/offline-hold';

type Command = PayrollRunCommand | PayrollSettingsCommand | NativeProfileCommand;
type WithoutOperation<T> = T extends unknown ? Omit<T, 'operationId'> : never;

/** The read failed because the session ended (HTTP 401). */
export const PAYROLL_SIGNED_OUT = 'Your session ended. Sign in again to see payroll.';

/**
 * Loads a decoded private payroll resource and ignores superseded responses.
 * Hiding/leaving the page clears data and invalidates in-flight reads; going offline keeps loaded data read-only (NV-001)
 * and drops in-flight reads; becoming visible/online reloads current server authority. Keep decode
 * referentially stable, because it is part of reload's effect dependencies.
 */
export function usePayrollResource<T>(path: string, decode: (value: unknown) => T) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Why the read stopped, for callers that explain it: SIGNED_OUT (any 401), FORBIDDEN (any 403), a server code (MODULE_OFF), an HTTP status,
  // NETWORK, UNREADABLE, PAUSED or OFFLINE.
  const [errorCode, setErrorCode] = useState('');
  const generation = useRef({ value: 0 });
  // When the shown data arrived (review B2, NV-001: offline keeps it, and the shell says "Offline · updated 9:24 PM").
  const loadedAt = useRef<string | null>(null);
  const reload = useCallback(async () => {
    const current = ++generation.current.value;
    setLoading(true); setError(''); setErrorCode('');
    try {
      const next = decode(await payrollRequest(path));
      if (generation.current.value === current) { setData(next); loadedAt.current = new Date().toISOString(); }
    } catch (failure) {
      if (generation.current.value === current) {
        setData(null); loadedAt.current = null;
        // A dropped connection surfaces as the browser's own TypeError ("Failed to fetch"); show the existing words instead.
        // IS-B13: an ended session says so, and the state offers Sign in (PayrollState), not a retry that can't work.
        setError(failure instanceof PayrollRequestError && failure.status === 401 ? PAYROLL_SIGNED_OUT
          : failure instanceof Error && !(failure instanceof TypeError) ? failure.message : 'Payroll could not load.');
        setErrorCode(failure instanceof PayrollRequestError ? (failure.status === 401 ? 'SIGNED_OUT' : failure.status === 403 ? 'FORBIDDEN' : failure.code || String(failure.status)) : failure instanceof TypeError ? 'NETWORK' : 'UNREADABLE');
      }
    } finally { if (generation.current.value === current) setLoading(false); }
  }, [path, decode]);
  useEffect(() => {
    let active = true; const lifecycle = generation.current;
    queueMicrotask(() => { if (active) void reload(); });
    const clear = () => { lifecycle.value++; setData(null); loadedAt.current = null; setLoading(false); setErrorCode(navigator.onLine ? 'PAUSED' : 'OFFLINE'); setError(navigator.onLine ? 'Payroll is paused while this page is hidden. Return to reload current access.' : 'Payroll is unavailable offline. Reconnect to reload current access.'); };
    // Review B2 (NV-001): offline with the person still here, the loaded pay stays on screen read-only (in-flight reads are
    // dropped); stepping away still clears.
    const hold = () => { if (steppedAway() || !loadedAt.current) { clear(); return; } lifecycle.value++; setLoading(false); announceOfflineHeld(loadedAt.current); };
    const visible = () => { if (document.visibilityState === 'hidden') clear(); else void reload(); };
    const refresh = () => { if (document.visibilityState !== 'hidden') void reload(); };
    window.addEventListener('offline', hold); window.addEventListener('online', refresh);
    window.addEventListener('pagehide', clear); window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false; lifecycle.value++;
      window.removeEventListener('offline', hold); window.removeEventListener('online', refresh);
      window.removeEventListener('pagehide', clear); window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [reload]);
  return { data, loading, error, errorCode, reload };
}

/** Toast copy for a receipt-confirmed command; never shown before the receipt. */
function confirmedMessage(command: { action?: string }) {
  switch (command.action) {
    case 'APPROVE': return 'Payroll approved';
    case 'PUBLISH': return 'Pay statements published';
    case 'PAYMENT_EXPORT': return 'Payment file ready';
    default: return 'Saved';
  }
}

/**
 * Sends one receipt-based command at a time. Persist only its operation ID under
 * the caller's recovery scope; command details remain in memory. An interrupted
 * response stays unconfirmed and must be checked/retried with that same ID.
 * After remount, check the receipt first; reconstruction requires the user to
 * re-enter the original command, which the server compares against that ID.
 */
export function usePayrollOperation(path: '/api/payroll/settings' | '/api/payroll/runs' | '/api/payroll/native-profiles', reload: () => Promise<void>, recoveryScope: string) {
  const referenceKey = `nevora-payroll-operation:${recoveryScope}`;
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState<PayrollReceipt | null>(null);
  const [error, setError] = useState('');
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resuming, setResuming] = useState(false);
  const reference = useRef<string | null>(null);
  const command = useRef<Command | null>(null);
  const reconstructedCommand = useRef(false);
  const inFlight = useRef(false);

  const finish = useCallback((id: string) => {
    if (localStorage.getItem(referenceKey) === id) localStorage.removeItem(referenceKey);
    reference.current = null; command.current = null; reconstructedCommand.current = false;
    setPending(null); setRetryAvailable(false); setUnconfirmed(false); setResuming(false);
  }, [referenceKey]);
  const check = useCallback(async (id = reference.current) => {
    if (!id || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const receipt = readReceipt(await payrollRequest(`/api/payroll/receipts?operationId=${encodeURIComponent(id)}`));
      if (receipt && receipt.operationId !== id) throw new Error('The returned receipt does not match this action reference. Check the same reference again.');
      if (receipt && receipt.operationId === id) {
        setReceipt(receipt); finish(id); setMessage('Saved. Check the status below.'); toast('Saved'); await reload();
      } else {
        setUnconfirmed(true);
        setMessage('No receipt is available yet. Check this same reference again; the action has not been confirmed.');
      }
    } catch (failure) {
      if (failure instanceof PayrollRequestError && [401, 403].includes(failure.status)) { setReceipt(null); finish(id); await reload(); }
      setError(failure instanceof Error ? failure.message : 'The action reference could not be checked.');
    } finally { inFlight.current = false; setBusy(false); }
  }, [finish, reload]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let stored: string | null = null;
      try { stored = localStorage.getItem(referenceKey); } catch { return; }
      if (stored) { reference.current = stored; setPending(stored); void check(stored); }
    });
    return () => { active = false; };
  }, [check, referenceKey]);

  const dispatch = async (next: Command, reconstructed = false) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage(''); setReceipt(null); setRevisionConflict(false); setResuming(false); setUnconfirmed(false);
    try {
      const receipt = readReceipt(await payrollRequest(path, next));
      if (!receipt || receipt.operationId !== next.operationId) throw new Error('The action response is unconfirmed. Check its saved reference.');
      setReceipt(receipt); finish(next.operationId); setMessage('Saved. Check the status below.'); toast(confirmedMessage(next)); await reload();
    } catch (failure) {
      if (failure instanceof PayrollRequestError && (failure.code === 'OPERATION_CONFLICT' || (reconstructed && [400, 409].includes(failure.status)))) {
        command.current = null; setRetryAvailable(false);
        setMessage('This reference remains unconfirmed. Check the original action before reconstructing it again; a recorded reference cannot accept changed details.');
        await reload();
      }
      else if (failure instanceof PayrollRequestError && [400, 401, 403, 409].includes(failure.status)) { setRevisionConflict(failure.status === 409); finish(next.operationId); await reload(); }
      else setRetryAvailable(true);
      setError(failure instanceof Error && !(failure instanceof TypeError) ? failure.message : 'The action response was interrupted. Check its reference.');
    } finally { inFlight.current = false; setBusy(false); }
  };
  const submit = async (input: WithoutOperation<Command>) => {
    if ((reference.current && !resuming) || inFlight.current) return;
    if ('reason' in input && (!input.reason || input.reason.length > 300 || /[\u0000-\u001f\u007f]/.test(input.reason))) {
      setError('Enter a single-line reason of 1 to 300 characters.'); return;
    }
    const reconstructed = resuming && !!reference.current;
    const operationId = reconstructed ? reference.current! : crypto.randomUUID();
    try {
      const previous = localStorage.getItem(referenceKey);
      if (previous && (!reconstructed || previous !== operationId)) { reference.current = previous; setPending(previous); setResuming(false); await check(previous); return; }
      localStorage.setItem(referenceKey, operationId);
    }
    catch { setError('The browser could not save a recovery reference. Enable browser storage before recording this action.'); return; }
    const next = { ...input, operationId } as Command;
    reference.current = operationId; command.current = next; reconstructedCommand.current = reconstructed; setPending(operationId);
    await dispatch(next, reconstructed);
  };
  return { pending, busy, message, receipt, error, retryAvailable, revisionConflict, resuming, locked: busy || (!!pending && !resuming),
    resumeAvailable: unconfirmed && !retryAvailable && !busy && !resuming,
    resume: () => { if (unconfirmed && !command.current && !inFlight.current) { setResuming(true); setError(''); setMessage('Re-enter the original action and details below. Submission will reuse this exact reference; changed details cannot replace a recorded action.'); } },
    pauseResume: () => setResuming(false),
    submit, check: () => check(), retry: () => command.current ? dispatch(command.current, reconstructedCommand.current) : check() };
}
