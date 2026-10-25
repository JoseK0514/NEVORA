import { expect, it } from 'vitest';
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

it('UX-E-03: says once which location’s schedule isn’t out yet', async () => {
  const { notOutYetNote } = await import('./publication-note');
  expect(notOutYetNote(['West Office'])).toBe('West Office’s schedule isn’t out yet.');
  expect(notOutYetNote(['West Office', 'East Office', 'West Office'])).toBe('West Office and East Office schedules aren’t out yet.');
  expect(notOutYetNote([' '])).toBe('Another location’s schedule isn’t out yet.');
});
