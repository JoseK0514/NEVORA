import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {EmployeePasskeyView} from './passkeys';
import type {PasskeyState} from '../../lib/passkeys/management';
const noop=()=>{},key={id:'11111111-1111-4111-8111-111111111111',name:'My phone',createdAt:'2026-10-27T12:00:00.000Z',lastUsedAt:null};
const state:PasskeyState={phase:'ready',passkeys:[key],busy:null,notice:'',needsRefresh:false};
const render=(next:Partial<PasskeyState>={},supported=true,confirm=false)=>renderToStaticMarkup(<EmployeePasskeyView mobile state={{...state,...next}} supported={supported} confirm={confirm?key:null} onAdd={noop} onRefresh={noop} onRemove={noop} onReview={noop} onKeep={noop} onCancel={noop}/>);
it('shows only saved own metadata with honest native setup instructions',()=>{
 const html=render();expect(html).toContain('Saved passkeys');expect(html).toContain('My phone');expect(html).toContain('Not used yet');expect(html).toContain('NEVORA does not receive your biometric data');expect(render({passkeys:[]})).toContain('device’s screen lock');expect(render({passkeys:[]})).toContain('No saved passkeys');expect(html).not.toContain('Set up Face ID');expect(html).not.toContain('Rename');
});
it('keeps saved-key removal available when this browser cannot create credentials',()=>{
 const html=render({},false);expect(html).toContain('Remove My phone');expect(html).not.toContain('>Add a passkey<');expect(html).toContain('still manage your saved passkeys');
});
it.each(['loading','paused','unavailable','denied','disabled','ended'] as const)('never renders private metadata or removal review while %s',phase=>{
 const html=render({phase},true,true);expect(html).not.toContain('My phone');expect(html).not.toContain('>Add a passkey<');
});
it('separates current uncertainty from saved facts and never offers blind mutation retry',()=>{
 const html=render({phase:'unavailable',passkeys:null,needsRefresh:true,notice:'We could not confirm the result.'});expect(html).toContain('Refresh passkeys');expect(html).not.toContain('Try setup again');
});
it('states last-key consequences before explicit removal and preserves the safe Keep choice',()=>{
 const html=render({},true,true);expect(html).toContain('last saved passkey');expect(html).toContain('Keep passkey');expect(html).toContain('Remove passkey');expect(html).toContain('does not delete it from your device');
});
it('draws the same corporate card on a computer, with one primary Add a passkey and a red Remove',()=>{
 const html=renderToStaticMarkup(<EmployeePasskeyView mobile={false} state={state} supported confirm={null} onAdd={noop} onRefresh={noop} onRemove={noop} onReview={noop} onKeep={noop} onCancel={noop}/>);
 expect(html).not.toContain('<dialog');expect(html).toContain('Saved passkeys');expect(html).toContain(' · Not used yet');expect(html).toContain('>Add a passkey<');expect(html.match(/class="c-btn c-btn--full"/g)).toHaveLength(1);expect(html).toContain('em-account-textbtn--danger');
});
vi.unstubAllGlobals();
