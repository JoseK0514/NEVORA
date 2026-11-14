import { beforeEach, expect, it, vi } from 'vitest';
const driver = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock('../db', async original => ({ ...await original<typeof import('../db')>(), getDb: () => driver }));
async function adapter() {
  const implementation = await import('./notification-transactions').catch(() => ({}));
  expect(implementation).toHaveProperty('neonNotificationExecutor');
  return (implementation as typeof import('./notification-transactions')).neonNotificationExecutor();
}
beforeEach(() => { driver.query.mockReset(); driver.transaction.mockReset(); });
it('ordered_batch_and_abort_signal_belong_to_one_transaction', async () => {
  const executor = await adapter();
  const signal = new AbortController().signal;
  driver.query.mockImplementation((text, values) => ({ text, values }));
  driver.transaction.mockResolvedValue([[],[],[{ id:'business' }],{rows:[{id:'persisted-intent'}]},[{sql_session_contract:1}]]);
  expect(await executor.transaction([{text:'BUSINESS $1',values:['b']},{text:'INTENT $1',values:['n']}],signal)).toEqual([[{id:'business'}],[{id:'persisted-intent'}]]);
  expect(driver.query.mock.calls).toEqual([["SET LOCAL TIME ZONE 'UTC'",[]],["SET LOCAL DateStyle TO 'ISO, YMD'",[]],['BUSINESS $1',['b']],['INTENT $1',['n']],[expect.stringContaining('sql_session_contract_changed'),[]]]);
  expect(driver.transaction).toHaveBeenCalledWith([{text:"SET LOCAL TIME ZONE 'UTC'",values:[]},{text:"SET LOCAL DateStyle TO 'ISO, YMD'",values:[]},{text:'BUSINESS $1',values:['b']},{text:'INTENT $1',values:['n']},{text:expect.stringContaining('sql_session_contract_changed'),values:[]}], {isolationLevel:'ReadCommitted',arrayMode:false,fullResults:false,fetchOptions:{signal}});
});
it('transaction_failures_propagate_and_preaborted_work_never_starts', async () => {
  const executor = await adapter();
  driver.query.mockReturnValue({});
  driver.transaction.mockRejectedValue(new Error('intent rejected'));
  await expect(executor.transaction([{text:'INSERT',values:[]}])).rejects.toThrow('intent rejected');
  driver.query.mockClear();
  const controller = new AbortController(); controller.abort();
  await expect(executor.transaction([{text:'INSERT',values:[]}], controller.signal)).rejects.toThrow();
  expect(driver.query).not.toHaveBeenCalled();
});
it('query_normalizes_driver_rows_and_forwards_abort_to_its_owning_transaction', async () => {
  const executor = await adapter(); const signal = new AbortController().signal;
  driver.query.mockImplementation((text,values)=>({text,values}));
  driver.transaction.mockResolvedValue([[],[],{rows:[{id:'one'}]},[{sql_session_contract:1}]]);
  expect(await executor.query({text:'SELECT $1',values:['one']},signal)).toEqual([{id:'one'}]);
  expect(driver.query).toHaveBeenCalledWith('SELECT $1',['one']);
  expect(driver.transaction).toHaveBeenCalledWith(expect.any(Array),{isolationLevel:'ReadCommitted',arrayMode:false,fullResults:false,fetchOptions:{signal}});
});
