import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { seedShiftChanges, fixtureShift, proof } from './shift-change-fixture';
import { fictionalProfile } from '../fixtures/shift-changes';
import { executeShiftChange } from '../../lib/data/shift-changes';
import { readShiftChangeMaintenanceSnapshot, runShiftChangeMaintenance } from '../../lib/data/shift-change-maintenance';
import { loadWorkspaceNotificationConfig } from '../../lib/notifications/config';

it.each([40, 160])('T06 records separate discovery/command/maintenance measurements for %i fictional employees', async (employeeCount) => {
  const db = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  const q = (text: string, values: readonly unknown[] = []) => db.executor.query<Record<string, unknown>>({ text, values });
  try {
    await seedShiftChanges(db.executor);
    await q("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('perf-3','workspace-fuel','perf-3','Fictional Third Office','Third Office')");
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) SELECT 'perf-'||i,'Fictional','Worker '||i,'QA-NO-PHONE','EMPLOYEE','loc-1' FROM generate_series(1,$1::int) i", [employeeCount - 4]);
    await q("INSERT INTO employee_location_eligibility SELECT e.id,l.id FROM employees e CROSS JOIN locations l ON CONFLICT DO NOTHING");
    await q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) SELECT id,40,80,$1::jsonb FROM employees WHERE id LIKE 'perf-%'", [JSON.stringify(fictionalProfile())]);
    await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT id||'-day-'||d,id,d,'00:00','24:00' FROM employees CROSS JOIN generate_series(0,6) d WHERE id LIKE 'perf-%'");
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('perf-second','loc-2','2035-10-01','PUBLISHED','owner'),('perf-third','perf-3','2035-10-01','PUBLISHED','owner')");
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT 'perf-commitment-'||id,CASE WHEN row_number() OVER(ORDER BY id)%2=0 THEN 'perf-second' ELSE 'perf-third' END,id,'2035-10-01','08:00','12:00' FROM employees WHERE id LIKE 'perf-%'");
    const historyRows = employeeCount * 10;
    await q("INSERT INTO shift_change_events(workspace_id,request_kind,request_id,request_revision,event_kind,participants,outcome_mode) SELECT 'workspace-fuel','EXCHANGE','historical-'||i,1,'LEGACY_IMPORTED',jsonb_build_object('requesterEmployeeId','perf-history'),'LEGACY' FROM generate_series(1,$1::int) i", [historyRows]);
    await q("INSERT INTO shift_change_operations(workspace_id,actor_employee_id,operation_id,command_fingerprint,request_id,result) SELECT 'workspace-fuel','perf-history',gen_random_uuid(),repeat('a',64),'historical-'||i,jsonb_build_object('status','closed') FROM generate_series(1,$1::int) i", [historyRows]);
    const source = await fixtureShift(db.executor, 'perf-offer', 'e1', '2035-10-02');
    const offered = await executeShiftChange(proof('e1'), { kind: 'OFFER_COVERAGE', operationId: randomUUID(), ...source }, db.executor);
    expect(offered.status).toBe('pending');
    if (offered.status !== 'pending') throw Error('Benchmark offer setup failed');
    const startDiscovery = performance.now();
    const snapshot = await readShiftChangeMaintenanceSnapshot(offered.requestId, 'EXCHANGE', db.executor);
    const discoveryMs = performance.now() - startDiscovery;
    expect(snapshot?.eligibleEmployeeIds).toContain('e2');
    const startCommand = performance.now();
    expect(await executeShiftChange(proof('e2'), { kind: 'ACCEPT', operationId: randomUUID(), requestId: offered.requestId, expectedRevision: 1 }, db.executor)).toMatchObject({ status: 'completed' });
    const commandMs = performance.now() - startCommand;
    const second = await fixtureShift(db.executor, 'perf-maintenance', 'e1', '2035-10-03');
    expect((await executeShiftChange(proof('e1'), { kind: 'OFFER_COVERAGE', operationId: randomUUID(), ...second }, db.executor)).status).toBe('pending');
    const config = await loadWorkspaceNotificationConfig({ PUSH_ENVIRONMENT: 'test' }, db.executor);
    const startMaintenance = performance.now();
    const maintenance = await runShiftChangeMaintenance({ executor: db.executor, config, clock: () => new Date(), limit: 10 });
    const maintenanceMs = performance.now() - startMaintenance;
    expect(maintenance.conflicts).toBe(0);
    expect(maintenance.scanned).toBeGreaterThan(0);
    expect((await q('SELECT count(*)::int n FROM employees'))[0].n).toBe(employeeCount);
    console.log('PHASE_A_PERFORMANCE', JSON.stringify({ employeeCount, locations: 3, historyRows, operationHistoryRows: historyRows,
      candidates: snapshot?.eligibleEmployeeIds.length, privateSnapshotBytes: Buffer.byteLength(JSON.stringify(snapshot)), discoveryMs, commandMs, maintenanceMs,
      maintenance, workerBudgetMs: config.policy.budgetMs, transactionStatementTimeoutMs: 5000,
      processRssBytes: process.memoryUsage().rss, processHighWaterRssKiB: process.resourceUsage().maxRSS,
      meaning: 'Local fictional data measurements; process high-water is cumulative, not a production latency/capacity guarantee.' }));
  } finally { await db.dispose(); }
}, 30000);
