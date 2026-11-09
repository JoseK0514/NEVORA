import type { Employee, Location, UserRole } from "./domain";

export type DirectorySearchParams = Record<string, string | string[] | undefined>;
export type DirectoryStatus = "all" | "active" | "inactive";
export type DirectoryFilters = { query: string; status: DirectoryStatus; role: UserRole | ""; location: string };
export const DIRECTORY_ROLES: UserRole[] = ["OWNER", "MANAGER", "LEAD", "EMPLOYEE"];
const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
const searchable = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en");

/** Normalizes untrusted query parameters against known roles/locations and bounds search text. */
export function readDirectoryFilters(params: DirectorySearchParams, locations: readonly Location[]): DirectoryFilters {
  const status = single(params.status);
  const location = single(params.location);
  return {
    query: single(params.q).trim().slice(0, 128),
    status: status === "active" || status === "inactive" ? status : "all",
    role: DIRECTORY_ROLES.find(role => role === single(params.role)) ?? "",
    location: locations.some(item => item.id === location) ? location : "",
  };
}

/**
 * Presentation filtering over an already-authorized employee set. Location means
 * primary location, not scheduling eligibility; accent-insensitive name/ID search
 * must never be used to decide the caller's access to employee records.
 */
export function filterDirectoryEmployees(employees: readonly Employee[], filters: DirectoryFilters, positionNames?: ReadonlyMap<string, string>): Employee[] {
  const query = searchable(filters.query);
  // Release 1 (board G-O-Team): "Search by name or position" also matches the names of a person's positions.
  const positionsOf = (employee: Employee) => positionNames ? employee.positionIds.map(id => positionNames.get(id) ?? "").join(" ") : "";
  return employees.filter(employee =>
    (filters.status === "all" || employee.active === (filters.status === "active")) &&
    (!filters.role || employee.role === filters.role) &&
    (!filters.location || employee.primaryLocationId === filters.location) &&
    (!query || searchable(`${employee.firstName} ${employee.lastName}`).includes(query) || searchable(employee.id).includes(query) || searchable(positionsOf(employee)).includes(query)),
  );
}

export function hasDirectoryFilters(filters: DirectoryFilters) {
  return Boolean(filters.query || filters.role || filters.location || filters.status !== "all");
}
