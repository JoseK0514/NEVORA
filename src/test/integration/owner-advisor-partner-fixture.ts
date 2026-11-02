import { seedResilienceScenario, type ResilienceDatabase } from './owner-advisor-resilience-fixture';
import { resilienceForPartner } from '../fixtures/owner-advisor-partner';
export async function seedPartnerFixture(f: ResilienceDatabase, fixture: string) {
  const setup = await seedResilienceScenario(f,resilienceForPartner(fixture));
  if (fixture === 'covered') {
    await f.q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('partner-one','loc-1','2026-11-02','DRAFT','owner'),('partner-two','loc-2','2026-11-02','DRAFT','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('partner-riley','partner-one','lab-riley','2026-11-05','08:00','12:00',NULL),('partner-target','partner-two','target','2026-11-05','08:00','12:00','lab-barista');`);
  }
  return setup;
}
