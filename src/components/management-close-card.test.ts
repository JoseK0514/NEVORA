import {MANAGEMENT_CLOSE_COPY} from './management-close-copy';
import {describe,expect,test} from '@rstest/core';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// Jose (Nov 23, 2026, "not B2 compliant"): the open "Close open punch" form in the Timecards sheet is a kit card.
const root=process.cwd();
const tsx=readFileSync(join(root,'src/components/management-close-form.tsx'),'utf8');
const css=readFileSync(join(root,'src/components/management-close-form.module.css'),'utf8');
const sheet=readFileSync(join(root,'src/app/app/owner-b-time-pay.css'),'utf8');
const card=tsx.slice(tsx.indexOf('<CorpCard'));

describe('Close open punch card',()=>{
  test('the open form is a kit card with its heading, not a loose section',()=>{
    expect(card).toContain("label={attempt?T.confirmOriginal:T.closeOpenPunch}");
    expect(tsx).not.toContain('<h3>');
    expect(tsx).not.toContain('aria-label="Close open punch"');
    expect(card.indexOf('<CorpBody>')).toBeGreaterThan(-1);
  });
  test('the buttons sit inside the card body, on its inset: Cancel first, the decision last',()=>{
    const body=card.slice(card.indexOf('<CorpBody>'),card.indexOf('</CorpBody>'));
    const actions=body.slice(body.indexOf('styles.actions'));
    expect(actions.indexOf('T.cancel')).toBeLessThan(actions.indexOf('T.recordClose'));
    expect(actions).toContain('className="c-btn c-btn--secondary"');
    expect(actions).toMatch(/type="submit" form=\{fieldId\+'-form'\} className="c-btn"/);
    expect(body).toContain('className={`c-link ${styles.refresh}`}');
  });
  test('the facts are left-aligned card text, not the sheet\'s centred note',()=>{
    expect(card).not.toContain('c-tc-sheet__note');
    expect(css).toMatch(/\.facts \{[^}]*text-align:start/);
  });
  test('at 390 the fields stay inside the card and the check row wraps',()=>{
    expect(css).toMatch(/\.body,\.form,\.fields \{[^}]*grid-template-columns:minmax\(0,1fr\)/);
    expect(css).toMatch(/\.body \{white-space:normal;\}/);
    expect(css).toMatch(/\.confirmation span \{[^}]*overflow-wrap:anywhere/);
  });
  test('with 200% text the labels, fields and refresh link scale (rem, same default size)',()=>{
    expect(sheet).toMatch(/\.c-tc-close \.c-field__label[^{]*\{ font-size: 0\.8125rem !important;/);
    expect(sheet).toMatch(/\.c-tc-close \.c-in[^{]*\{ font-size: 1rem !important;/);
    expect(sheet).toMatch(/\.c-tc-close > \.c-link[^{]*\{ font-size: 0\.8125rem !important;/);
  });
  test('the English words are unchanged',()=>{
    const en=MANAGEMENT_CLOSE_COPY.en;
    const rendered = [...Object.values(en), en.started('A','B','DATE'), en.endTime('ZONE')].join('\n');
    for(const words of ['Close open punch','Confirm original close','Started DATE','The open break ends at the same selected time.','Confirmed end time (ZONE)','Reason for closing','I verified this end time and reason.','Record close','Refresh current punch','Cancel close','Retry same close','This punch is already closed.','Current punch information is unavailable.'])
      expect(rendered).toContain(words);
  });
});

test('gives the Spanish delegated attestation a full target around the checkbox', () => {
  expect(css).toMatch(/:global\(\.c-dcorr\):lang\(es\) \.confirmation input \{[^}]*position: relative;[^}]*z-index: 1;/);
  expect(css).toMatch(/:global\(\.c-dcorr\):lang\(es\) \.confirmation::before \{[^}]*width: 44px;[^}]*height: 44px;/);
});
