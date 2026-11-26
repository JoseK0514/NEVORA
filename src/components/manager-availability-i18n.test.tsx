import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import type {ReactNode} from 'react';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
const m=rs.hoisted(()=>({lang:'en' as 'en'|'es'}));
rs.mock('@/lib/activation/language.server',()=>({readPortalLanguage:async()=>({language:m.lang})}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>({employee:{id:'owner',role:'OWNER'}})}));
rs.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>({role:'OWNER'})}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:async(_proof:unknown,load:()=>Promise<unknown>)=>({state:'ready',data:await load()})}));
rs.mock('@/lib/data/employees',()=>({listEmployees:async()=>[],listLocations:async()=>[]}));
rs.mock('@/lib/data/availability',()=>({listTeamAvailabilityWindows:async()=>[]}));
rs.mock('@/lib/data/availability-submissions',()=>({listAvailabilitySubmissionStatuses:async()=>[]}));
rs.mock('@/lib/data/week-settings',()=>({getUpcomingAvailabilityWeek:async()=>({weekStart:'2026-12-07'}),getWeekSettings:async()=>({availabilityDeadline:null})}));
rs.mock('@/lib/notifications/config',()=>({readNotificationConfig:()=>({featureEnabled:false})}));
rs.mock('@/lib/communications/service.server',()=>({communicationAuthority:()=>undefined}));
rs.mock('@/components/company-access/scoped-read-frame',()=>({ScopedReadFrame:({children}:{children:ReactNode})=>children}));
import {ManagerAvailability} from './manager-availability';
it('renders management Availability in the signed-in language and keeps English text',async()=>{
 for(const lang of ['en','es'] as const){
  m.lang=lang;
  const page=await ManagerAvailability({timeZone:'America/Puerto_Rico',currentWeek:'2026-12-07'});
  const html=renderToStaticMarkup(<PortalLangProvider lang={lang}>{page}</PortalLangProvider>);
  for(const phrase of lang==='es'?['Disponibilidad','Semana del 7–13 dic','Fecha límite','Sin fijar']:['Availability','Week of Dec','Deadline','Not set'])expect(html).toContain(phrase);
  expect(html).not.toContain(lang==='es'?'>Deadline<':'>Fecha límite<');
 }
});
