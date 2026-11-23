import { expect, it } from '@rstest/core';
import { ROUTE_TITLES } from './route-titles';

it('has a Spanish tab title for every English one', () => {
  expect(Object.keys(ROUTE_TITLES.es).sort()).toEqual(Object.keys(ROUTE_TITLES.en).sort());
  expect(ROUTE_TITLES.en.schedule).toBe('Schedule');
  expect(ROUTE_TITLES.es.schedule).toBe('Horario');
});
