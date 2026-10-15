import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { EmployeeDirectory } from "@/components/employee-directory";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { filterDirectoryEmployees, readDirectoryFilters, type DirectorySearchParams } from "@/lib/employee-directory";

export default async function EmployeesPage({ searchParams }: {
  searchParams?: Promise<DirectorySearchParams>;
} = {}) {
  await requireRoles(MANAGER_ROLES);
  const params=await(searchParams??Promise.resolve({}));
  const source=await withOperationalCompany(await requireSessionMutationProof(),()=>Promise.all([
    listEmployees(),
    listLocations({ includeInactive: true }),
  ]));
  if(source.state==='unavailable')return <OperationalUnavailable title="Employees unavailable" reason={source.reason}/>;
  const [employees,locations]=source.data;
  const filters = readDirectoryFilters(params, locations);
  return <ScopedReadFrame observation={source}><EmployeeDirectory employees={employees} locations={locations} filters={filters}
    visibleEmployees={filterDirectoryEmployees(employees, filters)} /></ScopedReadFrame>;
}
