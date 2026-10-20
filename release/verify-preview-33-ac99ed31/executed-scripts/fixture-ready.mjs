export function fixtureReady(locationId = 'loc-1') {
  const locationName = locationId === 'd13-retired' ? 'Retired Historical Location' : 'Main Office';
  return {
    state: 'ready',
    engineVersion: 1,
    workspaceId: 'workspace-fuel',
    timeZone: 'America/Puerto_Rico',
    observedAt: '2030-10-07T16:00:00Z',
    validForMs: 30000,
    scope: {
      kind: 'TODAY_AND_OPEN',
      localDate: '2030-10-07',
      dayStartAt: '2030-10-07T04:00:00Z',
    },
    groups: [
      {
        entryId: 'd13-entry',
        employeeId: 'D13-A',
        locationId,
        sourceVersion: 1,
        observations: [
          {
            id: 'd13-signal',
            kind: 'CLOCK_IN_AFTER_SCHEDULE_START',
            breakId: null,
            message: 'Clock-in recorded after scheduled start.',
            evidence: { differenceNanoseconds: '900000000000' },
          },
        ],
      },
    ],
    recordCount: 1,
    signalCount: 1,
    affectedEmployeeCount: 1,
    pendingCorrectionCount: 0,
    labels: {
      employees: [{ id: 'D13-A', name: 'Alexandria Attendance Review Employee With A Long Name' }],
      locations: [{ id: locationId, name: locationName }],
    },
    coverage: {
      state: 'limited',
      limitations: [
        { entryId: 'd13-entry', breakId: 'd13-break', reason: 'break_target_not_captured' },
      ],
      deferredCapabilities: [
        'missing_clock_in',
        'policy_lateness',
        'policy_early_departure',
        'unusually_long_entry',
        'overtime_risk',
      ],
    },
  };
}
