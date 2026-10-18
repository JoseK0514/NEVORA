import { expect, it } from 'vitest';
import { joinNames, unpublishedNote } from './publication-note';

it('names what is final and who has not published yet', () => {
  expect(unpublishedNote(['North Office'], ['Main Office'])).toBe('Your Main Office shifts are final. North Office hasn’t published this week yet.');
  expect(unpublishedNote(['North Office', 'Harbor'], ['Main Office'])).toBe('Your Main Office shifts are final. North Office and Harbor haven’t published this week yet.');
  expect(unpublishedNote(['North Office'])).toBe('North Office hasn’t published this week yet. Shifts shown are final.');
  expect(unpublishedNote([], ['Main Office'])).toBe('Your Main Office shifts are final. Another location you work at hasn’t published this week yet.');
});

it('joins names plainly and drops repeats and blanks', () => {
  expect(joinNames(['A', 'B', 'C', 'A', ' '])).toBe('A, B and C');
  expect(joinNames([])).toBe('');
});
