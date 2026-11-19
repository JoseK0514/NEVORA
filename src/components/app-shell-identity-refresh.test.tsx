import {expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';

const fixture=rs.hoisted(()=>({refresh:rs.fn(),changed:undefined as undefined|((reason:'identity'|'scope')=>void)}));
rs.mock('next/navigation',()=>({usePathname:()=>'/app/reports',useSearchParams:()=>new URLSearchParams(),useRouter:()=>({refresh:fixture.refresh})}));
rs.mock('next/link',()=>({default:({children,...props}:{children:ReactNode})=><a {...props}>{children}</a>,useLinkStatus:()=>({pending:false})}));
rs.mock('next/image',()=>({default:()=>null}));
rs.mock('@/app/login/actions',()=>({logout:rs.fn()}));
rs.mock('./app-navigation',()=>({
 AppNavigationProvider:({children}:{children:ReactNode})=>children,
 useAppNavigation:()=>null,
 useIdentityReload:(revalidate?:()=>void)=>({request:()=>revalidate?.()}),
}));
rs.mock('./company-access/use-operational-navigation',()=>({
 useOperationalNavigation:(_id:string,_role:string,_initial:unknown,changed:(reason:'identity'|'scope')=>void)=>{
  fixture.changed=changed;return {view:null,refreshing:false,paused:true,retry:rs.fn()};
 },
}));
import {AppShell} from './app-shell';

it('revalidates the retained server layout after an identity change through the navigation barrier',()=>{
 renderToStaticMarkup(<AppShell workspaceName="Fictional QA" user={{id:'QA-M',firstName:'Morgan',lastName:'QA',role:'MANAGER'}}>Private view</AppShell>);
 expect(fixture.changed).toBeTypeOf('function');
 fixture.changed?.('identity');
 expect(fixture.refresh).toHaveBeenCalledTimes(1);
});
