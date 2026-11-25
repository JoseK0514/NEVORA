// Clocker UI step 3 (Option C, Jose's pick Nov 25, 2026): the name picker's rules, words and wiring.
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,rs} from '@rstest/core';
import {ClockerPresentation} from './clocker-language';
import {ClockerPinGate} from './clocker-pin-gate';
import {ClockerNamePicker} from './clocker-name-picker';
import {CLOCKER_ROSTER_COPY} from './clocker-roster-copy';
import {ROSTER_SEARCH_THRESHOLD,parseRoster,readRoster,rosterInitials,rosterMatches,rosterReplyCurrent,rosterSorted,selectionIsStale,verifyBody,type RosterPerson} from './clocker-roster';

afterEach(()=>{rs.unstubAllGlobals();});
const sel=(n:number)=>n.toString(16).padStart(64,'0');
const people=(names:string[]):RosterPerson[]=>names.map((displayName,i)=>({displayName,selection:sel(i+1)}));
const twelve=people(['Miguel S.','Ana C.','Lucía O.','Beatriz M.','Carlos V.','Daniela C.','Eduardo R.','Gabriela T.','Héctor D.','Isabel M.','James O.','Javier P.']);
const gate=readFileSync(new URL('./clocker-pin-gate.tsx',import.meta.url),'utf8');

it('reads the roster reply strictly: names with a well-formed selection, else the Employee ID form',()=>{
 expect(parseRoster({state:'name_picker',people:[{displayName:' Ana C. ',selection:sel(1)}]})).toEqual({kind:'picker',people:[{displayName:'Ana C.',selection:sel(1)}]});
 expect(parseRoster({state:'employee_id'})).toEqual({kind:'id'});
 // An empty list, or nothing usable in it, falls back to the Employee ID.
 expect(parseRoster({state:'name_picker',people:[]})).toEqual({kind:'id'});
 expect(parseRoster({state:'name_picker',people:[{displayName:'Ana C.',selection:'short'},{displayName:'',selection:sel(2)},null,{selection:sel(3)}]})).toEqual({kind:'id'});
 expect(()=>parseRoster(null)).toThrow();expect(()=>parseRoster([])).toThrow();expect(()=>parseRoster('name_picker')).toThrow();
});
it('sends exactly one of employeeId or selection with the PIN',()=>{
 expect(verifyBody({selection:sel(7)},'2468')).toEqual({action:'verify',selection:sel(7),pin:'2468'});
 expect(verifyBody({employeeId:'AB12'},'2468')).toEqual({action:'verify',employeeId:'AB12',pin:'2468'});
 expect(Object.keys(verifyBody({selection:sel(7)},'2468')).sort()).toEqual(['action','pin','selection']);
 expect(Object.keys(verifyBody({employeeId:'AB12'},'2468')).sort()).toEqual(['action','employeeId','pin']);
 // The gate sends the chosen name's selection, or the typed Employee ID unchanged, and never both.
 expect(gate).toContain("verifyBody(sel?{selection:sel}:{employeeId:id},pin)");
});
it('reads the roster with the kiosk headers and a one-key body, and fails on a bad status',async()=>{
 const fetch=rs.fn(async()=>new Response(JSON.stringify({state:'name_picker',people:[{displayName:'Ana C.',selection:sel(1)}]}),{status:200}));rs.stubGlobal('fetch',fetch);
 await expect(readRoster('main office')).resolves.toEqual({kind:'picker',people:[{displayName:'Ana C.',selection:sel(1)}]});
 const [url,init]=fetch.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe('/api/clocker/main%20office/pin');expect(JSON.parse(String(init.body))).toEqual({action:'roster'});
 expect(init.method).toBe('POST');expect(init.cache).toBe('no-store');expect((init.headers as Record<string,string>)['X-Nevora-Clocker']).toBe('1');
 rs.stubGlobal('fetch',rs.fn(async()=>new Response(JSON.stringify({state:'device_required'}),{status:401})));
 await expect(readRoster('main')).rejects.toThrow();
 rs.stubGlobal('fetch',rs.fn(async()=>{throw new TypeError('Failed to fetch');}));
 await expect(readRoster('main')).rejects.toThrow();
});
it('sorts, searches without accents, and draws initials from the name',()=>{
 expect(rosterSorted(twelve,'es').map(p=>p.displayName).slice(0,3)).toEqual(['Ana C.','Beatriz M.','Carlos V.']);
 expect(rosterMatches(twelve,'luc').map(p=>p.displayName)).toEqual(['Lucía O.']);
 expect(rosterMatches(twelve,'HEC').map(p=>p.displayName)).toEqual(['Héctor D.']);
 expect(rosterMatches(twelve,'  ')).toHaveLength(12);expect(rosterMatches(twelve,'zz')).toEqual([]);
 expect(rosterInitials('Lucía O.')).toBe('LO');expect(rosterInitials('Ana C.')).toBe('AC');expect(rosterInitials('Óscar')).toBe('Ó');
});
it('calls a denied selection stale only when a fresh roster no longer carries it',()=>{
 expect(selectionIsStale({kind:'picker',people:twelve},sel(1))).toBe(false);
 expect(selectionIsStale({kind:'picker',people:twelve},sel(99))).toBe(true);
 expect(selectionIsStale({kind:'id'},sel(1))).toBe(true);expect(selectionIsStale({kind:'failed'},sel(1))).toBe(true);
});
it('drops a late roster reply for an older screen',()=>{
 expect(rosterReplyCurrent(3,3)).toBe(true);expect(rosterReplyCurrent(2,3)).toBe(false);
});
it('keeps the words in English and Spanish with the same keys, tú, and the kiosk term "ID de empleado"',()=>{
 expect(Object.keys(CLOCKER_ROSTER_COPY.es).sort()).toEqual(Object.keys(CLOCKER_ROSTER_COPY.en).sort());
 const es=Object.values(CLOCKER_ROSTER_COPY.es).join(' '),en=Object.values(CLOCKER_ROSTER_COPY.en).join(' ');
 expect(CLOCKER_ROSTER_COPY.en.useId).toBe('Use employee ID');expect(CLOCKER_ROSTER_COPY.es.useId).toBe('Usar ID de empleado');
 expect(CLOCKER_ROSTER_COPY.en.back).toBe('Choose another name');
 expect(es).not.toMatch(/núm|usted|\bsu ID\b|Elija|Use su/i);expect(es).toContain('Usa tu ID de empleado');expect(es).toContain('Elige tu nombre');
 expect(en).not.toMatch(/Employee ID/);
});
it('shows every name as a tile with initials, the way out, and no search up to 12 names',()=>{
 const html=renderToStaticMarkup(<ClockerNamePicker people={twelve} lang="en" onPick={()=>{}} onUseId={()=>{}}/>);
 expect(html.match(/class="np-tile"/g)).toHaveLength(12);expect(html).toContain('aria-label="Names"');
 expect(html.indexOf('Ana C.')).toBeLessThan(html.indexOf('Beatriz M.'));
 expect(html).toContain('<span class="np-initials" aria-hidden="true">AC</span>');
 expect(html).not.toContain('type="search"');expect(ROSTER_SEARCH_THRESHOLD).toBe(12);
 expect(html).toContain('Not on the list? Use your employee ID.');expect(html).toContain('>Use employee ID</button>');
 expect(html).not.toMatch(/<img|tel:|@/);
});
it('adds the search field above 12 names, and says when the list changed',()=>{
 const html=renderToStaticMarkup(<ClockerNamePicker people={[...twelve,...people(['Zoe A.'].map(n=>n))].map((p,i)=>({...p,selection:sel(i+1)}))} lang="es" notice="stale" onPick={()=>{}} onUseId={()=>{}}/>);
 expect(html).toContain('type="search"');expect(html).toContain('placeholder="Buscar nombre"');
 expect(html).toContain('La lista cambió. Elige tu nombre otra vez.');expect(html).toContain('>Usar ID de empleado</button>');
 expect(html).toContain('¿No apareces? Usa tu ID de empleado.');expect(html).toContain('aria-label="Nombres"');
});
it('waits for the roster in a reserved area, with no form to tap, then shows the form or the names',()=>{
 const html=renderToStaticMarkup(<ClockerPresentation initialLocale="en"><ClockerPinGate locationKey="main"/></ClockerPresentation>);
 expect(html).toContain('data-clocker-roster-wait=""');expect(html).not.toContain('name="employeeId"');expect(html).not.toContain('data-clocker-names');
 expect(html).toMatch(/<h1[^>]*data-waiting=""/);expect(html).not.toContain('Getting names…');
 const css=readFileSync(new URL('./clocker-name-picker.css',import.meta.url),'utf8');
 expect(css).toContain('h1[data-waiting] { visibility: hidden; }');expect(css).toMatch(/\.np-wait \{[^}]*min-height: var\(--ck-roster-wait, /);
 // The waiting line appears only past 1s; the form returns on a reply or a failure (6s timeout).
 expect(gate).toContain('window.setTimeout(()=>setSlowRoster(true),1000)');expect(gate).toContain("{entry&&step==='id'&&!pickerOn&&!rosterLoading?<form");
 expect(CLOCKER_ROSTER_COPY.en.waiting).toBe('Getting names…');expect(CLOCKER_ROSTER_COPY.es.waiting).toBe('Buscando nombres…');
 const id=renderToStaticMarkup(<ClockerPinGate locationKey="main" initialRoster={{kind:'id'}}/>);expect(id).toContain('name="employeeId"');expect(id).not.toContain('data-clocker-roster-wait');
 const names=renderToStaticMarkup(<ClockerPinGate locationKey="main" initialRoster={{kind:'picker',people:twelve}}/>);expect(names).toContain('data-clocker-names');expect(names).toContain('Choose your name');
});
it('wires the roster lifecycle: read on sign-in and start over, cleared on leaving, hidden or a location switch',()=>{
 // Sign-in means no verified person, no blocked or offline card (a lost tablet setup is a blocked card), and in view.
 expect(gate).toContain('const signIn=!identity&&!blocked&&!offline&&visible;');
 expect(gate).toContain('const rosterKey=signIn?locationKey:null');
 expect(gate).toContain("if(rosterFor!==rosterKey){setRosterFor(rosterKey);setRoster({kind:'loading'});setPicked(null);}");
 expect(gate).toContain('if(rosterKey===null){selection.current=null;return;}');
 expect(gate).toContain('},[rosterKey,rosterTick]);');
 expect(gate).toContain('setVisible(!document.hidden)');
 // Every start over (clearEntry) drops the chosen name and reads the roster again.
 expect(gate).toMatch(/selection\.current=null;lastPick\.current=null;setPicked\(null\);setUseId\(false\);setNotice\(null\);setSearching\(false\);setRosterTick\(n=>n\+1\);/);
 // A stale selection: the server answers like a wrong PIN, so the roster is read again and the names return with a line.
 expect(gate).toContain('if(denied&&sel){');expect(gate).toContain('if(selectionIsStale(fresh,sel)){');
 expect(gate).toContain("setNotice(fresh.kind==='picker'?'stale':null)");
});
it('keeps the way out reachable: sticky on the iPad, under a bounded name list on a phone',()=>{
 const phone=readFileSync(new URL('./clocker-name-picker.css',import.meta.url),'utf8').split('@media (max-width: 599px)')[1]??'';
 expect(phone).toMatch(/\.np-tiles \{ max-height: max\(13rem, calc\(100svh - 27rem\)\); overflow-y: auto;/);expect(phone).toMatch(/\.np-foot \{ position: static;/);
 const css=readFileSync(new URL('./clocker-name-picker.css',import.meta.url),'utf8');
 expect(css).toMatch(/\.np-foot \{ position: sticky; bottom: 0;/);expect(css).toContain('scroll-padding-bottom: 8rem');
 expect(css).toMatch(/\.np-tile \{[^}]*min-height: 64px/);expect(css).toMatch(/\.np-tile:focus-visible \{ outline: 3px solid/);
 const html=renderToStaticMarkup(<ClockerNamePicker people={twelve} lang="en" onPick={()=>{}} onUseId={()=>{}}/>);
 const foot=html.slice(html.indexOf('class="np-foot"'));expect(foot).toContain('Use employee ID');expect(foot).not.toContain('np-hint');
});
