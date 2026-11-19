import {buildCommand, frozen, initialReminder, reduceReminder, type ReminderEvent, type ReminderState, type ReminderTarget} from './machine';

/* Reminders (U10): where the machines live. Operational pages are disposable: the app clears and redraws them when
 * the window loses focus or the page's short lifetime ends, and a component's own state would go with them. A
 * command that is out, or whose result is not confirmed, must outlive that, with its original id (the same rule as
 * the Updates recovery, which "lives above disposable private content"). So the machines are kept here, for this tab
 * and this session's authority only: nothing is written to storage and a new sign-in starts empty. */

export type ReminderStoreCore = {
  get: (key: string) => ReminderState | undefined;
  apply: (key: string, event: ReminderEvent) => ReminderState | undefined;
  /** A page shows these people now: keep what is frozen, read everything else again. Returns each person's key. */
  adopt: (targets: ReminderTarget[], authority: string, mintId: () => string) => Map<string, string>;
  /** A page stopped showing these people: forget what can be read again, keep what must not be lost. */
  release: (keys: Iterable<string>) => void;
  subscribe: (listener: () => void) => () => void;
  version: () => number;
  /** Something outside the machines changed (a read finished): wake the pages. */
  touch: () => void;
  reading: Set<string>;
};

/** One reminder: this session, this source (the week or the update, whatever its deadline or revision), this person. */
export function reminderKey(authority: string, target: ReminderTarget) {
  return [authority, target.source.kind, target.source.kind === 'AVAILABILITY' ? target.source.weekStart : target.source.communicationId, target.employeeId].join('|');
}

export function createReminderStore(): ReminderStoreCore {
  const states = new Map<string, ReminderState>(), listeners = new Set<() => void>();
  let version = 0;
  const emit = () => { version += 1; for (const listener of [...listeners]) listener(); };
  const put = (key: string, next: ReminderState) => { if (states.get(key) === next) return false; states.set(key, next); return true; };
  return {
    reading: new Set<string>(),
    get: key => states.get(key),
    version: () => version,
    touch: emit,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    apply(key, event) {
      const current = states.get(key);
      if (!current) return undefined;
      const next = reduceReminder(current, event);
      if (put(key, next)) emit();
      return next;
    },
    adopt(targets, authority, mintId) {
      const keys = new Map<string, string>();
      let changed = false;
      for (const target of targets) {
        const key = reminderKey(authority, target), current = states.get(key);
        keys.set(target.employeeId, key);
        if (!current) { changed = put(key, initialReminder(buildCommand(target, authority, mintId()))) || changed; continue; }
        if (frozen(current)) continue;
        // Not out and not uncertain: take the page's current source (a new id only if it changed) and read again.
        const sourced = reduceReminder(current, {type: 'source', command: buildCommand(target, authority, mintId())});
        changed = put(key, reduceReminder(sourced, {type: 'recheck'})) || changed;
      }
      if (changed) emit();
      return keys;
    },
    release(keys) {
      let changed = false;
      for (const key of keys) { const current = states.get(key); if (current && !frozen(current)) changed = states.delete(key) || changed; }
      if (changed) emit();
    },
  };
}

/** This tab's reminders. */
export const reminderStore = createReminderStore();
