import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';

const fixture=vi.hoisted(()=>({refresh:vi.fn(),changed:undefined as undefined|((reason:'identity'|'scope')=>void)}));
vi.mock('next/navigation',()=>({usePathname:()=>'/app/reports',useSearchParams:()=>new URLSearchParams(),useRouter:()=>({refresh:fixture.refresh})}));
vi.mock('next/link',()=>({default:({children,...props}:{children:ReactNode})=><a {...props}>{children}</a>,useLinkStatus:()=>({pending:false})}));
vi.mock('next/image',()=>({default:()=>null}));
vi.mock('@/app/login/actions',()=>({logout:vi.fn()}));
vi.mock('./app-navigation',()=>({
 AppNavigationProvider:({children}:{children:ReactNode})=>children,
 useAppNavigation:()=>null,
 useIdentityReload:(revalidate?:()=>void)=>({request:()=>revalidate?.()}),
}));
vi.mock('./company-access/use-operational-navigation',()=>({
 useOperationalNavigation:(_id:string,_role:string,_initial:unknown,changed:(reason:'identity'|'scope')=>void)=>{
  fixture.changed=changed;return {view:null,refreshing:false,paused:true,retry:vi.fn()};
 },
}));
import {AppShell} from './app-shell';

it('revalidates the retained server layout after an identity change through the navigation barrier',()=>{
 renderToStaticMarkup(<AppShell workspaceName="Fictional QA" user={{id:'QA-M',firstName:'Morgan',lastName:'QA',role:'MANAGER'}}>Private view</AppShell>);
 expect(fixture.changed).toBeTypeOf('function');
 fixture.changed?.('identity');
 expect(fixture.refresh).toHaveBeenCalledTimes(1);
});
