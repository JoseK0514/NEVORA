'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PayrollReceipt, PayrollRunCommand, PayrollSettingsCommand } from '@/lib/payroll/contracts';
import type { NativeProfileCommand } from '@/lib/payroll/native/contracts';
import { PayrollRequestError, payrollErrorText, payrollRequest, readReceipt } from './api';
import { usePayrollLang, type PayrollLang } from './payroll-lang';
import { statusCopy } from './copy/status';
import { toast } from '../toaster';

type Command = PayrollRunCommand | PayrollSettingsCommand | NativeProfileCommand;
type WithoutOperation<T> = T extends unknown ? Omit<T, 'operationId'> : never;

/** The read failed because the session ended (HTTP 401). */
export const PAYROLL_SIGNED_OUT = statusCopy.en.resource.signedOut;

/**
 * Loads a decoded private payroll resource and ignores superseded responses.
 * Hiding/leaving the page or going offline clears data and invalidates in-flight reads
 * and drops in-flight reads; becoming visible/online reloads current server authority. Keep decode
 * referentially stable, because it is part of reload's effect dependencies.
 */
export function usePayrollResource<T>(path: string, decode: (value: unknown) => T) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lang = usePayrollLang();
  const words = statusCopy[lang].resource;
  // Why the read stopped, for callers that explain it: SIGNED_OUT (any 401), FORBIDDEN (any 403), a server code (MODULE_OFF), an HTTP status,
  // NETWORK, UNREADABLE, PAUSED or OFFLINE.
  const [errorCode, setErrorCode] = useState('');
  const generation = useRef({ value: 0 });
  const reload = useCallback(async () => {
    const current = ++generation.current.value;
    setLoading(true); setError(''); setErrorCode('');
    try {
      const next = decode(await payrollRequest(path));
      if (generation.current.value === current) { setData(next); }
    } catch (failure) {
      if (generation.current.value === current) {
        setData(null);
        // A dropped connection surfaces as the browser's own TypeError ("Failed to fetch"); show the existing words instead.
        // IS-B13: an ended session says so, and the state offers Sign in (PayrollState), not a retry that can't work.
        setError(failure instanceof PayrollRequestError && failure.status === 401 ? words.signedOut
          : payrollErrorText(failure, lang, words.couldNotLoad));
        setErrorCode(failure instanceof PayrollRequestError ? (failure.status === 401 ? 'SIGNED_OUT' : failure.status === 403 ? 'FORBIDDEN' : failure.code || String(failure.status)) : failure instanceof TypeError ? 'NETWORK' : 'UNREADABLE');
      }
    } finally { if (generation.current.value === current) setLoading(false); }
  }, [path, decode, lang, words]);
  useEffect(() => {
    let active = true; const lifecycle = generation.current;
    queueMicrotask(() => { if (active) void reload(); });
    const clear = () => { lifecycle.value++; setData(null); setLoading(false); setErrorCode(navigator.onLine ? 'PAUSED' : 'OFFLINE'); setError(navigator.onLine ? words.paused : words.offline); };
    // Review B2 (NV-001): offline with the person still here, the loaded pay stays on screen read-only (in-flight reads are
    // dropped); stepping away still clears.
    // This legacy resource has no finite authority lease. Preserve development's
    // fail-closed offline behavior rather than retaining unbounded pay data.
    const hold = () => clear();
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
  }, [reload, words]);
  return { data, loading, error, errorCode, reload };
}

/** Phase 7 (moments): what the receipt itself confirms, for the shared done state. Publishing only queues the statements
 * (the worker shares them later), so its receipt is "Saved" and never borrows the success mark for "shared". The words
 * are the existing ones; no payroll sentence is new. */
export function confirmedTitle(command: { action?: string }, lang: PayrollLang = 'en'): string | null {
  return command.action === 'PUBLISH' ? null : confirmedMessage(command, lang);
}
/** Toast copy for a receipt-confirmed command; never shown before the receipt. */
function confirmedMessage(command: { action?: string }, lang: PayrollLang = 'en') {
  const t = statusCopy[lang].operation;
  switch (command.action) {
    case 'APPROVE': return t.approved;
    // Publishing only queues the statements; the worker shares them later. The receipt confirms the save, not the sharing,
    // so it says "Saved" (decided Nov 17, 2026; the old toast said the statements were already shared).
    case 'PUBLISH': return t.saved;
    case 'PAYMENT_EXPORT': return t.paymentReady;
    default: return t.saved;
  }
}

/**
 * Sends one receipt-based command at a time. Persist only its operation ID under
 * the caller's recovery scope; command details remain in memory. An interrupted
 * response stays unconfirmed and must be checked/retried with that same ID.
 * After remount, check the receipt first; reconstruction requires the user to
 * re-enter the original command, which the server compares against that ID.
 */
export function usePayrollOperation(path: '/api/payroll/settings' | '/api/payroll/runs' | '/api/payroll/native-profiles', reload: () => Promise<void>, recoveryScope: string,
  /** Phase 7 (moments): the screen draws this hook's result inline (`Feedback`), so a confirmed result is said there
   * once and no toast repeats it. A screen without `Feedback` passes false and keeps the toast. */
  inlineResult = true) {
  const referenceKey = `nevora-payroll-operation:${recoveryScope}`;
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);
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
  const lang = usePayrollLang();
  const t = statusCopy[lang].operation;

  const finish = useCallback((id: string) => {
    if (localStorage.getItem(referenceKey) === id) localStorage.removeItem(referenceKey);
    reference.current = null; command.current = null; reconstructedCommand.current = false;
    setPending(null); setRetryAvailable(false); setUnconfirmed(false); setResuming(false);
  }, [referenceKey]);
  const check = useCallback(async (id = reference.current) => {
    if (!id || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setConfirmed(null);
    try {
      const receipt = readReceipt(await payrollRequest(`/api/payroll/receipts?operationId=${encodeURIComponent(id)}`));
      if (receipt && receipt.operationId !== id) throw new Error(t.receiptMismatch);
      if (receipt && receipt.operationId === id) {
        setReceipt(receipt); finish(id); setMessage(t.savedCheck); setConfirmed(t.saved); if (!inlineResult) toast(t.saved); await reload();
      } else {
        setUnconfirmed(true);
        setMessage(t.noReceipt);
      }
    } catch (failure) {
      if (failure instanceof PayrollRequestError && [401, 403].includes(failure.status)) { setReceipt(null); setUnconfirmed(true); await reload(); }
      setError(failure instanceof TypeError ? failure.message : payrollErrorText(failure, lang, t.checkFailed));
    } finally { inFlight.current = false; setBusy(false); }
  }, [finish, reload, inlineResult, lang, t]);
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
    inFlight.current = true; setBusy(true); setError(''); setMessage(''); setConfirmed(null); setReceipt(null); setRevisionConflict(false); setResuming(false); setUnconfirmed(false);
    try {
      const receipt = readReceipt(await payrollRequest(path, next));
      if (!receipt || receipt.operationId !== next.operationId) throw new Error(t.unconfirmed);
      setReceipt(receipt); finish(next.operationId); setMessage(t.savedCheck); setConfirmed(confirmedTitle(next, lang)); if (!inlineResult) toast(confirmedMessage(next, lang)); await reload();
    } catch (failure) {
      if (failure instanceof PayrollRequestError && (failure.code === 'OPERATION_CONFLICT' || (reconstructed && [400, 409].includes(failure.status)))) {
        command.current = null; setRetryAvailable(false);
        setMessage(t.stillUnconfirmed);
        await reload();
      }
      else if (failure instanceof PayrollRequestError && [401, 403].includes(failure.status)) { setUnconfirmed(true); setRetryAvailable(true); await reload(); }
      else if (failure instanceof PayrollRequestError && [400, 409].includes(failure.status)) { setRevisionConflict(failure.status === 409); finish(next.operationId); await reload(); }
      else setRetryAvailable(true);
      setError(payrollErrorText(failure, lang, t.interrupted));
    } finally { inFlight.current = false; setBusy(false); }
  };
  const submit = async (input: WithoutOperation<Command>) => {
    if ((reference.current && !resuming) || inFlight.current) return;
    if ('reason' in input && (!input.reason || input.reason.length > 300 || /[\u0000-\u001f\u007f]/.test(input.reason))) {
      setError(t.reasonInvalid); return;
    }
    const reconstructed = resuming && !!reference.current;
    const operationId = reconstructed ? reference.current! : crypto.randomUUID();
    try {
      const previous = localStorage.getItem(referenceKey);
      if (previous && (!reconstructed || previous !== operationId)) { reference.current = previous; setPending(previous); setResuming(false); await check(previous); return; }
      localStorage.setItem(referenceKey, operationId);
    }
    catch { setError(t.storageFailed); return; }
    const next = { ...input, operationId } as Command;
    reference.current = operationId; command.current = next; reconstructedCommand.current = reconstructed; setPending(operationId);
    await dispatch(next, reconstructed);
  };
  return { pending, busy, message, confirmed, receipt, error, retryAvailable, revisionConflict, resuming, locked: busy || (!!pending && !resuming),
    resumeAvailable: unconfirmed && !retryAvailable && !busy && !resuming,
    resume: () => { if (unconfirmed && !command.current && !inFlight.current) { setResuming(true); setError(''); setConfirmed(null); setMessage(t.resumePrompt); } },
    pauseResume: () => setResuming(false),
    submit, check: () => check(), retry: () => command.current ? dispatch(command.current, reconstructedCommand.current) : check() };
}
