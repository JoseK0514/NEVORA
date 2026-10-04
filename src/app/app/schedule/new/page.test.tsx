import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {ShiftAssignmentFields} from '../../../../components/shift-assignment-fields';
import type {Employee,Position} from '../../../../lib/domain';
const employee={id:'sam',firstName:'Sam',lastName:'Rivera',active:true,role:'LEAD',positionIds:['cashier']} as Employee;
const positions=[{id:'cashier',name:'Cashier',active:true},{id:'barista',name:'Barista',active:true},{id:'old',name:'Old',active:false}] as Position[];
it('sole qualification and access role never infer assigned position',()=>{const html=renderToStaticMarkup(createElement(ShiftAssignmentFields,{employees:[employee],positions,employeeId:'sam'}));expect(html).toContain('<option value="" selected="">No position</option>');expect(html).toContain('Cashier');expect(html).not.toContain('Barista');expect(html).not.toContain('Old');});
it('edit retains explicit existing position while labels unavailable references',()=>{const html=renderToStaticMarkup(createElement(ShiftAssignmentFields,{employees:[employee],positions,employeeId:'sam',positionId:'old'}));expect(html).toContain('Old (unavailable');expect(html).toContain('value="old" disabled="" selected=""');});
