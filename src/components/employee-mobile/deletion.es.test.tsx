import {describe,expect,it,rs} from '@rstest/core';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
rs.mock('@/app/app/account/delete/actions',()=>({requestAccountDeletion:rs.fn()}));
rs.mock('@/app/login/actions',()=>({logout:rs.fn()}));
import {EmployeeDeletionView,type DeletionView} from './deletion';
import {MobileLangProvider} from './mobile-lang';
import type {DeletionFormState} from '@/app/app/account/delete/actions';
import {withoutB} from '../owner-b/test-support';

// Fictional account and period.
const account={name:'Own Person',role:'Employee',employeeId:'FICTIONAL-E1'};
const base:DeletionView={state:{kind:'idle'},pending:false,retry:false,confirmed:false,shown:false,period:'30 días',retention:'Fictional retention.'};
const render=(view:Partial<DeletionView>&{state?:DeletionFormState}={})=>withoutB(renderToStaticMarkup(createElement(MobileLangProvider,{value:'es'},createElement(EmployeeDeletionView,{account,view:{...base,...view},action:()=>{},onPassword:()=>{},onShown:()=>{},onConfirmed:()=>{}})))).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

describe('Employee mobile account deletion in Spanish',()=>{
 it('draws the form in Spanish',()=>{
  const plain=render();
  for(const value of ['Eliminar cuenta','Qué eliminamos','Tu acceso termina de inmediato','En un plazo de 30 días, intentamos eliminar','Qué conserva tu patrono','Qué se puede conservar','Confirma que eres tú','Escribe tu contraseña','Entiendo que mi cuenta de NEVORA se eliminará','Eliminar mi cuenta','No se puede deshacer.'])expect(plain).toContain(value);
  for(const value of ['What we delete','What your employer keeps','Confirm it’s you','Delete my account','This can’t be undone.'])expect(plain).not.toContain(value);
  expect(render({state:{kind:'wrong_password'} as DeletionFormState})).toContain('Esa contraseña no es correcta. Inténtalo de nuevo.');
 });
 it('draws the receipt and the ended outcomes in Spanish',()=>{
  const plain=render({state:{kind:'received',reference:'DEL-FICT0001',confirmedAt:'2030-01-01 10:00:00+00'}});
  for(const value of ['Eliminación solicitada','Recibimos tu solicitud de eliminación','Recibida el 1 ene 2030','Copiar referencia','Se cerró tu sesión en todas partes','Tu empleo no cambia','Terminar'])expect(plain).toContain(value);
  for(const value of ['Deletion requested','Copy reference','Received '])expect(plain).not.toContain(value);
  expect(render({state:{kind:'signed_out'}})).toContain('No encontramos una solicitud de eliminación para esta cuenta');
 });
});
