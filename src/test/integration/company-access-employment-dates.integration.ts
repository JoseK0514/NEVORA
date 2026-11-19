import {it,expect,rs} from '@rstest/core';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import type {CoreProfileInput,EmployeeCoreAccessCommand} from '../../lib/company-access/model';
import type {EmploymentDates} from '../../lib/employment-dates';
rs.mock('server-only',()=>({}));
import {readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import {readOperationalEmployeeProfile} from '../../lib/company-access/operational-read.server';
import {saveEmployeeCoreAccessProfile,createEmployeeWithAccess} from '../../lib/company-access/employee-profile.server';
type Fixture=Awaited<ReturnType<typeof companyAccessFixture>>;
const dates=(value:Partial<EmploymentDates>):EmploymentDates=>({hireDate:null,terminationDate:null,birthDate:null,...value});
const stored=(f:Fixture,id='target')=>f.q<{active:boolean;hire:string|null;termination:string|null;birth:string|null}>(
 `SELECT active,to_char(hire_date,'YYYY-MM-DD') AS hire,to_char(termination_date,'YYYY-MM-DD') AS termination,to_char(birth_date,'YYYY-MM-DD') AS birth FROM employees WHERE id=$1`,[id]);
async function command(f:Fixture,id='target',change:Partial<CoreProfileInput>={},employmentDates?:EmploymentDates):Promise<EmployeeCoreAccessCommand>{
 const read=await readOwnerOperationalScope(f.owner,id,f.db.executor);if(read.state!=='ready')throw Error('Owner context');
 const [p]=await f.q<{firstName:string;lastName:string;email:string|null;role:CoreProfileInput['role'];primaryLocationId:string;active:boolean}>(
  'SELECT first_name AS "firstName",last_name AS "lastName",email,role,primary_location_id AS "primaryLocationId",active FROM employees WHERE id=$1',[id]);
 return {operationId:randomUUID(),employeeId:id,expectedEmployeeUpdatedAt:read.data.current.employeeUpdatedAt,profile:{...p,phone:'7875550103',...change},...(employmentDates?{employmentDates}:{})};
}

it('existing people start with no dates, and Owner and Company Manager edits set them on the versioned profile without changing active',async()=>{
 const f=await companyAccessFixture();try{
  expect(await stored(f)).toEqual([{active:true,hire:null,termination:null,birth:null}]);
  const owner=await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{},dates({hireDate:'2015-03-02',terminationDate:'2026-06-30',birthDate:'1990-05-01'})),f.db.executor);
  expect(owner.state).toBe('saved');if(owner.state!=='saved')throw Error('save');
  // A termination date is a record: the person stays active and keeps their sessions.
  expect(owner.receipt.active).toBe(true);expect(JSON.stringify(owner.receipt)).not.toMatch(/1990|2015-03|2026-06/);
  expect(await stored(f)).toEqual([{active:true,hire:'2015-03-02',termination:'2026-06-30',birth:'1990-05-01'}]);
  const manager=await saveEmployeeCoreAccessProfile(f.manager,await command(f,'target',{},dates({hireDate:'2017-01-26'})),f.db.executor);
  expect(manager.state).toBe('saved');
  expect(await stored(f)).toEqual([{active:true,hire:'2017-01-26',termination:null,birth:null}]);
  // Deactivate sends no dates and leaves them as they are.
  await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{},dates({hireDate:'2017-01-26',birthDate:'1990-05-01'})),f.db.executor);
  const deactivated=await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{active:false}),f.db.executor);
  expect(deactivated.state).toBe('saved');
  expect(await stored(f)).toEqual([{active:false,hire:'2017-01-26',termination:null,birth:'1990-05-01'}]);
 }finally{await f.db.dispose();}
});

it('refuses invalid dates with field errors and leaves the record untouched; a stale version still conflicts',async()=>{
 const f=await companyAccessFixture();try{
  const future=await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{},dates({birthDate:'2999-01-01'})),f.db.executor);
  expect(future).toMatchObject({state:'invalid',fieldErrors:[{field:'birthDate'}]});
  const order=await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{},dates({hireDate:'2020-05-10',terminationDate:'2020-05-09'})),f.db.executor);
  expect(order).toMatchObject({state:'invalid',fieldErrors:[{field:'terminationDate'}]});
  const hire=await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{},dates({hireDate:'2999-01-01'})),f.db.executor);
  expect(hire).toMatchObject({state:'invalid',fieldErrors:[{field:'hireDate'}]});
  expect(await stored(f)).toEqual([{active:true,hire:null,termination:null,birth:null}]);
  const stale=await command(f,'target',{},dates({hireDate:'2015-03-02'}));
  expect((await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{firstName:'Newer'}),f.db.executor)).state).toBe('saved');
  expect(await saveEmployeeCoreAccessProfile(f.owner,stale,f.db.executor)).toEqual({state:'conflict',reason:'employee_changed'});
  expect(await stored(f)).toEqual([{active:true,hire:null,termination:null,birth:null}]);
  // The database repeats the order and floor rules.
  await expect(f.q("UPDATE employees SET hire_date='2020-05-10',termination_date='2020-05-09' WHERE id='target'")).rejects.toThrow(/employees_termination_after_hire/);
  await expect(f.q("UPDATE employees SET birth_date='1899-12-31' WHERE id='target'")).rejects.toThrow(/employees_birth_date_floor/);
 }finally{await f.db.dispose();}
});

it('a Manager cannot write an Owner\'s dates, and the edit-sheet read returns dates only to someone who may edit them',async()=>{
 const f=await companyAccessFixture();try{
  await f.q("UPDATE employees SET hire_date='2010-01-04',birth_date='1980-02-03' WHERE id IN('owner','target')");
  expect((await saveEmployeeCoreAccessProfile(f.manager,await command(f,'owner',{},dates({birthDate:'1985-01-01'})),f.db.executor)).state).not.toBe('saved');
  expect(await stored(f,'owner')).toEqual([{active:true,hire:'2010-01-04',termination:null,birth:'1980-02-03'}]);
  const plain=await readOperationalEmployeeProfile(f.manager,'target',f.db.executor);
  expect(plain.state).toBe('ready');if(plain.state!=='ready')throw Error('read');expect(plain.data).not.toHaveProperty('employmentDates');
  expect(JSON.stringify(plain.data)).not.toMatch(/1980-02-03|2010-01-04/);
  const managerTarget=await readOperationalEmployeeProfile(f.manager,'target',f.db.executor,{employmentDates:true});
  if(managerTarget.state!=='ready')throw Error('read');expect(managerTarget.data.employmentDates).toEqual(dates({hireDate:'2010-01-04',birthDate:'1980-02-03'}));
  const managerOwner=await readOperationalEmployeeProfile(f.manager,'owner',f.db.executor,{employmentDates:true});
  if(managerOwner.state!=='ready')throw Error('read');expect(managerOwner.data).not.toHaveProperty('employmentDates');
  const ownerOwner=await readOperationalEmployeeProfile(f.owner,'owner',f.db.executor,{employmentDates:true});
  if(ownerOwner.state!=='ready')throw Error('read');expect(ownerOwner.data.employmentDates?.birthDate).toBe('1980-02-03');
 }finally{await f.db.dispose();}
});

it('creates a person with optional dates, and without them the stored columns stay NULL',async()=>{
 const f=await companyAccessFixture();try{
  const employee={id:'NEW-1',firstName:'Fictional',lastName:'Hire',phone:'7875550111',email:null,role:'EMPLOYEE' as const,primaryLocationId:'loc-1',eligibleLocationIds:['loc-1'],positionIds:[]};
  expect((await createEmployeeWithAccess(f.manager,{operationId:randomUUID(),employee,employmentDates:dates({hireDate:'2026-11-02',birthDate:'2004-09-09'})},f.db.executor)).state).toBe('saved');
  expect(await stored(f,'NEW-1')).toEqual([{active:true,hire:'2026-11-02',termination:null,birth:'2004-09-09'}]);
  expect((await createEmployeeWithAccess(f.owner,{operationId:randomUUID(),employee:{...employee,id:'NEW-2'}},f.db.executor)).state).toBe('saved');
  expect(await stored(f,'NEW-2')).toEqual([{active:true,hire:null,termination:null,birth:null}]);
  expect(await createEmployeeWithAccess(f.owner,{operationId:randomUUID(),employee:{...employee,id:'NEW-3'},employmentDates:dates({birthDate:'2999-01-01'})},f.db.executor)).toMatchObject({state:'invalid'});
  expect(await f.q("SELECT id FROM employees WHERE id='NEW-3'")).toEqual([]);
 }finally{await f.db.dispose();}
});
