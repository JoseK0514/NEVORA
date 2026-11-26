import { describe, expect, it } from '@rstest/core';
import { accountDeletionCopy } from '@/app/app/account/delete/page-copy';
import { PROFILE_COPY } from '@/app/app/profile/profile-copy';
import { calendarFeedbackCopy } from '@/lib/calendar/client-copy';
import { POLICY_FACTS } from '@/lib/legal/policies';
import { passkeysFeedbackCopy } from '@/lib/passkeys/management-copy';
import { profileCopy as managerCopy, profilePrivacyCopy, topicCopy } from '../manager-profile/profile-copy';
import { calendarCopy } from './calendar-copy';
import { deletionCopy } from './deletion-copy';
import { deviceAlertsCopy } from './device-alerts-copy';
import { deviceFeedback, deviceFeedbackCopy } from './device-feedback-copy';
import { passkeysCopy } from './passkeys-copy';
import { profileCopy } from './profile-copy';
import { profileViewCopy } from './profile-view-copy';

type Copy = { [key: string]: string | Copy };

const placeholders = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), match => match[1]).sort();

function verifyCopy(en: Copy, es: Copy) {
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const [key, value] of Object.entries(es)) {
    const english = en[key];
    if (typeof value === 'string' && typeof english === 'string') {
      expect(placeholders(value).filter(name => !placeholders(english).includes(name))).toEqual([]);
    } else if (typeof english === 'object' && typeof value === 'object') {
      verifyCopy(english, value);
    } else {
      throw new Error(`Copy type mismatch for ${key}`);
    }
  }
}

describe('Profile and Account bilingual copy', () => {
  it.each([
    ['profile route', PROFILE_COPY],
    ['account deletion route', accountDeletionCopy],
    ['employee profile', profileCopy],
    ['employee profile details', profileViewCopy],
    ['employee calendar', calendarCopy],
    ['calendar feedback', calendarFeedbackCopy],
    ['device alerts', deviceAlertsCopy],
    ['device alerts feedback', deviceFeedbackCopy],
    ['account deletion form', deletionCopy],
    ['passkeys', passkeysCopy],
    ['passkey feedback', passkeysFeedbackCopy],
  ] as const)('%s preserves all keys and uses matching placeholders', (_name, { en, es }) => {
    verifyCopy(en, es);
  });

  it('keeps both approved short actions paired with their full account labels', () => {
    expect([passkeysCopy.es.addShort, passkeysCopy.es.add]).toEqual(['Añadir llave', 'Añadir llave de acceso']);
    expect([deletionCopy.es.deleteMineShort, deletionCopy.es.deleteMine]).toEqual(['Eliminar cuenta', 'Eliminar mi cuenta']);
  });

  it('management profile preserves all keys and uses matching placeholders', () => {
    for (const table of [managerCopy, profilePrivacyCopy, topicCopy]) verifyCopy(table.en, table.es);
  });

  it('keeps the signed-in deletion period aligned with the published policy source', () => {
    expect(accountDeletionCopy.en.period).toBe(POLICY_FACTS.DELETION_COMPLETION_PERIOD);
  });

  it('translates device feedback without rewording English or unknown responses', () => {
    const { en, es } = deviceFeedbackCopy;
    expect(deviceFeedback(en.enabled, 'en')).toBe(en.enabled);
    expect(deviceFeedback(en.enabled, 'es')).toBe(es.enabled);
    expect(deviceFeedback('Unknown device response.', 'es')).toBe('Unknown device response.');
    expect(deviceFeedback(deviceAlertsCopy.en.turnOffPending + en.reminder, 'es')).toBe(deviceAlertsCopy.es.turnOffPending + es.reminder);
  });
});
