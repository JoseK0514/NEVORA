import { expect, it } from '@rstest/core';
import { ACTION_CENTER_NAVIGATION_COPY } from './action-center-navigation';
import { employeeRequestsCorpCopy } from './employee-requests-corp-copy';
import { LEAVE_STAFFING_COPY } from './leave-staffing/leave-staffing-copy';
import { MANAGER_INBOX_COPY } from './manager-inbox-copy';
import { managerTimeOffCopy } from './manager-time-off-copy';
import { shiftChangeFormStateCopy } from './shift-change-form-state-copy';
import { TIME_COPY } from './time-copy';
import { planningFrameCopy } from './employee-mobile/copy/planning-frame';
import { planningFeedbackCopy } from './employee-mobile/copy/planning-feedback';
import { planningCopy } from './employee-mobile/copy/planning';
import { requestStatusCopy } from './employee-mobile/copy/request-status';
import { requestsCopy } from './employee-mobile/copy/requests';
import { timeoffCopy } from './employee-mobile/copy/timeoff';
import { timeoffPartsCopy } from './employee-mobile/copy/timeoff-parts';
import { REQUESTS_COPY as routeCopy } from '@/app/app/requests/requests-copy';
import { REQUESTS_COPY as employeeBCopy } from './employee-b/requests-copy';

const copies = {
  'Action center link labels': ACTION_CENTER_NAVIGATION_COPY,
  'Desktop Employee Requests': employeeRequestsCorpCopy,
  'Staffing checks': LEAVE_STAFFING_COPY,
  'Manager Inbox': MANAGER_INBOX_COPY,
  'Manager Time Off': managerTimeOffCopy,
  'Shift change feedback': shiftChangeFormStateCopy,
  'Time Off decision and withdrawal': TIME_COPY,
  'Planning loading state': planningCopy,
  'Planning frame': planningFrameCopy,
  'Planning submission feedback': planningFeedbackCopy,
  'Phone request status': requestStatusCopy,
  'Phone Requests': requestsCopy,
  'Phone Time Off': timeoffCopy,
  'Time Off request details': timeoffPartsCopy,
  'Time Off and Requests Hub routes': routeCopy,
  'Direction B Requests': employeeBCopy,
};

function leaves(value: object, path = ''): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, leaf]) => {
    const name = path ? `${path}.${key}` : key;
    return leaf && typeof leaf === 'object' ? Object.entries(leaves(leaf, name)) : [[name, leaf]];
  }));
}

const placeholders = (text: string) => new Set(Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]));

for (const [name, copy] of Object.entries(copies)) {
  it(`${name} has matching copy keys and placeholders`, () => {
    const en = leaves(copy.en);
    const es = leaves(copy.es);
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(es)) {
      const source = en[key];
      expect(typeof value, key).toBe(typeof source);
      if (typeof value === 'string' && typeof source === 'string') {
        expect(value.trim(), key).not.toBe('');
        expect(placeholders(value), key).toEqual(placeholders(source));
      }
    }
  });
}
