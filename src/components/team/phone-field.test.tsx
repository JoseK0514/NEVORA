// Dev integration B2/B3 (Nov 23, 2026): Edit person keeps an untouched old-format phone. The stored value saves unchanged
// (no pattern), a number someone types must match (787) 555-0123, and an empty field is still required.
// ("787.555.0101" parses, so it shows as (787) 555-0101; a legacy value is one that no longer parses.)
import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { PhoneField } from './team-forms';

const field = (defaultValue: string) => renderToStaticMarkup(<PhoneField id="p" name="phone" defaultValue={defaultValue} required preserveLegacy />);

describe('PhoneField with preserveLegacy', () => {
  it('an untouched legacy phone that no longer parses ("555-0101") keeps its value, with no pattern', () => {
    const html = field('555-0101');
    expect(html).toContain('value="555-0101"');
    expect(html).not.toContain('pattern=');
  });
  it('an old dotted 10-digit phone ("787.555.0101") is shown in the current format and keeps the pattern', () => {
    const html = field('787.555.0101');
    expect(html).toContain('value="(787) 555-0101"');
    expect(html).toContain('pattern=');
  });
  it('a current-format phone keeps the (787) 555-0123 pattern', () => {
    const html = field('(787) 555-0123');
    expect(html).toContain('pattern="\\(\\d{3}\\) \\d{3}-\\d{4}"');
    expect(html).toContain('required');
  });
  it('an empty field is still required and keeps the pattern', () => {
    const html = field('');
    expect(html).toContain('required');
    expect(html).toContain('pattern=');
  });
});
