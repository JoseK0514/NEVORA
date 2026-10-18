import {expect, it} from 'vitest';
import {finderStatus} from './command-finder';

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
