import {scopedObservation} from '@/lib/company-access/observation';
import {readOperationalDirectory} from '@/lib/company-access/operational-read.server';
import {ScopedTeam} from '@/components/company-access/scoped-team';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { EmployeeDirectory } from "@/components/employee-directory";
import {readWorkspaceRoutingConfig} from '@/lib/workspace-routing/config.server';
/** The import page answers "not available" unless company workspaces are routed (the roster routes read the same
 * configuration first), so Team offers the link only where the page can work. */
function rosterImportAvailable(){try{readWorkspaceRoutingConfig();return true;}catch{return false;}}
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { filterDirectoryEmployees, readDirectoryFilters, type DirectorySearchParams } from "@/lib/employee-directory";
import { listPositions } from "@/lib/data/positions";

export const metadata = { title: "Team" };

export default async function EmployeesPage({ searchParams }: {
  searchParams?: Promise<DirectorySearchParams>;
} = {}) {
  const actor=await requireRoles(MANAGER_ROLES);
  const params=await(searchParams??Promise.resolve({}));
  const source=await readOperationalDirectory(await requireSessionMutationProof());
  if(source.state==='unavailable')return <OperationalUnavailable title="Employees unavailable" reason={source.reason}/>;
  // Phase 2 (Nov 22, 2026): a location Manager's Team is the company Manager's Team with the scoped read's people. The
  // search and the place filter only choose among those people; the place must be one of the Manager's own.
  if(source.data.mode==='LOCATIONS'){
    const search=params as DirectorySearchParams,one=(value:string|string[]|undefined)=>typeof value==='string'?value:'';
    const location=one(search.location),place=source.data.locations.length>1?source.data.locations.find(item=>item.id===location)?.id:undefined;
    return <ScopedReadFrame observation={scopedObservation(source)}><ScopedTeam data={source.data} query={one(search.q).trim().slice(0,128)} locationId={place}
      showAll={one(search.all)==='1'} words={wordPreset((await currentPresentation()).words).en}/></ScopedReadFrame>;
  }
  const {employees,locations}=source.data;
  const filters = readDirectoryFilters(params, locations);
  // Position names drive both the detail line and search. A failed source must
  // not become an empty catalogue and silently substitute access roles.
  let positions: Awaited<ReturnType<typeof listPositions>>;
  try { positions = await listPositions({ includeInactive: true }); }
  catch { return <OperationalUnavailable title="Employees unavailable" reason="read_failed"/>; }
  return <ScopedReadFrame observation={scopedObservation(source)}><EmployeeDirectory clockerRecovery={actor.role==='OWNER'} canImport={actor.role==='OWNER'&&rosterImportAvailable()} positions={positions} words={wordPreset((await currentPresentation()).words).en} employees={employees} locations={locations} filters={filters}
    visibleEmployees={filterDirectoryEmployees(employees, filters, new Map(positions.map(position => [position.id, position.name])))} showAll={(params as DirectorySearchParams).all === '1'} /></ScopedReadFrame>;
}
