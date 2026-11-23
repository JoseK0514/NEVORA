// Signed-in Spanish (es-rest): Home's live status line has a Spanish entry for every English one, and a Spanish
// speaker hears it in Spanish while Home checks what needs them (fictional data, no reads).
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {PREMIUM_HOME_COPY} from './premium-home-copy';
rs.mock('./owner-home-corp',()=>({toDoSentence:()=>'',OwnerHomeCorp:({summary}:{summary:string})=><p role="status">{summary}</p>}));
const {PremiumHomeSurface}=await import('./premium-home');

it('has a Spanish entry for every English word',()=>{
 expect(Object.keys(PREMIUM_HOME_COPY.es).sort()).toEqual(Object.keys(PREMIUM_HOME_COPY.en).sort());
});

it('says what Home is doing in Spanish',()=>{
 const surface=(connection:'loading'|'offline')=><PremiumHomeSurface corporate greeting="" dateLabel="" timeZone="America/Puerto_Rico" today={null} actions={null} actionsConnection={connection}
  week={{weekStart:'2026-11-16',weekLabel:'',plannedShifts:0,availabilitySubmitted:0,availabilityEligible:0,locations:[]}}/>;
 expect(renderToStaticMarkup(<PortalLangProvider lang="es">{surface('loading')}</PortalLangProvider>)).toContain('Revisando qué necesita tu atención…');
 expect(renderToStaticMarkup(<PortalLangProvider lang="es">{surface('offline')}</PortalLangProvider>)).toContain('No tienes conexión.');
 expect(renderToStaticMarkup(surface('offline'))).toContain('You’re offline.');
});
