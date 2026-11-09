import {it,expect} from 'vitest';
import {missingMigrationFiles} from './migration-order';
const current=['0038_read_path_indexes.sql','0039_native_payroll_setup_records.sql','0038_clocker_pin_operation_reference.sql','0039_clocker_review_requests.sql'];
it('does not treat a shared numeric prefix as an applied migration',()=>{
 expect(missingMigrationFiles(current,['0038_clocker_pin_operation_reference.sql','0039_clocker_review_requests.sql'])).toEqual(['0038_read_path_indexes.sql','0039_native_payroll_setup_records.sql']);
 expect(missingMigrationFiles(current,current)).toEqual([]);
});
it.each([['0038'],['0038_native_payroll_setup_records.sql'],['0038_read_path_indexes.sql','0038_read_path_indexes.sql']])('requires operator reconciliation for ledger %j',(...applied)=>{
 expect(()=>missingMigrationFiles(current,applied)).toThrow(/ledger/);
});
