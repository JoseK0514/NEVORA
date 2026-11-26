import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,rs} from '@rstest/core';
import {CLOCKER_COPY,clockerKeepNames,clockerText} from './clocker-copy';
import {ClockerPresentation} from './clocker-language';
import {ClockerRecoveryHelp,ClockerRecoveryLink,type ClockerReviewRequest} from './clocker-recovery';
import {ClockerShell} from './clocker-shell';
import {clockerFallbackClock} from './clocker-fallback';

/* Phase 8 (Nov 17, 2026): the final review's kiosk fixes that a server render can show. The kiosk is bilingual on screen,
 * so each check runs in English and Spanish. */
const request=(state:ClockerReviewRequest['state'],id:string|null=null):ClockerReviewRequest=>({state,id,ask:async()=>{}});
const references=[{commandId:'40d6ec2f-676f-447c-bba8-3b3fb78d71ce',action:'CLOCK_OUT'},{commandId:'9b1f0c2e-1111-4c6a-8a00-3b3fb78d71aa',action:'CLOCK_IN'}] as never;
const help=(lang:'en'|'es',state:ClockerReviewRequest['state']='idle',id:string|null=null,others=1)=>renderToStaticMarkup(<ClockerPresentation initialLocale={lang}>
 <ClockerRecoveryHelp references={references} otherCount={others} commandId="40d6ec2f-676f-447c-bba8-3b3fb78d71ce" request={request(state,id)} onBack={()=>{}}/></ClockerPresentation>);

it.each(['en','es'] as const)('shows saved-punch help as its own card in %s: the references only behind Reference, a quiet ask and Back',lang=>{
 const html=help(lang);
 // Premium pass (#8): the title names the fact, not the button's words (two references here, so the plural).
 expect(html).toContain(lang==='en'?'Your punches are kept on this tablet':'Tus marcaciones están guardadas en esta tableta');
 expect(html).not.toContain(lang==='en'?'Ask your Owner to check':'Pide al dueño que lo revise');
 // Every reference sits inside the one disclosure; nothing raw in the body and no "Show N more".
 const [body,disclosure='']=html.split('<details');
 expect(body).not.toContain('40d6ec2f');expect(disclosure).toContain('40d6ec2f-676f-447c-bba8-3b3fb78d71ce');expect(disclosure).toContain('9b1f0c2e');
 expect(html).not.toMatch(/Show \d+ more|Mostrar \d+ más|Hide help|Dismiss/);
 // No filled button: asking the Owner stays the quiet one (Phase 6); Back is the way out.
 expect(html).not.toContain('data-kind="primary"');expect(html).toMatch(/data-kind="secondary"[^>]*>(Ask Owner to check|Pedir al dueño que revise)<\/button>/);
 // Back comes before the disclosure, so opening the references never pushes the way out off the screen.
 expect(html).toMatch(/>(Back|Volver)<\/button><\/div><details/);
 expect(html).toContain(lang==='en'?'1 more saved on this tablet.':'1 más guardada en esta tableta.');
 if(lang==='es')expect(html.replace(/<[^>]+>/g,' ')).not.toMatch(/Ask|Owner|saved|Reference|Back|Request/);
});
it('keeps one request: its reference joins the disclosure, and the status says what happened',()=>{
 const sent=help('en','saved','5f0c0000-aaaa-4bbb-8ccc-000000000001',0);
 // Premium pass (#8): once saved, the result stands in the button's place, a teal information line with no done mark.
 expect(sent).toContain('Request sent. Your Owner will see it under Clocker recovery.');expect(sent).toContain('data-tone="teal"');
 expect(sent).not.toMatch(/>(Ask Owner to check|Request sent|Ask again)<\/button>/);expect(sent).not.toContain('disabled');
 expect(help('es','saved','5f0c').replace(/<[^>]+>/g,'')).toContain('Solicitud enviada. El dueño la verá en Recuperación de Clocker.');
 // The Spanish status uses the destination name shown on the Owner’s signed-in screen.
 expect(CLOCKER_COPY['Your Owner can find this in Clocker recovery.']).toContain('Recuperación de Clocker');
 expect(sent.split('<details')[1]).toContain('5f0c0000-aaaa-4bbb-8ccc-000000000001');expect(sent.split('<details')[0]).not.toContain('5f0c0000');
 expect(help('en','unknown','5f0c').replace(/ /g,' ')).toContain('We couldn’t confirm the request. Ask again; it won’t send twice.');
 expect(help('en','idle',null,0)).not.toContain('data-clocker-others-saved');
});
it('opens the help from a link with the same words in both languages',()=>{
 expect(renderToStaticMarkup(<ClockerRecoveryLink onOpen={()=>{}}/>)).toContain('Something didn’t save?');
 expect(renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerRecoveryLink onOpen={()=>{}}/></ClockerPresentation>)).toContain('¿Algo no se guardó?');
});
it.each(['en','es'] as const)('draws the band status with one verb and the tablet name on its own in %s',lang=>{
 const html=renderToStaticMarkup(<ClockerPresentation initialLocale={lang}><ClockerShell locationLabel="Northside Main Office" timeZone="America/Puerto_Rico" deviceName="Front counter tablet" status="connected">Task</ClockerShell></ClockerPresentation>);
 expect(html).toContain(lang==='en'?'Tablet connected':'Tableta conectada');
 expect(html).toMatch(/<span class="[^"]*zone[^"]*">(Puerto Rico time|Hora de Puerto Rico)<\/span><span class="[^"]*device[^"]*">Front counter tablet<\/span>/);
 expect(html).not.toMatch(/registered|registrada| · Front/);
});
it('keeps a quoted button name on one line, in the tablet’s language',()=>{
 expect(clockerKeepNames('Tap Send it again. It won’t record twice.',['Send it again'])).toBe('Tap Send it again. It won’t record twice.');
 expect(clockerKeepNames(clockerText('es','Your last punch still isn’t confirmed. Tap Send it again. It won’t record twice.'),[clockerText('es','Send it again')])).toContain('Toca Enviar de nuevo.');
});
afterEach(()=>{rs.unstubAllGlobals();});
it('keeps the error screen’s band clock when the date formatter itself is what failed',()=>{
 const at=new Date(2026,10,17,13,5);
 expect(clockerFallbackClock(at,'en').time).toBe('1:05');
 rs.stubGlobal('Intl',{...Intl,DateTimeFormat:function(){throw new Error('broken');}});
 expect(clockerFallbackClock(at,'en')).toEqual({time:'1:05',period:'PM',date:null});
 expect(clockerFallbackClock(at,'es')).toEqual({time:'1:05',period:'p. m.',date:null});
});
it('has a Spanish line for every new Phase 8 phrase',()=>{
 for(const key of ['Your punch is kept on this tablet','Start over','This tablet needs to be set up again','Can’t reach NEVORA','Can’t save punches','Keep my place','Stay clocked in','Clocked in for','under 1 min','The time clock hit a problem',
  'This time clock is paused','Tell a manager','Tell a manager now.','Your earlier punch wasn’t recorded','This tablet can’t read its saved punches','Photo for clock out','Cancel','Saved at {time}. This screen clears in 8 seconds.'])
  {expect(CLOCKER_COPY[key],key).toBeTruthy();expect(CLOCKER_COPY[key]).not.toBe(key);}
 // The Owner is the one who sets a tablet up again; nothing tells staff a manager can.
 expect(Object.keys(CLOCKER_COPY).join(' ')).not.toMatch(/manager (or Owner )?(can )?(to )?set up this tablet|Ask a manager to set up/);
});
