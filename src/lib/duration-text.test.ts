import {describe, expect, it} from 'vitest';
import {durationText} from './duration-text';

describe('durationText', () => {
  it('writes durations the kit way', () => {
    expect(durationText(0)).toBe('0h');
    expect(durationText(37)).toBe('37m');
    expect(durationText(480)).toBe('8h');
    expect(durationText(510)).toBe('8h 30m');
    expect(durationText(-5)).toBe('0h');
  });
});
