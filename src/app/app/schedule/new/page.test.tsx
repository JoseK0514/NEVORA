import { expect,it } from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {ShiftAssignmentFields} from '../../../../components/shift-assignment-fields';
import type {Employee,Position} from '../../../../lib/domain';
const employee={id:'sam',firstName:'Sam',lastName:'Rivera',active:true,role:'LEAD',positionIds:['cashier']} as Employee;
const positions=[{id:'cashier',name:'Cashier',active:true},{id:'barista',name:'Barista',active:true},{id:'old',name:'Old',active:false}] as Position[];
it('sole qualification and access role never infer assigned position',()=>{const html=renderToStaticMarkup(createElement(ShiftAssignmentFields,{employees:[employee],positions,employeeId:'sam'}));expect(html).toContain('<option value="" selected="">No position</option>');expect(html).toContain('Cashier');expect(html).not.toContain('Barista');expect(html).not.toContain('Old');});
it('edit retains explicit existing position while labels unavailable references',()=>{const html=renderToStaticMarkup(createElement(ShiftAssignmentFields,{employees:[employee],positions,employeeId:'sam',positionId:'old'}));expect(html).toContain('Old (unavailable');expect(html).toContain('value="old" disabled="" selected=""');});

it('changing employee clears a position the next employee is not qualified to hold', async () => {
  const assignmentModule = await import('../../../../components/shift-assignment-fields');
  const decide = (assignmentModule as unknown as {
    positionAfterEmployeeChange?: (input: {
      positionId: string;
      nextEmployeeId: string;
      employees: Employee[];
      positions: Position[];
    }) => string;
  }).positionAfterEmployeeChange;
  expect(decide).toBeTypeOf('function');
  const nextEmployee = {
    ...employee,
    id: 'lee',
    firstName: 'Lee',
    positionIds: [],
  } as Employee;
  expect(decide!({
    positionId: 'cashier',
    nextEmployeeId: 'lee',
    employees: [employee, nextEmployee],
    positions,
  })).toBe('');
  expect(decide!({
    positionId: 'cashier',
    nextEmployeeId: 'sam',
    employees: [employee, nextEmployee],
    positions,
  })).toBe('cashier');
});

it('changing to an employee role clears an incompatible designated-lead flag', async () => {
  const assignmentModule = await import('../../../../components/shift-assignment-fields');
  const decideLead = (assignmentModule as unknown as {
    designatedLeadAfterEmployeeChange?: (input: {
      checked: boolean;
      nextEmployeeId: string;
      employees: Employee[];
    }) => boolean;
  }).designatedLeadAfterEmployeeChange;
  expect(decideLead).toBeTypeOf('function');
  const nextEmployee = {
    ...employee,
    id: 'lee',
    firstName: 'Lee',
    role: 'EMPLOYEE',
    positionIds: [],
  } as Employee;
  expect(decideLead!({
    checked: true,
    nextEmployeeId: 'lee',
    employees: [employee, nextEmployee],
  })).toBe(false);
  expect(decideLead!({
    checked: true,
    nextEmployeeId: 'sam',
    employees: [employee, nextEmployee],
  })).toBe(true);
});
