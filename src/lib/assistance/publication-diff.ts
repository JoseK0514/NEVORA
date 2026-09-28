export type PublishedShiftSnapshot = {
  sourceShiftId?: string;
  scheduleId?: string;
  locationId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  isDesignatedLead: boolean;
  isCalloutApproved: boolean;
};

export type PublicationChangeType =
  | "ADDED"
  | "REMOVED"
  | "TIME_CHANGED"
  | "EMPLOYEE_REASSIGNED"
  | "LOCATION_CHANGED"
  | "LEAD_CHANGED"
  | "CALLOUT_CHANGED";

export type PublicationChange = {
  type: PublicationChangeType;
  before?: PublishedShiftSnapshot;
  after?: PublishedShiftSnapshot;
  affectedEmployeeIds: string[];
};

function snapshotIdentity(snapshot: PublishedShiftSnapshot) {
  if (snapshot.sourceShiftId) {
    return `shift:${snapshot.sourceShiftId}`;
  }

  return [
    "fallback",
    snapshot.locationId,
    snapshot.employeeId,
    snapshot.date,
    snapshot.startTime,
    snapshot.endTime,
  ].join(":");
}

function affectedEmployees(
  before?: PublishedShiftSnapshot,
  after?: PublishedShiftSnapshot,
) {
  return Array.from(
    new Set(
      [before?.employeeId, after?.employeeId].filter(
        (employeeId): employeeId is string => Boolean(employeeId),
      ),
    ),
  );
}

function matchedChanges(
  before: PublishedShiftSnapshot,
  after: PublishedShiftSnapshot,
): PublicationChange[] {
  const changes: PublicationChange[] = [];
  const affectedEmployeeIds = affectedEmployees(before, after);
  const add = (type: PublicationChangeType) => {
    changes.push({ type, before, after, affectedEmployeeIds });
  };

  if (before.employeeId !== after.employeeId) {
    add("EMPLOYEE_REASSIGNED");
  }

  if (before.locationId !== after.locationId) {
    add("LOCATION_CHANGED");
  }

  if (
    before.date !== after.date ||
    before.startTime !== after.startTime ||
    before.endTime !== after.endTime
  ) {
    add("TIME_CHANGED");
  }

  if (before.isDesignatedLead !== after.isDesignatedLead) {
    add("LEAD_CHANGED");
  }

  if (before.isCalloutApproved !== after.isCalloutApproved) {
    add("CALLOUT_CHANGED");
  }

  return changes;
}

export function diffPublishedShifts(
  previous: PublishedShiftSnapshot[],
  next: PublishedShiftSnapshot[],
): PublicationChange[] {
  const previousMap = new Map(
    previous.map((snapshot) => [snapshotIdentity(snapshot), snapshot]),
  );
  const nextMap = new Map(
    next.map((snapshot) => [snapshotIdentity(snapshot), snapshot]),
  );
  const keys = Array.from(
    new Set([...previousMap.keys(), ...nextMap.keys()]),
  ).sort();

  const changes: PublicationChange[] = [];

  for (const key of keys) {
    const before = previousMap.get(key);
    const after = nextMap.get(key);

    if (!before && after) {
      changes.push({
        type: "ADDED",
        after,
        affectedEmployeeIds: affectedEmployees(undefined, after),
      });
      continue;
    }

    if (before && !after) {
      changes.push({
        type: "REMOVED",
        before,
        affectedEmployeeIds: affectedEmployees(before, undefined),
      });
      continue;
    }

    if (before && after) {
      changes.push(...matchedChanges(before, after));
    }
  }

  return changes;
}

export function diffEmployeePublishedShifts(
  previous: PublishedShiftSnapshot[],
  next: PublishedShiftSnapshot[],
  employeeId: string,
) {
  return diffPublishedShifts(previous, next).filter((change) =>
    change.affectedEmployeeIds.includes(employeeId),
  );
}

export function didEmployeeShiftSetChange(
  previous: PublishedShiftSnapshot[],
  next: PublishedShiftSnapshot[],
  employeeId: string,
) {
  return diffEmployeePublishedShifts(previous, next, employeeId).length > 0;
}
