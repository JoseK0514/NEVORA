import type { Employee, Location, Position, Workspace } from '@/lib/domain';

const timestamps = { createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
/** Explicit fictional customer data, never production configuration defaults. */
export const fuelWorkspace: Workspace = { id: 'workspace-fuel', name: 'Fuel Coffee Drive', timeZone: 'America/Puerto_Rico', active: true, ...timestamps };
export const northsideWorkspace: Workspace = { id: 'workspace-northside', name: 'Northside Services', timeZone: 'America/New_York', active: true, ...timestamps };
export function createNorthsideFixture(locationCount: 1 | 3 | 5 | 20 = 3): { workspace: Workspace; locations: Location[]; positions: Position[]; employees: Employee[] } {
  const workspace = { ...northsideWorkspace };
  const names = ['Main Office', 'West Branch — Customer Services and Operations Center', 'Warehouse'];
  const locations = Array.from({ length: locationCount }, (_, i): Location => ({
    id: `northside-location-${i + 1}`, workspaceId: workspace.id, clockerKey: ['main-office', 'west-branch', 'warehouse'][i] ?? `branch-${i + 1}`,
    name: names[i] ?? `Northside Branch ${i + 1}`, shortName: ['Main Office', 'West Branch', 'Warehouse'][i] ?? `Branch ${i + 1}`, active: i !== 2,
  }));
  const positions = ['Customer Support', 'Operations'].map((name, i): Position => ({ id: `northside-position-${i + 1}`, workspaceId: workspace.id, name, active: true, ...timestamps }));
  const employees: Employee[] = [{ id: 'northside-fictional-employee', firstName: 'Avery', lastName: 'Example', phone: '555-0100', role: 'LEAD', primaryLocationId: locations[0].id, eligibleLocationIds: [locations[0].id], positionIds: positions.map(position => position.id), active: true }];
  return { workspace, locations, positions, employees };
}
export const createOneLocationFixture = () => createNorthsideFixture(1);
export const createFiveLocationFixture = () => createNorthsideFixture(5);
export const createTwentyLocationFixture = () => createNorthsideFixture(20);
