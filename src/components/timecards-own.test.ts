import {describe, expect, it} from 'vitest';
import {ownApprover} from './timecards-own';

describe('who approves the viewer’s own timecard (MG-004)', () => {
  it('names the Owner for a Manager, first name on the row and full name in the card', () => {
    expect(ownApprover(false, ['Jose Natal'])).toEqual({row: 'Jose approves this one', card: 'Jose Natal approves your timecard.'});
  });
  it('names at most two Owners', () => {
    expect(ownApprover(false, ['Jose Natal', 'Ana Colon', 'Luis Torres'])).toEqual({row: 'Jose or Ana approves this one', card: 'Jose Natal or Ana Colon approves your timecard.'});
  });
  it('falls back to "An Owner" when no name was read', () => {
    expect(ownApprover(false, [' ', ''])).toEqual({row: 'An Owner approves this one', card: 'An Owner approves your timecard.'});
  });
  it('keeps the sentence an Owner always had', () => {
    expect(ownApprover(true, ['Jose Natal']).card).toBe('Another manager approves your own timecard.');
  });
});
