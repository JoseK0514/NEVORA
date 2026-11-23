// G98 (Phase 2): the posted open shifts board follows the signed-in person's language (PortalLangProvider).
import {createElement} from 'react';
import {expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {OpenShiftBoard} from './open-shift-board';

rs.mock('./actions',()=>({submitOpenShift:rs.fn()}));
const hasWord=(s:string,w:string)=>new RegExp(`(^|[^\\p{L}])${w}(?![\\p{L}])`,"u").test(s);
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/[\s ]+/g,' ').trim();
const shift={id:'fictional-posting',date:'2026-11-25',startTime:'07:00',endTime:'15:00',locationName:'Condado',positionName:'Barista',state:'open'};
const es=(management:boolean,shifts:unknown[],locations:{id:string;name:string}[]=[],positions:{id:string;name:string}[]=[])=>text(renderToStaticMarkup(<PortalLangProvider lang="es"><OpenShiftBoard actorId="fictional-worker" management={management} postId="fictional-post" shifts={shifts as never} locations={locations} positions={positions} /></PortalLangProvider>));

it('lists claimable shifts in Spanish',()=>{
 const words=es(false,[shift]);
 for(const w of ['Turnos que puedes tomar','mié, 25 nov · 7:00 a. m. – 3:00 p. m.','Tomar'])expect(words).toContain(w);
 for(const w of ['Shifts you can claim','Claim','AM','Wed'])expect(hasWord(words,w)).toBe(false);
 expect(es(false,[])).toContain('Ahora no hay turnos publicados que puedas tomar.');
});
it('shows the manager’s post form and postings in Spanish',()=>{
 const words=es(true,[shift],[{id:'l',name:'Condado'}],[{id:'p',name:'Barista'}]);
 for(const w of ['Publicar un turno disponible','Localidad','Elige una localidad','Puesto','Fecha','Empieza','Termina','Publicar turno','Turnos publicados','Disponible','Retirar'])expect(words).toContain(w);
 for(const w of ['Post an open shift','Location','Position','Starts','Ends','Withdraw','Open'])expect(hasWord(words,w)).toBe(false);
});
