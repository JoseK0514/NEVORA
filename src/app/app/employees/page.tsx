import {readOperationalDirectory} from '@/lib/company-access/operational-read.server';
import {ScopedEmployeeDirectory} from '@/components/company-access/scoped-operational-views';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { EmployeeDirectory } from "@/components/employee-directory";
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
  if(source.data.mode==='LOCATIONS')return <ScopedEmployeeDirectory data={source.data} observation={source}/>;
  const {employees,locations}=source.data;
  const filters = readDirectoryFilters(params, locations);
  // Quiet (v4): each person's detail line names their positions; a failed read falls back to the role.
  const positions = await listPositions({ includeInactive: true }).catch(() => []);
  return <ScopedReadFrame observation={source}><EmployeeDirectory clockerRecovery={actor.role==='OWNER'} positions={positions} words={wordPreset((await currentPresentation()).words).en} employees={employees} locations={locations} filters={filters}
    visibleEmployees={filterDirectoryEmployees(employees, filters)} /></ScopedReadFrame>;
}
