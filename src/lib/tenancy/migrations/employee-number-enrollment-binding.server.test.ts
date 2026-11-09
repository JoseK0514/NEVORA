// SOURCE-ONLY regression assertions. Unexecuted; no database or lease fixture.
import {describe,it,expect} from 'vitest';
import type {Client} from 'pg';
import {
 getControlledEnrollmentInstallerBinding,isControlledEnrollmentInstallerExecution,
 assertControlledEnrollmentInstallerExecution,assertOwnedEmployeeNumberEnrollmentInstallation,
 isEmployeeNumberEnrollmentBindingFailure,type ControlledEnrollmentInstallerBinding,
} from './employee-number-enrollment-binding.server';

describe('separate owned-local installer public denial boundaries',()=>{
 it('rejects an accessor plan before reading it or another request property',()=>{
  let reads=0;
  const request={};
  Object.defineProperties(request,{plan:{enumerable:true,get(){reads++;return {};}},mode:{enumerable:true,get(){reads++;return 'OWNED_LOCAL';}}});
  let error:unknown;try{getControlledEnrollmentInstallerBinding(request);}catch(e){error=e;}
  expect(isEmployeeNumberEnrollmentBindingFailure(error)).toBe(true);
  expect(error).toMatchObject({code:'ENROLLMENT_ORIGINAL_PLAN_REQUIRED'});
  expect(reads).toBe(0);
 });
 it('rejects a transparent request proxy before all metadata traps',()=>{
  let reads=0;
  const request=new Proxy({},{get(t,k,r){reads++;return Reflect.get(t,k,r);},ownKeys(t){reads++;return Reflect.ownKeys(t);},getOwnPropertyDescriptor(t,k){reads++;return Reflect.getOwnPropertyDescriptor(t,k);},getPrototypeOf(t){reads++;return Reflect.getPrototypeOf(t);}});
  let error:unknown;try{getControlledEnrollmentInstallerBinding(request);}catch(e){error=e;}
  expect(isEmployeeNumberEnrollmentBindingFailure(error)).toBe(true);
  expect(error).toMatchObject({code:'ENROLLMENT_ORIGINAL_PLAN_REQUIRED'});
  expect(reads).toBe(0);
 });
 it('never admits a copied witness or reads a hostile client for that witness',async()=>{
  let reads=0;
  const client=new Proxy({},{get(){reads++;throw new Error('client must not be read');}}) as unknown as Client;
  const witness=new Proxy({},{get(){reads++;throw new Error('witness must not be read');}});
  expect(isControlledEnrollmentInstallerExecution(witness,client)).toBe(false);
  const binding={} as ControlledEnrollmentInstallerBinding;
  const error=await assertControlledEnrollmentInstallerExecution(client,witness,binding).catch(e=>e);
  expect(isEmployeeNumberEnrollmentBindingFailure(error)).toBe(true);
  expect(error).toMatchObject({code:'ENROLLMENT_EXECUTION_REQUIRED'});
  expect(reads).toBe(0);
 });
 it('rejects an installation-shaped clone before client or native reads',async()=>{
  let reads=0;
  const client=new Proxy({},{get(){reads++;throw new Error('client must not be read');}}) as unknown as Client;
  const error=await assertOwnedEmployeeNumberEnrollmentInstallation(client,{format:'OWNED_LOCAL_EMPLOYEE_NUMBER_INSTALLATION_V1'}).catch(e=>e);
  expect(isEmployeeNumberEnrollmentBindingFailure(error)).toBe(true);
  expect(error).toMatchObject({code:'ENROLLMENT_INSTALLATION_REQUIRED'});
  expect(reads).toBe(0);
 });
});
