// The tablet setup link (Phase 6, JR-26): the code rides in the fragment, never in the query string.
import {describe, expect, it} from '@rstest/core';
import {isSetupCode, setupCodeFromHash, setupLink} from './clocker-setup-link';

const raw = `nev_enr_${'ab'.repeat(32)}`;
const sealed = `nw1_v1.${'A'.repeat(16)}.${'b_-9'.repeat(12)}.${'C'.repeat(22)}`;

describe('setup link', () => {
  it('accepts the two shapes a setup code has and nothing else', () => {
    expect(isSetupCode(raw)).toBe(true); expect(isSetupCode(sealed)).toBe(true);
    for (const bad of ['', 'nev_enr_short', `${raw}0`, raw.toUpperCase(), '1234', `nw1_v1.${'A'.repeat(15)}.x.${'C'.repeat(22)}`, `${sealed} `, `nev_enr_${'zz'.repeat(32)}`]) expect(isSetupCode(bad), bad).toBe(false);
    expect(isSetupCode(`nw1_v1.${'A'.repeat(16)}.${'b'.repeat(5000)}.${'C'.repeat(22)}`)).toBe(false);
  });
  it('puts the code in the fragment of the location’s kiosk address, with no query string', () => {
    for (const code of [raw, sealed]) {
      const link = new URL(setupLink('https://work.example.test', 'calle-loiza', code));
      expect(link.origin + link.pathname).toBe('https://work.example.test/clocker/calle-loiza');
      expect(link.search).toBe('');
      expect(link.hash).toBe(`#setup=${code}`);
      // What a browser sends to the server (and a Referer header carries) has no code in it.
      expect(link.href.split('#')[0]).not.toContain(code);
    }
    expect(setupLink('https://work.example.test', 'a b/c', raw)).toContain('/clocker/a%20b%2Fc#setup=');
  });
  it('reads a complete code back out of the fragment and nothing from any other fragment', () => {
    for (const code of [raw, sealed]) expect(setupCodeFromHash(new URL(setupLink('https://x.test', 'k', code)).hash)).toBe(code);
    expect(setupCodeFromHash('')).toBeNull(); expect(setupCodeFromHash('#clocker-task')).toBeNull(); expect(setupCodeFromHash(`#code=${raw}`)).toBeNull();
    // A setup link whose code is cut short or broken is a setup link with no usable code.
    expect(setupCodeFromHash('#setup=')).toBe(''); expect(setupCodeFromHash('#setup=nev_enr_abc')).toBe(''); expect(setupCodeFromHash('#setup=%E0%A4%A')).toBe('');
    expect(setupCodeFromHash(`#setup=${encodeURIComponent(` ${raw} `)}`)).toBe(raw);
  });
});
