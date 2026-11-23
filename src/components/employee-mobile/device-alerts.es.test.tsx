import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import type {DeviceSnapshot} from '../../lib/notifications/device-client';
import {EmployeeDeviceAlertsView} from './device-alerts';
import {MobileLangProvider} from './mobile-lang';
const ready:DeviceSnapshot={state:'ready',server:{supported:true,enabled:false,configurationAvailable:true,testAllowed:false},standalone:true,capabilities:{secure:true,push:true,notifications:true,serviceWorker:true,requiresStandalone:false,installPrompt:false}};
const view=(snapshot:DeviceSnapshot|null,options:Record<string,unknown>={})=>renderToStaticMarkup(createElement(MobileLangProvider,{value:'es'},createElement(EmployeeDeviceAlertsView,{snapshot,paused:false,enabled:true,canInstall:false,confirm:false,onEnable:()=>{},onRefresh:()=>{},onPostpone:()=>{},onInstall:()=>{},onReview:()=>{},onKeep:()=>{},onTurnOff:()=>{},onTest:()=>{},...options})));
it('draws the setup state in Spanish',()=>{
 const html=view(ready);
 for(const value of ['Este dispositivo','Las alertas están desactivadas','>Desactivadas<','>Activar alertas<','>Ahora no<','Estos ajustes aplican solo a este navegador.'])expect(html).toContain(value);
 for(const value of ['This device','Alerts are off','Turn on alerts','Not now','These settings apply'])expect(html).not.toContain(value);
 expect(view(null,{enabled:false})).toContain('Tu trabajo no ha habilitado las alertas en dispositivos.');
 expect(view(null)).toContain('Verificando el permiso y el registro de este dispositivo…');
});
it('draws the on state, the turn-off review and the pending cleanup in Spanish',()=>{
 const snapshot:DeviceSnapshot={...ready,state:'enabled',server:{...ready.server,enabled:true,ownershipGeneration:'own',localOwned:true,testAllowed:true}};
 const on=view(snapshot);expect(on).toContain('>Activadas<');expect(on).toContain('>Probar notificación<');expect(on).toContain('>Desactivar alertas<');
 const review=view(snapshot,{confirm:true});expect(review).toContain('¿Desactivar alertas aquí?');expect(review).toContain('>Conservar configuración<');expect(review).not.toContain('Keep current setup');
 const cleanup=view({...ready,state:'error',cleanupPending:true,server:{...ready.server,enabled:true,ownershipGeneration:'original',testAllowed:true,localOwned:false},message:'Server cleanup is pending.'});
 expect(cleanup).toContain('La desactivación sigue pendiente.');expect(cleanup).toContain('>Reintentar desactivación<');expect(cleanup).not.toContain('Turn-off is still pending');
});
