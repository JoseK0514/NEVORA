import {describe, expect, it} from '@rstest/core';
import {passwordRejection} from './password-policy';
import {passwordLength, passwordRejectionMessage} from './password-requirements';

const context={employeeId:'WORKER-2026-0099',companyName:'North Harbor Foods'};
describe('new password enrollment',()=>{
 it('requires 15 Unicode characters, including when surrogate pairs inflate the JavaScript length',()=>{
  expect(passwordRejection('fourteen chars',context)).toBe('too_short');
  expect(passwordRejection('😀'.repeat(8),context)).toBe('too_short');
  expect(passwordLength('😀'.repeat(15))).toBe(15);
 });
 it('permits long phrases, spaces and Unicode without a digit or symbol requirement',()=>{
  for(const value of ['quiet meadows under winter skies','café brisa mariposas al amanecer','a distant orchestra carries through the valley '.repeat(4)])expect(passwordRejection(value,context)).toBeNull();
 });
 it('blocks predictable repeated and sequential passwords',()=>{
  expect(passwordRejection('a'.repeat(15),context)).toBe('common');
  expect(passwordRejection('123456789012345',context)).toBe('common');
 });
 it('blocks known breached whole values from the pinned corpus',()=>{
  expect(passwordRejection('qwertyuiopasdfgh',context)).toBe('breached');
 });
 it('blocks the actual employee identity and predictable derivatives',()=>{
  expect(passwordRejection('WORKER-2026-0099',context)).toBe('employee_id');
  expect(passwordRejection('worker20260099123!',context)).toBe('employee_id');
 });
 it('blocks company names and predictable derivatives without banning unrelated passphrases containing their words',()=>{
  expect(passwordRejection('North Harbor Foods',context)).toBe('company_name');
  expect(passwordRejection('NorthHarborFoods2026!',context)).toBe('company_name');
  expect(passwordRejection('the north harbor foods picnic begins under starlight',context)).toBeNull();
 });
 it('refuses oversized passwords rather than hashing a truncated value',()=>{
  expect(passwordRejection('a long independent phrase '.repeat(60),context)).toBe('too_long');
 });
 it('provides a distinct actionable reason in both supported languages',()=>{
  expect(passwordRejectionMessage('en','employee_id')).toContain('Employee ID');
  expect(passwordRejectionMessage('es','company_name')).toContain('empresa');
  expect(passwordRejectionMessage('en','breached')).toContain('breach');
  expect(passwordRejectionMessage('es','too_short')).toContain('15');
 });
});

it('uses the same 1024-code-point limit for supplementary characters and ASCII',()=>{
 const supplementary=Array.from({length:513},(_,i)=>String.fromCodePoint(0x1f300+i)).join('');
 expect(passwordRejection(supplementary,context)).toBeNull();
});
