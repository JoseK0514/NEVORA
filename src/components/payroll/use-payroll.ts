'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PayrollRunCommand, PayrollSettingsCommand } from '@/lib/payroll/contracts';
import { PayrollRequestError, payrollRequest, readReceipt } from './api';

const referenceKey = 'nevora-payroll-operation';
type Command = PayrollRunCommand | PayrollSettingsCommand;
type WithoutOperation<T> = T extends unknown ? Omit<T, 'operationId'> : never;

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
        setError(failure instanceof Error ? failure.message : 'Payroll could not load.');
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

export function usePayrollOperation(path: '/api/payroll/settings' | '/api/payroll/runs', reload: () => Promise<void>) {
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [revisionConflict, setRevisionConflict] = useState(false);
  const reference = useRef<string | null>(null);
  const command = useRef<Command | null>(null);
  const inFlight = useRef(false);

  const finish = useCallback((id: string) => {
    if (localStorage.getItem(referenceKey) === id) localStorage.removeItem(referenceKey);
    reference.current = null; command.current = null;
    setPending(null); setRetryAvailable(false);
  }, []);
  const check = useCallback(async (id = reference.current) => {
    if (!id || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const receipt = readReceipt(await payrollRequest(`/api/payroll/receipts?operationId=${encodeURIComponent(id)}`));
      if (receipt && receipt.operationId === id) {
        finish(id); setMessage('Action recorded. Review the current status below.'); await reload();
      } else {
        setMessage('No receipt is available yet. Check this same reference again; the action has not been confirmed.');
      }
    } catch (failure) {
      if (failure instanceof PayrollRequestError && failure.status === 403) { finish(id); await reload(); }
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
  }, [check]);

  const dispatch = async (next: Command) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setMessage(''); setRevisionConflict(false);
    try {
      const receipt = readReceipt(await payrollRequest(path, next));
      if (!receipt || receipt.operationId !== next.operationId) throw new Error('The action response is unconfirmed. Check its saved reference.');
      finish(next.operationId); setMessage('Action recorded. Review the current status below.'); await reload();
    } catch (failure) {
      if (failure instanceof PayrollRequestError && [400, 401, 403, 409].includes(failure.status)) { setRevisionConflict(failure.status === 409); finish(next.operationId); await reload(); }
      else setRetryAvailable(true);
      setError(failure instanceof Error ? failure.message : 'The action response was interrupted. Check its reference.');
    } finally { inFlight.current = false; setBusy(false); }
  };
  const submit = async (input: WithoutOperation<Command>) => {
    if (reference.current || inFlight.current) return;
    if ('reason' in input && (!input.reason || input.reason.length > 300 || /[\u0000-\u001f\u007f]/.test(input.reason))) {
      setError('Enter a single-line reason of 1 to 300 characters.'); return;
    }
    const operationId = crypto.randomUUID();
    try {
      const previous = localStorage.getItem(referenceKey);
      if (previous) { reference.current = previous; setPending(previous); await check(previous); return; }
      localStorage.setItem(referenceKey, operationId);
    }
    catch { setError('The browser could not save a recovery reference. Enable browser storage before recording this action.'); return; }
    const next = { ...input, operationId } as Command;
    reference.current = operationId; command.current = next; setPending(operationId);
    await dispatch(next);
  };
  return { pending, busy, message, error, retryAvailable, revisionConflict, submit, check: () => check(), retry: () => command.current ? dispatch(command.current) : check() };
}
