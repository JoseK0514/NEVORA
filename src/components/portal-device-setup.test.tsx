import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DeviceSetupContent } from './portal-device-setup';
const base={state:'ready' as const, standalone:false as const, ios:false, installPrompt:false, testAllowed:false, instructions:false, onEnable:()=>{},onDismiss:()=>{},onInstructions:()=>{},onInstall:()=>{},onTurnOff:()=>{},onTest:()=>{},onRetry:()=>{}};
it('uses approved copy and equal peer action classes',()=>{
 const html=renderToStaticMarkup(<DeviceSetupContent {...base}/>);
 expect(html).toContain('Keep Nuvora Handy'); expect(html).toContain('Add Nuvora to your Home Screen for quick access to your schedule.');
 expect(html).toContain('portal-device-actions'); expect(html).toContain('Not Now');
 expect(html).not.toContain('Test Notification');
});
it('denied gives restoration instructions without Enable',()=>{
 const html=renderToStaticMarkup(<DeviceSetupContent {...base} state="denied"/>);
 expect(html).toContain('browser or device settings'); expect(html).not.toContain('>Enable Notifications<');
});
it('only enabled current authorized devices expose Test Notification',()=>{
 expect(renderToStaticMarkup(<DeviceSetupContent {...base} state="enabled" testAllowed/>)).toContain('Test Notification');
 expect(renderToStaticMarkup(<DeviceSetupContent {...base} state="pending" testAllowed/>)).not.toContain('Test Notification');
});
it('queued/provider accepted copy never claims receipt and pending has explicit state',()=>{
 const html=renderToStaticMarkup(<DeviceSetupContent {...base} state="enabled" message="Test queued. Provider acceptance does not confirm receipt."/>);
 expect(html).toContain('does not confirm receipt');
 expect(renderToStaticMarkup(<DeviceSetupContent {...base} state="pending"/>)).toContain('disabled');
});
