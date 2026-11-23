import {beforeEach,expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';

// The location Manager's /app (Nov 22, 2026): the company Manager's Direction B Home, limited to this Manager's places.
const f=rs.hoisted(()=>({locations:[{id:'L1',name:'Fictional Cafe — Condado',shortName:'Condado'}] as {id:string;name:string;shortName:string}[],
 schedule:rs.fn(),home:rs.fn(),who:rs.fn(),company:rs.fn(),failed:false}));
rs.mock('@/lib/auth/session',()=>({requireSession:async()=>({id:'OWN-DANI',role:'MANAGER',firstName:'Daniel'}),requireSessionMutationProof:async()=>({employee:{id:'OWN-DANI',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/auth/permissions',()=>({isManagerRole:()=>true}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({readOperationalAuthority:async()=>({state:'ready',employeeId:'OWN-DANI',role:'MANAGER',scope:{mode:'LOCATIONS',locationIds:f.locations.map(l=>l.id)},locations:f.locations,authority:'fixture',observedAt:'2026-11-22T12:00:00Z',validForMs:15000}),
 withOperationalCompany:async()=>{f.company();return {state:'unavailable',reason:'access_denied'};}}));
rs.mock('@/lib/company-access/operational-read.server',()=>({readOperationalSchedule:async(_proof:unknown,query:unknown)=>{f.schedule(query);if(f.failed)throw Error('read failed');
 return {state:'ready',authority:'fixture',data:{shifts:[{employeeId:'E1',date:'2026-11-16',startTime:'08:00',endTime:'16:00'},{employeeId:'E2',date:'2026-11-22',startTime:'22:00',endTime:'06:00'}]}};}}));
rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'fixture',name:'Fictional Cafe',timeZone:'America/Puerto_Rico'})}));
rs.mock('@/lib/business-time',()=>({businessDate:()=>'2026-11-22'}));
rs.mock('@/lib/workspace-presentation/current.server',()=>({currentPresentation:async()=>({modules:{timeOff:true,updates:true}})}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children}:{children:ReactNode})=><div data-frame="">{children}</div>}));
rs.mock('@/components/company-access/scoped-home',()=>({ScopedHomeLive:(props:{homeB:{place:ReactNode}})=>{f.home(props);return <div>{props.homeB.place}</div>;},ScopedWhosWorking:(props:unknown)=>{f.who(props);return <p>Who’s working</p>;}}));
rs.mock('@/components/action-menu',()=>({ActionMenu:({ariaLabel,children}:{ariaLabel:string;children:ReactNode})=><div aria-label={ariaLabel}>{children}</div>}));
rs.mock('next/link',()=>({default:({href,children,...props}:{href:string;children:ReactNode})=><a href={href} {...props}>{children}</a>}));
import Page from './page';

const page=async(params:Record<string,string>={})=>renderToStaticMarkup(await Page({searchParams:Promise.resolve(params)}));
const homeProps=()=>f.home.mock.calls.at(-1)![0] as {locationId?:string;weekStart:string;homeB:{firstName:string;thisWeek?:false;shortcuts:string[];scheduledHours:number;people:number;days:{shiftCount:number}[]}};
beforeEach(()=>{f.locations=[{id:'L1',name:'Fictional Cafe — Condado',shortName:'Condado'}];f.failed=false;for(const fn of [f.schedule,f.home,f.who,f.company])fn.mockReset();});

it('names the one place on the band and feeds This week from the scoped schedule read, never the company dashboard',async()=>{
 const html=await page();
 expect(html).toContain('class="b-date b-place"');
 expect(html).toContain('Condado</span>');
 expect(f.schedule).toHaveBeenCalledWith({weekStart:'2026-11-16'});
 expect(f.company).not.toHaveBeenCalled();
 const props=homeProps();
 expect(props.weekStart).toBe('2026-11-16');
 expect(props.locationId).toBeUndefined();
 expect(props.homeB).toMatchObject({firstName:'Daniel',scheduledHours:16,people:2,shortcuts:['shift','timeOff']});
 expect(props.homeB.days.map(day=>day.shiftCount)).toEqual([1,0,0,0,0,0,1]);
 expect(props.homeB.thisWeek).toBeUndefined();
});

it('offers a location menu with several places, and limits the reads to a chosen one it manages',async()=>{
 f.locations=[{id:'L1',name:'Fictional Cafe — Condado',shortName:'Condado'},{id:'L2',name:'Fictional Cafe — Santurce',shortName:'Santurce'}];
 const all=await page();
 expect(all).toContain('aria-label="Location: All your locations"');
 expect(all).toContain('href="/app?location=L2"');
 expect(homeProps().locationId).toBeUndefined();
 const one=await page({location:'L2'});
 expect(one).toContain('aria-label="Location: Santurce"');
 expect(f.schedule).toHaveBeenLastCalledWith({weekStart:'2026-11-16',locationId:'L2'});
 expect(homeProps().locationId).toBe('L2');
 // A location outside this Manager's places is ignored.
 await page({location:'L9'});
 expect(homeProps().locationId).toBeUndefined();
});

it('leaves This week out when the schedule read fails',async()=>{
 f.failed=true;await page();
 expect(homeProps().homeB.thisWeek).toBe(false);
});

it("opens Who's working from the same scoped reads, back to the same Home",async()=>{
 f.locations=[{id:'L1',name:'Fictional Cafe — Condado',shortName:'Condado'},{id:'L2',name:'Fictional Cafe — Santurce',shortName:'Santurce'}];
 await page({view:'attendance',location:'L2'});
 expect(f.who).toHaveBeenCalledWith({homeHref:'/app?location=L2',locationId:'L2',place:'Santurce'});
 expect(f.home).not.toHaveBeenCalled();
});
