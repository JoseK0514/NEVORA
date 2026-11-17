import {describe, expect, it} from 'vitest';
import {reviewCopy, type ReviewCopy} from './copy';

/* Phase 4 package D: the signed-in app renders English today, so the Spanish copy is proven here: every key exists in
 * both languages, no Spanish entry is empty or left in English, and the sentences follow the copy rules. */
const en = reviewCopy('en'), es = reviewCopy('es');
/** Every entry rendered: plain strings as they are, functions with representative arguments (one and many). */
function rendered(copy: ReviewCopy): Record<string, string[]> {
  return Object.fromEntries(Object.entries(copy).map(([key, value]) => {
    if (typeof value === 'string') return [key, [value]];
    const call = value as (...args: never[]) => string;
    const args: unknown[][] = key === 'coverSeenValue' ? [[1, 3]] : key === 'dayRecorded' ? [['Mon, Sep 21', '8 h']] : key === 'fullyStaffedValue' ? [[25]]
      : ['toApprove', 'toReview', 'needYou'].includes(key) ? [[1, true], [2, true], [1, false], [3, false]]
      : ['shiftOf', 'pickedUpBy', 'waitingFor'].includes(key) ? [['Ana'], ['Carlos']] : ['endsOn', 'lateBy', 'dayScheduled'].includes(key) ? [['12 min']] : [[1], [2]];
    return [key, args.map(list => (call as (...a: unknown[]) => string)(...list))];
  }));
}
const all = {en: rendered(en), es: rendered(es)};

describe('review details copy', () => {
  it('has the same keys in English and Spanish, none empty', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const lang of ['en', 'es'] as const) for (const [key, lines] of Object.entries(all[lang])) for (const line of lines) expect(line.trim(), `${lang}.${key}`).not.toBe('');
  });
  it('leaves no English sentence in the Spanish copy', () => {
    for (const [key, lines] of Object.entries(all.es)) lines.forEach((line, index) => {
      expect(line, `es.${key}`).not.toBe(all.en[key][index]);
      expect(line, `es.${key}`).not.toMatch(/\b(the|another|reviewer|approves?|timecards?|shift|could|checked|nobody|picked|waiting|withdrawn|expired|known|cover|scheduled|recorded|staffing|published|schedule|least|things?|needs?|you|this|not)\b/i);
    });
  });
  it('follows the copy rules in both languages: no em dashes, no exclamation marks, no filler or system words', () => {
    for (const lang of ['en', 'es'] as const) for (const [key, lines] of Object.entries(all[lang])) for (const line of lines) {
      expect(line, `${lang}.${key}`).not.toMatch(/[—!¡]/);
      expect(line, `${lang}.${key}`).not.toMatch(/\b(simply|just|seamlessly|successfully|oops|payload|entity|resource|operation id)\b/i);
      expect(line, `${lang}.${key}`).not.toMatch(/[A-Z]{2,}_[A-Z_]+/);
    }
  });
  it('keeps Jose’s fixed words and never promises more than the facts carry', () => {
    expect(en.lateBy('12 min')).toBe('Clocked in late · 12 min');
    expect(en.otherReviewer).toBe('Another reviewer approves this one');
    // No reviewer is assigned and no deadline exists in the read: no sentence names a person or a date.
    for (const line of [en.otherReviewer, en.reviewerNeeded, en.otherReviewerYours, en.otherReviewerCount(2), es.otherReviewer, es.reviewerNeeded]) expect(line).not.toMatch(/\d{4}|by (Mon|Tue|Wed|Thu|Fri)|antes del/);
    // Counts that are lower bounds say so.
    expect(en.toApprove(2, false)).toMatch(/^At least 2/); expect(es.toApprove(2, false)).toMatch(/^Al menos 2/);
    expect(en.needYou(1, true)).toBe('1\u00a0thing needs you'); expect(en.needYou(3, false)).toBe('At least 3\u00a0things need you');
    // Coverage labels say what they measure and what they are not.
    for (const line of [en.staffingExplain, en.fullyStaffedExplain, en.scheduledExplain]) expect(line).toMatch(/not pay/);
    for (const line of [es.staffingExplain, es.fullyStaffedExplain, es.scheduledExplain]) expect(line).toMatch(/ni paga/);
  });
});
