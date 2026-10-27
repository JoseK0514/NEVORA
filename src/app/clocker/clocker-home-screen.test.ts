import {beforeEach,expect,it,vi} from 'vitest';
import {generateMetadata} from './[location]/page';
import {GET} from './[location]/manifest.webmanifest/route';
const f=vi.hoisted(()=>({active:true,failed:false,calls:[] as string[]}));
vi.mock('@/lib/data/locations',()=>({findActiveLocationByClockerKey:async(key:string)=>{f.calls.push(key);if(f.failed)throw Error('private database failure');return f.active?{clockerKey:key}:null;}}));
vi.mock('@/lib/clocker/pin-crypto.server',()=>({readPinKey:()=>Buffer.alloc(32)}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:vi.fn()}));
vi.mock('@/lib/workspace-presentation/current.server',()=>({currentBrand:vi.fn()}));
vi.mock('@/lib/workspace-presentation/derive',()=>({clockerBrandStyle:vi.fn()}));
vi.mock('@/components/clocker-setup',()=>({ClockerSetup:vi.fn()}));
const args=(location:string)=>({params:Promise.resolve({location})});
const request=new Request('https://fictional.invalid/clocker/2/manifest.webmanifest');
beforeEach(()=>{f.active=true;f.failed=false;f.calls=[];});
it('offers a Clocker Home Screen identity with approved Apple icon and location launch URL',async()=>{
 const metadata=await generateMetadata(args('2'));
 expect(metadata).toMatchObject({manifest:'/clocker/2/manifest.webmanifest',applicationName:'NEVORA Clocker',appleWebApp:{capable:true,title:'Clocker',statusBarStyle:'default'},other:{'apple-mobile-web-app-capable':'yes'},icons:{apple:'/icons/fuel-apple-180.png'}});
 expect(f.calls).toEqual([]);
});
it('starts at the exact Clocker key in standalone mode without a portal identity or orientation lock',async()=>{
 const response=await GET(request,args('main-office'));
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toContain('application/manifest+json');expect(response.headers.get('cache-control')).toContain('no-store');
 const manifest=await response.json();expect(manifest).toMatchObject({id:'/clocker/main-office',start_url:'/clocker/main-office',scope:'/clocker/',display:'standalone',orientation:'any',name:'NEVORA Clocker'});
 expect(manifest.icons.map((i:{src:string})=>i.src)).toContain('/icons/fuel-apple-180.png');expect(JSON.stringify(manifest)).not.toMatch(/fuel-portal|\/app|employeeId|credential|token|workspaceId/);
});
it('gives different location shortcuts distinct stable identities',async()=>{
 const a=await(await GET(request,args('2'))).json(),b=await(await GET(request,args('110'))).json();expect(a.id).not.toBe(b.id);expect(a.start_url).toBe('/clocker/2');expect(b.start_url).toBe('/clocker/110');
});
it('rejects malformed keys before a lookup and withholds inactive launch manifests',async()=>{
 expect(await generateMetadata(args('../app'))).toEqual({});expect((await GET(request,args('../app'))).status).toBe(404);expect(f.calls).toEqual([]);
 f.active=false;expect((await GET(request,args('2'))).status).toBe(404);
});
it('keeps a configuration failure unavailable without disclosing private error details',async()=>{
 f.failed=true;const response=await GET(request,args('2'));expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toContain('no-store');expect(await response.text()).not.toContain('private database failure');
});
