import type { Employee } from "@/lib/domain";

export type EmployeeFilters = {
  search: string;
  role: string;
  locationId: string;
  status: "all" | "active" | "inactive";
};

export function filterEmployees(employees: Employee[], filters: EmployeeFilters) {
  const search = filters.search.trim().toLocaleLowerCase();
  const phoneSearch = search.replace(/\D/g, "");

  return employees.filter((employee) => {
    if (filters.role && employee.role !== filters.role) return false;
    if (filters.locationId && employee.primaryLocationId !== filters.locationId) return false;
    if (filters.status === "active" && !employee.active) return false;
    if (filters.status === "inactive" && employee.active) return false;

    if (!search) return true;
    if (phoneSearch.length >= 3 && employee.phone.replace(/\D/g, "").includes(phoneSearch)) return true;
    return [
      employee.firstName,
      employee.lastName,
      `${employee.firstName} ${employee.lastName}`,
      employee.id,
      employee.email ?? "",
    ].some((value) => value.toLocaleLowerCase().includes(search));
  });
}
