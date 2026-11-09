import {expect, it} from 'vitest';
import {finderMatches, finderStatus} from './command-finder';

it('status precedence: offline, then unavailable, then loading, then "No matches." only once people loaded', () => {
  expect(finderStatus('offline', 'maria', 0)).toBe('People and places unavailable offline');
  expect(finderStatus('unavailable', 'maria', 0)).toBe('People and places are unavailable right now.');
  expect(finderStatus('unavailable', 'sched', 3)).toBe('People and places are unavailable right now.');
  expect(finderStatus('loading', 'maria', 0)).toBe('Loading people and places…');
  expect(finderStatus('ready', 'maria', 0)).toBe('No matches.');
  expect(finderStatus('ready', '  ', 0)).toBe('');
  expect(finderStatus('ready', 'maria', 2)).toBe('');
  expect(finderStatus('idle', 'maria', 0)).toBe('');
});

it('a query the finder could not check against people never reads "No matches."', () => {
  for (const state of ['offline', 'unavailable', 'loading', 'idle'] as const) expect(finderStatus(state, 'Someone Unknown', 0)).not.toBe('No matches.');
});

// Upscale S1: the typed letters are set in 600 where the finder matched them.
it('marks where the query matched, preferring the start of a word', () => {
  expect(finderMatches('Marco Silva', 'mar')).toEqual([[0, 3]]);
  expect(finderMatches('Marco Silva', 'sil')).toEqual([[6, 9]]);
  // "ar" appears mid-word only: the first occurrence.
  expect(finderMatches('Marco Silva', 'ar')).toEqual([[1, 3]]);
  // A word start wins over an earlier mid-word occurrence.
  expect(finderMatches('Time off requests', 're')).toEqual([[9, 11]]);
  expect(finderMatches('Add shift', '  ADD ')).toEqual([[0, 3]]);
  // Several typed words mark each word they start.
  expect(finderMatches('Approve time off', 'appr off')).toEqual([[0, 4], [13, 16]]);
});

it('marks nothing for an empty query or a keyword-only match', () => {
  expect(finderMatches('Schedule', '')).toEqual([]);
  expect(finderMatches('Schedule', '   ')).toEqual([]);
  expect(finderMatches('Timecards', 'payroll')).toEqual([]);
});
