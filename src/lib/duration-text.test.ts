import {describe, expect, it} from 'vitest';
import {durationText} from './duration-text';

describe('durationText', () => {
  it('writes durations the kit way', () => {
    expect(durationText(0)).toBe('0 h');
    expect(durationText(37)).toBe('37 min');
    expect(durationText(480)).toBe('8 h');
    expect(durationText(510)).toBe('8 h 30 min');
    expect(durationText(-5)).toBe('0 h');
  });
});
