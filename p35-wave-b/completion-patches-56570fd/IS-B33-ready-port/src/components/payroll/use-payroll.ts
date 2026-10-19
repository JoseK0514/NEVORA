'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PayrollRunCommand, PayrollSettingsCommand } from '@/lib/payroll/contracts';
import { PayrollRequestError, payrollRequest, readReceipt } from './api';
import { toast } from '../toaster';

type Command = PayrollRunCommand | PayrollSettingsCommand;
type WithoutOperation<T> = T extends unknown ? Omit<T, 'operationId'> : never;

/** The read failed because the session ended (HTTP 401). */
export const PAYROLL_SIGNED_OUT = 'Your session ended. Sign in again to see payroll.';

export function usePayrollResource<T>(path: string, decode: (value: unknown) => T) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef({ value: 0 });
  const reload = useCallback(async () => {
    const current = ++generation.current.value;
    setLoading(true); setError('');
    try {
      const next = decode(await payrollRequest(path));
      if (generation.current.value === current) setData(next);
    } catch (failure) {
      if (generation.current.value === current) {
        setData(null);
        // A dropped connection surfaces as the browser's own TypeError ("Failed to fetch"); show the existing words instead.
        // IS-B13: an ended session says so, and the state offers Sign in (PayrollState), not a retry that can't work.
        setError(failure instanceof PayrollRequestError && failure.status === 401 ? PAYROLL_SIGNED_OUT
          : failure instanceof Error && !(failure instanceof TypeError) ? failure.message : 'Payroll could not load.');
      }
    } finally { if (generation.current.value === current) setLoading(false); }
  }, [path, decode]);
  useEffect(() => {
    let active = true; const lifecycle = generation.current;
    queueMicrotask(() => { if (active) void reload(); });
    const clear = () => { lifecycle.value++; setData(null); setLoading(false); setError(navigator.onLine ? 'Payroll is paused while this page is hidden. Return to reload current access.' : 'Payroll is unavailable offline. Reconnect to reload current access.'); };
    const visible = () => { if (document.visibilityState === 'hidden') clear(); else void reload(); };
    const refresh = () => { if (document.visibilityState !== 'hidden') void reload(); };
    window.addEventListener('offline', clear); window.addEventListener('online', refresh);
    window.addEventListener('pagehide', clear); window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false; lifecycle.value++;
      window.removeEventListener('offline', clear); window.removeEventListener('online', refresh);
      window.removeEventListener('pagehide', clear); window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [reload]);
  return { data, loading, error, reload };
}

/** Toast copy for a receipt-confirmed command; never shown before the receipt. */
function confirmedMessage(command: { action?: string }) {
  switch (command.action) {
    case 'APPROVE': return 'Payroll revision approved';
    case 'PUBLISH': return 'Statements published to employees';
    case 'PAYMENT_EXPORT': return 'Payment instructions prepared';
    default: return 'Action recorded';
  }
}

export function usePayrollOperation(path: '/api/payroll/settings' | '/api/payroll/runs', reload: () => Promise<void>, recoveryScope: string) {
  const referenceKey = `nevora-payroll-operation:${recoveryScope}`;
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeAction, setActiveAction] = useState<Command['action'] | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resuming, setResuming] = useState(false);
  const reference = useRef<string | null>(null);
  const command = useRef<Command | null>(null);
  const commandOrigin = useRef<string | null>(null);
  const reconstructedCommand = useRef(false);
  const inFlight = useRef(false);

  const finish = useCallback((id: string) => {
    if (localStorage.getItem(referenceKey) === id) localStorage.removeItem(referenceKey);
    reference.current = null; command.current = null; commandOrigin.current = null; reconstructedCommand.current = false;
    setPending(null); setRetryAvailable(false); setUnconfirmed(false); setResuming(false);
  }, [referenceKey]);
  const check = useCallback(async (id = reference.current) => {
    if (!id || inFlight.current) return;
    inFlight.current = true; setBusy(true); setActiveAction(null); setActiveTarget(null); setError('');
    try {
      const receipt = readReceipt(await payrollRequest(`/api/payroll/receipts?operationId=${encodeURIComponent(id)}`));
      if (receipt && receipt.operationId !== id) throw new Error('The returned receipt does not match this action reference. Check the same reference again.');
      if (receipt && receipt.operationId === id) {
        finish(id); setMessage('Action recorded. Review the current status below.'); toast('Action recorded'); await reload();
      } else {
        setUnconfirmed(true);
        setMessage('No receipt is available yet. Check this same reference again; the action has not been confirmed.');
      }
    } catch (failure) {
      if (failure instanceof PayrollRequestError && failure.status === 403) { finish(id); await reload(); }
      setError(failure instanceof Error ? failure.message : 'The action reference could not be checked.');
    } finally { inFlight.current = false; setBusy(false); setActiveAction(null); setActiveTarget(null); }
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
    inFlight.current = true; setBusy(true); setActiveAction(next.action); setActiveTarget(next.action === 'PREPARE' ? commandOrigin.current : 'jobId' in next ? next.jobId : 'runId' in next ? next.runId : null); setError(''); setMessage(''); setRevisionConflict(false); setResuming(false); setUnconfirmed(false);
    try {
      const receipt = readReceipt(await payrollRequest(path, next));
      if (!receipt || receipt.operationId !== next.operationId) throw new Error('The action response is unconfirmed. Check its saved reference.');
      finish(next.operationId); setMessage('Action recorded. Review the current status below.'); toast(confirmedMessage(next)); await reload();
    } catch (failure) {
      if (failure instanceof PayrollRequestError && (failure.code === 'OPERATION_CONFLICT' || (reconstructed && [400, 409].includes(failure.status)))) {
        command.current = null; setRetryAvailable(false);
        setMessage('This reference remains unconfirmed. Check the original action before reconstructing it again; a recorded reference cannot accept changed details.');
        await reload();
      }
      else if (failure instanceof PayrollRequestError && [400, 401, 403, 409].includes(failure.status)) { setRevisionConflict(failure.status === 409); finish(next.operationId); await reload(); }
      else setRetryAvailable(true);
      setError(failure instanceof Error && !(failure instanceof TypeError) ? failure.message : 'The action response was interrupted. Check its reference.');
    } finally { inFlight.current = false; setBusy(false); setActiveAction(null); setActiveTarget(null); }
  };
  const submit = async (input: WithoutOperation<Command>, uiOrigin: string | null = null) => {
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
    reference.current = operationId; command.current = next; commandOrigin.current = uiOrigin; reconstructedCommand.current = reconstructed; setPending(operationId);
    await dispatch(next, reconstructed);
  };
  return { pending, busy, activeAction, activeTarget, message, error, retryAvailable, revisionConflict, resuming, locked: busy || (!!pending && !resuming),
    resumeAvailable: unconfirmed && !retryAvailable && !busy && !resuming,
    resume: () => { if (unconfirmed && !command.current && !inFlight.current) { setResuming(true); setError(''); setMessage('Re-enter the original action and details below. Submission will reuse this exact reference; changed details cannot replace a recorded action.'); } },
    pauseResume: () => setResuming(false),
    submit, check: () => check(), retry: () => command.current ? dispatch(command.current, reconstructedCommand.current) : check() };
}
