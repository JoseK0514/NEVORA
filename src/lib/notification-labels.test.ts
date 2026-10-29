import {expect,it} from 'vitest';
import {NOTIFICATION_KINDS,NOTIFICATION_LABELS,notificationKind} from './notification-labels';

it('maps each row label back to exactly its kind, and nothing else',()=>{
 for(const kind of NOTIFICATION_KINDS)expect(notificationKind(NOTIFICATION_LABELS[kind])).toBe(kind);
 expect(new Set(Object.values(NOTIFICATION_LABELS)).size).toBe(NOTIFICATION_KINDS.length);
 // Near-misses are not guessed from words in the label.
 for(const label of ['Schedule','Your schedule update','Pay statement','team update'])expect(notificationKind(label)).toBeNull();
});
