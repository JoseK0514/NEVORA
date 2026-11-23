import { describe, expect, it } from '@rstest/core';
import { MANAGER_INBOX_COPY } from './manager-inbox-copy';

/** Every key path of a copy table (functions are leaves). */
const keys = (value: unknown, path = ''): string[] => value && typeof value === 'object'
  ? Object.entries(value).flatMap(([key, item]) => keys(item, path ? `${path}.${key}` : key)) : [path];

describe('Things to do copy', () => {
  it('has the same keys in English and Spanish', () => {
    expect(keys(MANAGER_INBOX_COPY.es).sort()).toEqual(keys(MANAGER_INBOX_COPY.en).sort());
  });
  it('keeps English as it was and speaks Spanish with tú', () => {
    const { en, es } = MANAGER_INBOX_COPY;
    expect(en.needs('1')).toBe('Needs 1 person');
    expect(en.thingsToDo(2)).toBe('2 things to do today.');
    expect(en.timecards(1, 3)).toBe('1 of 3 timecards');
    expect(es.needs('2')).toBe('Faltan 2 personas');
    expect(es.approveFrom('lun, 16 nov')).toBe('Puedes aprobarlas desde el lun, 16 nov.');
    expect(Object.values(es.status).join(' ')).not.toMatch(/\busted\b/i);
  });
});
