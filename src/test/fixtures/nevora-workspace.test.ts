import { expect, it } from 'vitest';
import { createNorthsideFixture, createOneLocationFixture, createFiveLocationFixture, createTwentyLocationFixture } from './nevora-workspace';
it('supports unrelated customer catalogs at one, five and twenty locations', () => {
  for (const [factory, count] of [[createOneLocationFixture, 1], [createFiveLocationFixture, 5], [createTwentyLocationFixture, 20]] as const) {
    const fixture = factory();
    expect(fixture.locations).toHaveLength(count);
    expect(new Set(fixture.locations.map(location => location.clockerKey)).size).toBe(count);
    expect(fixture.workspace.timeZone).toBe('America/New_York');
  }
  const fixture = createNorthsideFixture();
  expect(fixture.locations[2].active).toBe(false);
  expect(fixture.locations[1].name.length).toBeGreaterThan(48);
  expect(fixture.employees[0].positionIds).toHaveLength(2);
});
