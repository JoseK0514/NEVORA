import {expect,it} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import {EmployeePasskeyView} from './passkeys';
import {MobileLangProvider} from './mobile-lang';
import type {PasskeyState} from '../../lib/passkeys/management';
// A fictional passkey.
const noop=()=>{},key={id:'11111111-1111-4111-8111-111111111111',name:'Mi teléfono',createdAt:'2026-10-27T12:00:00.000Z',lastUsedAt:null};
const state:PasskeyState={phase:'ready',passkeys:[key],busy:null,notice:'',needsRefresh:false};
const render=(next:Partial<PasskeyState>={},confirm=false)=>renderToStaticMarkup(<MobileLangProvider value="es"><EmployeePasskeyView mobile state={{...state,...next}} supported confirm={confirm?key:null} onAdd={noop} onRefresh={noop} onRemove={noop} onReview={noop} onKeep={noop} onCancel={noop}/></MobileLangProvider>);
it('draws saved passkeys in Spanish',()=>{
 const html=render();
 for(const value of ['Llaves de acceso guardadas','Agregada el ','27 oct 2026','Sin usar todavía','aria-label="Quitar Mi teléfono"','>Agregar llave de acceso<','NEVORA no recibe tus datos biométricos'])expect(html).toContain(value);
 for(const value of ['Saved passkeys','Added ','Not used yet','Add a passkey','biometric data'])expect(html).not.toContain(value);
 expect(render({passkeys:[]})).toContain('Ninguna todavía');
});
it('draws the removal review and the read states in Spanish',()=>{
 const review=render({},true);
 for(const value of ['¿Quitar “','Esta es tu última llave de acceso guardada.','>Conservar llave de acceso<','>Quitar llave de acceso<'])expect(review).toContain(value);
 expect(review).not.toContain('Keep passkey');
 expect(render({phase:'loading'})).toContain('Verificando tus llaves de acceso guardadas…');
 expect(render({phase:'disabled'})).toContain('Las llaves de acceso no están disponibles aquí');
 expect(render({phase:'unavailable',passkeys:null,needsRefresh:true})).toContain('>Actualizar llaves de acceso<');
});
