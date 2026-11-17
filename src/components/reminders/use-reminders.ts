'use client';

import {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {canSend, type ReminderState, type ReminderTarget} from './machine';
import {reminderRequest, type ReminderTransport} from './client';
import {lookupFlow, sendFlow} from './flows';
import {reminderKey, reminderStore, type ReminderStoreCore} from './store';

/* Reminders (U10): one machine per person on the page, kept in the tab's store (store.ts) so a command that is out
 * or unconfirmed survives the page being redrawn. Eligibility is read for each person once their row is on the page,
 * one at a time (each read takes the server's source locks), and again only when someone asks or the page comes
 * back. Nothing is sent without a deliberate press. */

export type ReminderStore = {
  /** undefined: reminders are not offered for this person. */
  state: (employeeId: string) => ReminderState | undefined;
  targets: ReminderTarget[];
  offline: boolean;
  /** Ready people, in page order. */
  eligible: ReminderTarget[];
  /** The person's row is on the page: read their eligibility. */
  want: (employeeId: string) => void;
  recheck: (employeeId: string) => void;
  send: (employeeId: string) => Promise<void>;
  sendMany: (employeeIds: string[]) => Promise<void>;
  lookup: (employeeId: string, asked?: boolean) => Promise<void>;
};

const newId = () => crypto.randomUUID();

export function useReminders({targets, authority, transport = reminderRequest, mintId = newId, store = reminderStore}: {
  targets: ReminderTarget[]; authority: string | undefined; transport?: ReminderTransport; mintId?: () => string; store?: ReminderStoreCore;
}): ReminderStore {
  const version = useSyncExternalStore(store.subscribe, store.version, () => 0);
  const [offline, setOffline] = useState(false);
  const [wanted, setWanted] = useState<ReadonlySet<string>>(() => new Set());
  const want = useCallback((employeeId: string) => setWanted(current => (current.has(employeeId) ? current : new Set(current).add(employeeId))), []);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    sync();
    window.addEventListener('online', sync); window.addEventListener('offline', sync);
    return () => { window.removeEventListener('online', sync); window.removeEventListener('offline', sync); };
  }, []);

  // The people and their sources as the page has them now.
  const content = authority ? JSON.stringify([authority, targets.map(target => [target.employeeId, target.source])]) : '';
  const keys = useMemo(() => new Map(authority ? targets.map(target => [target.employeeId, reminderKey(authority, target)]) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `content` is the content of targets and authority.
    [content]);
  useEffect(() => {
    if (!authority) return;
    const adopted = store.adopt(targets, authority, mintId);
    return () => store.release(adopted.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `content` is the content of targets and authority.
  }, [content, store]);

  // Read eligibility for everyone on the page who is waiting on it, one at a time.
  useEffect(() => {
    if (offline) return;
    let cancelled = false;
    const pump = () => {
      if (cancelled || store.reading.size > 0) return;
      for (const [employeeId, key] of keys) {
        const state = store.get(key);
        if (state?.phase !== 'checking' || !wanted.has(employeeId)) continue;
        store.reading.add(key);
        void transport('eligibility', state.command).then(outcome => {
          store.reading.delete(key);
          // The answer belongs to the command it was asked about; a newer command is read again on its own.
          if (store.get(key)?.command === state.command) store.apply(key, {type: 'eligibility', outcome});
          // Wake every page that shows reminders (this one may have been redrawn while the read was out).
          store.touch();
        });
        return;
      }
    };
    pump();
    return () => { cancelled = true; };
  }, [version, keys, wanted, offline, transport, store]);

  const keyOf = useCallback((employeeId: string) => keys.get(employeeId), [keys]);
  const lookup = useCallback(async (employeeId: string, asked = true) => { const key = keyOf(employeeId); if (key) await lookupFlow(event => store.apply(key, event), transport, asked); }, [keyOf, store, transport]);
  const send = useCallback(async (employeeId: string) => { const key = keyOf(employeeId); if (key) await sendFlow(event => store.apply(key, event), transport); }, [keyOf, store, transport]);
  /** One command per person, one after another: each keeps its own id and its own result. */
  const sendMany = useCallback(async (employeeIds: string[]) => { for (const employeeId of employeeIds) await send(employeeId); }, [send]);
  const recheck = useCallback((employeeId: string) => { const key = keyOf(employeeId); if (key) store.apply(key, {type: 'recheck'}); }, [keyOf, store]);

  return useMemo(() => {
    const state = (employeeId: string) => { const key = keys.get(employeeId); return key ? store.get(key) : undefined; };
    const eligible = authority ? targets.filter(target => canSend(state(target.employeeId))) : [];
    return {state, targets, offline, eligible, want, recheck, send, sendMany, lookup};
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the store's content; `content` is the targets'.
  }, [version, content, keys, store, offline, want, recheck, send, sendMany, lookup]);
}
