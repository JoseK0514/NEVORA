import {expect, it} from '@rstest/core';
import {copy} from './central-page-copy';

it('matches every billing metadata key and placeholder in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  for (const key of Object.keys(copy.en) as (keyof typeof copy.en)[]) {
    expect(copy.es[key].match(/\{\w+\}/g) ?? []).toEqual(copy.en[key].match(/\{\w+\}/g) ?? []);
  }
});
