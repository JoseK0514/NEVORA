import { EmployeeDirectory } from "@/components/employee-directory";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { filterDirectoryEmployees, readDirectoryFilters, type DirectorySearchParams } from "@/lib/employee-directory";

export const metadata = { title: "Team" };

export default async function EmployeesPage({ searchParams }: {
  searchParams?: Promise<DirectorySearchParams>;
} = {}) {
  await requireRoles(MANAGER_ROLES);
  const [employees, locations, params] = await Promise.all([
    listEmployees(),
    listLocations({ includeInactive: true }),
    searchParams ?? Promise.resolve({}),
  ]);
  const filters = readDirectoryFilters(params, locations);
  return <EmployeeDirectory words={wordPreset((await currentPresentation()).words).en} employees={employees} locations={locations} filters={filters}
    visibleEmployees={filterDirectoryEmployees(employees, filters)} />;
}
