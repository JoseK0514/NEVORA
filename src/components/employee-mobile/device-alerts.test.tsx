import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import type {DeviceSnapshot} from '../../lib/notifications/device-client';
import {EmployeeAlertsB} from '../employee-b/account-b-client';
const ready:DeviceSnapshot={state:'ready',server:{supported:true,enabled:false,configurationAvailable:true,testAllowed:false},standalone:true,capabilities:{secure:true,push:true,notifications:true,serviceWorker:true,requiresStandalone:false,installPrompt:false}};
async function view(snapshot:DeviceSnapshot|null,options:Record<string,unknown>={}){const m=await import('./device-alerts').catch(()=>({}));expect(m).toHaveProperty('EmployeeDeviceAlertsView');return renderToStaticMarkup(createElement((m as typeof import('./device-alerts')).EmployeeDeviceAlertsView,{snapshot,paused:false,enabled:true,canInstall:false,confirm:false,onEnable:()=>{},onRefresh:()=>{},onPostpone:()=>{},onInstall:()=>{},onReview:()=>{},onKeep:()=>{},onTurnOff:()=>{},onTest:()=>{},...options}));}
it('current-device setup offers explicit consent without employee topic or other-device controls',async()=>{
 const html=await view(ready);expect(html).toContain('Turn on alerts');expect(html).toContain('Not now');expect(html).not.toMatch(/type="checkbox"|role="switch"|Other devices|Quiet hours|SMS/);
 expect(await view(ready,{paused:true})).not.toContain('Turn on alerts');expect(await view(ready,{enabled:false})).not.toContain('Turn on alerts');
});
it('settled feature-off and paused states are not announced as busy',async()=>{
 expect(await view(null,{enabled:false})).toContain('aria-busy="false"');
 expect(await view(null,{paused:true})).toContain('aria-busy="false"');
 expect(await view(null)).toContain('aria-busy="true"');
});
it('an uncertain cleanup offers original recovery without an enabled claim or test command',async()=>{
 const html=await view({...ready,state:'error',cleanupPending:true,server:{...ready.server,enabled:true,ownershipGeneration:'original',testAllowed:true,localOwned:false},message:'Server cleanup is pending.'});
 expect(html).toContain('block NEVORA notifications in your device or browser settings');expect(html).not.toContain('Server cleanup is pending.');expect(html).toContain('Alerts may still be on');expect(html).toContain('Retry turn off');expect(html).toContain('latest status');expect(html).not.toContain('Test notification');expect(html).not.toContain('Alerts are on');
});
it('only verified enabled ownership exposes the gated test and removal explains its scope',async()=>{
 const snapshot:DeviceSnapshot={...ready,state:'enabled',server:{...ready.server,enabled:true,ownershipGeneration:'own',localOwned:true,testAllowed:true}};
 expect(await view(snapshot)).toContain('Test notification');
 const html=await view(snapshot,{confirm:true});expect(html).toContain('Keep current setup');expect(html).toContain('Turn off alerts');expect(html).toContain('browser permission');expect(html).not.toContain('Test notification');
 expect(await view({...snapshot,accessChanged:true})).not.toContain('Test notification');
});
const phone=(snapshot:DeviceSnapshot|null,options:Record<string,unknown>={})=>renderToStaticMarkup(createElement(EmployeeAlertsB,{snapshot,paused:false,enabled:true,canInstall:false,confirm:false,onEnable:()=>{},onRefresh:()=>{},onPostpone:()=>{},onInstall:()=>{},onReview:()=>{},onKeep:()=>{},onTurnOff:()=>{},onTest:()=>{},...options}));
it('Direction B phone screen: workplace alerts off is a grey Unavailable chip with the note in the card',()=>{
 const html=phone(null,{enabled:false});
 for(const value of ['Alerts on this device','Settings for this browser only','This device','>Unavailable<','Your workplace hasn’t turned on device alerts','Your notifications always stay in NEVORA, and your phone’s settings can turn off every alert.'])expect(html).toContain(value);
 expect(html).toContain('href="/app/notifications"');expect(html).toContain('b-chip b-chip--grey');expect(html).not.toContain('Turn on alerts');expect(html).toContain('aria-busy="false"');
});
it('Direction B phone screen: every other state keeps its words and real controls',()=>{
 const setup=phone(ready);expect(setup).toContain('Turn on alerts');expect(setup).toContain('Not now');expect(setup).toContain('>Off<');expect(setup).not.toMatch(/type="checkbox"|role="switch"/);
 expect(phone(null)).toContain('aria-busy="true"');expect(phone(null)).toContain('Checking permission and this device’s enrollment…');
 const enabled:DeviceSnapshot={...ready,state:'enabled',server:{...ready.server,enabled:true,ownershipGeneration:'own',localOwned:true,testAllowed:true}};
 const on=phone(enabled);expect(on).toContain('>On<');expect(on).toContain('Test notification');expect(on).toContain('Turn off alerts');
 const review=phone(enabled,{confirm:true});expect(review).toContain('Turn off alerts here?');expect(review).toContain('Keep current setup');expect(review).not.toContain('Test notification');
 expect(phone({...ready,state:'denied'})).toContain('>Blocked<');
 const cleanup=phone({...ready,state:'error',cleanupPending:true,server:{...ready.server,enabled:true,ownershipGeneration:'original',testAllowed:true,localOwned:false},message:'Server cleanup is pending.'});
 expect(cleanup).toContain('Alerts may still be on');expect(cleanup).toContain('Retry turn off');expect(cleanup).not.toContain('Test notification');expect(cleanup).not.toContain('Server cleanup is pending.');
 expect(phone({...enabled,accessChanged:true})).toContain('href="/login"');
 expect(phone(ready,{ending:true})).toContain('Signing out…');
});
