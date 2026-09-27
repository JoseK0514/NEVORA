import type { Employee, Location, Shift } from "@/lib/domain";

export const locations: Location[] = [
  { id: "loc-1", name: "Fuel Coffee Drive · Location 1", shortName: "Location 1", active: true },
  { id: "loc-2", name: "Fuel Coffee Drive · Location 2", shortName: "Location 2", active: true },
];

export const employees: Employee[] = [
  {
    id: "FC-0018",
    firstName: "Maria",
    lastName: "Rivera",
    phone: "787-555-0142",
    email: "maria@example.com",
    role: "EMPLOYEE",
    primaryLocationId: "loc-1",
    eligibleLocationIds: ["loc-1", "loc-2"],
    active: true,
  },
  {
    id: "FC-0019",
    firstName: "Carlos",
    lastName: "Cruz",
    phone: "787-555-0164",
    role: "LEAD",
    primaryLocationId: "loc-1",
    eligibleLocationIds: ["loc-1", "loc-2"],
    active: true,
  },
  {
    id: "FC-0020",
    firstName: "Ana",
    lastName: "López",
    phone: "787-555-0188",
    role: "EMPLOYEE",
    primaryLocationId: "loc-2",
    eligibleLocationIds: ["loc-2"],
    active: true,
  },
];

export const demoShifts: Shift[] = [
  { id: "shift-1", scheduleId: "schedule-1", employeeId: "FC-0018", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
  { id: "shift-2", scheduleId: "schedule-1", employeeId: "FC-0019", locationId: "loc-1", date: "2026-09-28", startTime: "07:00", endTime: "15:00" },
  { id: "shift-3", scheduleId: "schedule-2", employeeId: "FC-0020", locationId: "loc-2", date: "2026-09-28", startTime: "10:00", endTime: "18:00" },
];
