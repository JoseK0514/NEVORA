import { describe, expect, it } from "vitest";
import type { Employee, Location } from "./domain";
import { filterDirectoryEmployees, hasDirectoryFilters, readDirectoryFilters } from "./employee-directory";

const locations: Location[] = [
  { id: "main", workspaceId: "w", clockerKey: "main", name: "Main Office", shortName: "Main", active: true },
  { id: "retained", workspaceId: "w", clockerKey: "retained", name: "Former Office", shortName: "Former", active: false },
];
const people: Employee[] = [
  { id: "E-001", firstName: "José", lastName: "Rivera", phone: "7875550101", role: "EMPLOYEE", active: true, primaryLocationId: "main", eligibleLocationIds: ["main", "retained"], positionIds: [] },
  { id: "E-002", firstName: "Avery", lastName: "Lane", phone: "7875550102", role: "LEAD", active: true, primaryLocationId: "retained", eligibleLocationIds: ["main", "retained"], positionIds: [] },
  { id: "ID / 03", firstName: "Avery", lastName: "Reed", phone: "7875550103", role: "LEAD", active: false, primaryLocationId: "retained", eligibleLocationIds: ["retained"], positionIds: [] },
];
const filteredIds = (params: Parameters<typeof readDirectoryFilters>[0]) =>
  filterDirectoryEmployees(people, readDirectoryFilters(params, locations)).map(person => person.id);

describe("employee directory filters", () => {
  it("retains all active and inactive people in the source order by default", () => {
    expect(filteredIds({})).toEqual(["E-001", "E-002", "ID / 03"]);
    expect(hasDirectoryFilters(readDirectoryFilters({}, locations))).toBe(false);
  });
  it("finds full names without case or accent sensitivity and exact identifier fragments", () => {
    expect(filteredIds({ q: "  JOSE RIVERA  " })).toEqual(["E-001"]);
    expect(filteredIds({ q: "e-002" })).toEqual(["E-002"]);
    expect(filteredIds({ q: "id /" })).toEqual(["ID / 03"]);
  });
  it("combines every filter and keeps inactive primary locations usable", () => {
    expect(filteredIds({ q: "avery", status: "inactive", role: "LEAD", location: "retained" })).toEqual(["ID / 03"]);
    expect(filteredIds({ q: "avery", status: "active", role: "LEAD", location: "retained" })).toEqual(["E-002"]);
    expect(filteredIds({ role: "LEAD", location: "main" })).toEqual([]);
  });
  it("applies status independently of role and location", () => {
    expect(filteredIds({ status: "active" })).toEqual(["E-001", "E-002"]);
    expect(filteredIds({ status: "inactive" })).toEqual(["ID / 03"]);
    expect(filteredIds({ location: "retained" })).toEqual(["E-002", "ID / 03"]);
  });
  it("ignores invalid and duplicate URL fields and bounds search length", () => {
    expect(readDirectoryFilters({ status: "other", role: "ADMIN", location: "unknown", q: ["Avery", "José"] }, locations)).toEqual({ query: "", status: "all", role: "", location: "" });
    expect(filteredIds({ status: ["active", "inactive"], role: ["LEAD"], location: ["main"] })).toEqual(["E-001", "E-002", "ID / 03"]);
    expect(readDirectoryFilters({ q: "x".repeat(200) }, locations).query.length).toBe(128);
  });
  it("returns an empty result instead of fabricating a person and does not mutate the source", () => {
    expect(filteredIds({ q: "no-match" })).toEqual([]);
    expect(people.map(person => person.id)).toEqual(["E-001", "E-002", "ID / 03"]);
    expect(hasDirectoryFilters(readDirectoryFilters({ status: "inactive" }, locations))).toBe(true);
  });
});
