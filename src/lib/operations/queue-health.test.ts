import {expect,it,vi} from 'vitest';
import {readQueueHealth,assessQueueHealth} from './queue-health';
import type {SqlExecutor} from '../notifications/types';
const row=()=>({workspace_id:'11111111-1111-4111-8111-111111111111',observed_at:new Date().toISOString(),payroll_due:'0',payroll_failed:'0',payroll_expired_leases:'0',payroll_invalid_leases:'0',payroll_oldest_due_seconds:'0',notification_due_intents:'0',notification_due_deliveries:'0',notification_failed:'0',notification_expired_leases:'0',notification_oldest_due_seconds:'0'});
const executor=(rows:unknown[])=>({query:vi.fn(async()=>rows),transaction:vi.fn(async()=>{throw Error('No mutation/transaction allowed');})}) as unknown as SqlExecutor;
it('strictly decodes actual numeric/string counters and returns only queue aggregates',async()=>{
 const ex=executor([row()]),health=await readQueueHealth(ex,'test');expect(health).toMatchObject({workspaceId:row().workspace_id,payroll:{due:0,failed:0,expiredLeases:0,oldestDueSeconds:0},notifications:{dueIntents:0,dueDeliveries:0,failed:0,expiredLeases:0,oldestDueSeconds:0}});expect(assessQueueHealth(health,60)).toEqual({healthy:true,reasons:[]});expect(ex.transaction).not.toHaveBeenCalled();
});
it('fails closed for absent/ambiguous workspace, malformed counts and inconsistent empty queues',async()=>{
 const good=row();for(const rows of [[],[good,good],[{...good,payroll_due:'-1'}],[{...good,payroll_due:Infinity}],[{...good,payroll_due:'0.5'}],[{...good,payroll_due:null}],[{...good,payroll_oldest_due_seconds:'10'}],[{...good,notification_oldest_due_seconds:'10'}],[{...good,extra:'unexpected'}]])await expect(readQueueHealth(executor(rows),'test')).rejects.toThrow('operations_health_unavailable');
});
it('reports terminal failures, expired leases and due-age over the explicit operator threshold',async()=>{
 const h=await readQueueHealth(executor([{...row(),payroll_due:'2',payroll_failed:'1',payroll_expired_leases:'1',payroll_oldest_due_seconds:'60',notification_due_deliveries:'1',notification_failed:'1',notification_expired_leases:'1',notification_oldest_due_seconds:'61'}]),'test');
 expect(assessQueueHealth(h,60)).toEqual({healthy:false,reasons:['payroll_failed','payroll_expired_lease','notification_failed','notification_expired_lease','notification_queue_age']});expect(()=>assessQueueHealth(h,0)).toThrow('operations_configuration_invalid');
});
it('sanitizes database errors and rejects invalid environment before query',async()=>{
 const ex=executor([]);await expect(readQueueHealth(ex,'unknown' as 'test')).rejects.toThrow('operations_configuration_invalid');expect(ex.query).not.toHaveBeenCalled();
 ex.query=async()=>{throw Error('postgresql://fictional-password@private.invalid/database');};await expect(readQueueHealth(ex,'test')).rejects.toThrow(/^operations_health_unavailable$/);
});
it('bounds noncooperative read IO when its observation signal is cancelled',async()=>{
 const ex=executor([]);ex.query=()=>new Promise(()=>{});const controller=new AbortController();const pending=readQueueHealth(ex,'test',controller.signal);controller.abort();await expect(pending).rejects.toThrow('operations_health_unavailable');
});
it('monitors the explicitly selected worker domain without requiring optional payroll to be enabled',async()=>{
 const h=await readQueueHealth(executor([{...row(),payroll_failed:'1'}]),'test');
 expect(assessQueueHealth(h,60,'notifications')).toEqual({healthy:true,reasons:[]});expect(assessQueueHealth(h,60,'payroll')).toEqual({healthy:false,reasons:['payroll_failed']});
});
