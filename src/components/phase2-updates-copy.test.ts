import {expect,it} from '@rstest/core';
import {messagesCopy} from './employee-mobile/copy/messages';
import {messageSessionCopy} from './employee-mobile/copy/message-session';
import {messagesViewCopy} from './employee-mobile/copy/messages-view';
import {messagesComposeCopy} from './employee-mobile/copy/messages-compose';
import {notificationsListCopy} from './employee-mobile/copy/notifications-list';
import {INBOX_COPY} from './notification-inbox-copy';
import {MESSAGES_MANAGER_COPY} from './messages-manager-copy';
import {NOTIFICATION_TEXT_COPY} from '@/lib/notification-text-copy';

const tables = {
 messagesCopy, messageSessionCopy, messagesViewCopy, messagesComposeCopy, notificationsListCopy,
 INBOX_COPY, MESSAGES_MANAGER_COPY, NOTIFICATION_TEXT_COPY,
};

function entries(value: unknown, path = ''): [string, unknown][] {
 if (!value || typeof value !== 'object') return [[path, value]];
 return Object.entries(value).flatMap(([key, child]) => entries(child, path ? `${path}.${key}` : key));
}

const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

for (const [name, table] of Object.entries(tables)) {
 it(`${name} pairs the Spanish keys and placeholders with English`, () => {
  const en = new Map(entries(table.en)), es = new Map(entries(table.es));
  expect([...es.keys()].sort()).toEqual([...en.keys()].sort());
  for (const [key, value] of es) {
   const original = en.get(key);
   expect(typeof value).toBe(typeof original);
   if (typeof original === 'string' && typeof value === 'string') {
    expect(value.length).toBeGreaterThan(0);
    expect(placeholders(value)).toEqual(placeholders(original));
   }
  }
 });
}
