import { describe, expect, it } from '@rstest/core';
import { joinNames, unpublishedNote } from './publication-note';

it('names what is final and who has not published yet', () => {
  expect(unpublishedNote(['North Office'], ['Main Office'])).toBe('Your Main Office shifts are published. North Office hasn’t published this week yet.');
  expect(unpublishedNote(['North Office', 'Harbor'], ['Main Office'])).toBe('Your Main Office shifts are published. North Office and Harbor haven’t published this week yet.');
  expect(unpublishedNote(['North Office'])).toBe('North Office hasn’t published this week yet. Shifts shown are published.');
  expect(unpublishedNote([], ['Main Office'])).toBe('Your Main Office shifts are published. Another location you work at hasn’t published this week yet.');
});

it('joins names plainly and drops repeats and blanks', () => {
  expect(joinNames(['A', 'B', 'C', 'A', ' '])).toBe('A, B and C');
  expect(joinNames([])).toBe('');
});

describe('homePublishedNames (EM-018)', () => {
  it('names the current and next shift locations as published, once each, never one still waiting', async () => {
    const {homePublishedNames, unpublishedNote} = await import('./publication-note');
    const main = {locationLabel: 'Main Office'}, west = {locationLabel: 'West Office'};
    expect(homePublishedNames([main, main], ['West Office'])).toEqual(['Main Office']);
    expect(homePublishedNames([west], ['West Office'])).toEqual([]);
    expect(homePublishedNames([null, undefined])).toEqual([]);
    // Home now reads exactly as Schedule does when it can name a published location, and falls back otherwise.
    expect(unpublishedNote(['West Office'], homePublishedNames([null, main], ['West Office']))).toBe('Your Main Office shifts are published. West Office hasn’t published this week yet.');
    expect(unpublishedNote(['West Office'], homePublishedNames([null, null], ['West Office']))).toBe('West Office hasn’t published this week yet. Shifts shown are published.');
  });
});
