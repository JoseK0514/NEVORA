import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import type {DeviceSnapshot} from '../../lib/notifications/device-client';
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
