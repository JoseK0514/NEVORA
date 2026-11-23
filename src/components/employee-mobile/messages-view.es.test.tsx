import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import type {ReactNode} from 'react';
import {MessageInbox,MessageDetail,MessageRecovery,messageTime} from './messages-view';
import {MobileLangProvider} from './mobile-lang';
const noop=()=>{},es=(node:ReactNode)=>renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>);
const item={id:'own',label:'Schedule update',at:'2026-10-27T13:00:00Z',href:'/app/notifications/open?notificationId=own',reviewState:'unread' as const,actionState:'required' as const};
const update={state:'ready' as const,id:'id',revisionId:'revision',contentHash:'hash',title:'Cierre de hoy',body:'Contenido ficticio.',type:'TODAYS_TEAM' as const,publishedAt:item.at,editedAt:null,acknowledgement:'OPTIONAL' as const,ownAcknowledgedAt:null,ownReadAt:null,authority:'authority',observedAt:item.at,validForMs:45000,timeZone:'America/Puerto_Rico',expiresAt:'2026-10-28T20:00:00Z',authorContext:'Your team update',canWithdraw:true,sentCount:3};
it('draws the list tools, a row and the partial note in Spanish',()=>{
 const html=es(<MessageInbox kind="notifications" items={[item]} partial search="" filter="all" timeZone="America/Puerto_Rico" onSearch={noop} onFilter={noop} onOpen={noop}/>);
 for(const word of ['Buscar en esta página','Mostrar','Requiere acción','Revisar horario','No pudimos verificar algunas notificaciones actuales','placeholder="Buscar por tipo de notificación"','aria-label="Tus notificaciones"','27 oct, 9:00'])expect(html).toContain(word);
 for(const word of ['Search this page','Review schedule','Action needed','Some current notices'])expect(html).not.toContain(word);
});
it('says the empty states in Spanish',()=>{
 const html=es(<MessageInbox kind="updates" items={[]} partial={false} search="" filter="all" timeZone="America/Puerto_Rico" more onSearch={noop} onFilter={noop} onOpen={noop}/>);
 expect(html).toContain('No hay avisos actuales');expect(html).toContain('Puede haber elementos anteriores en otra página.');expect(html).not.toContain('No current updates');
 const partial=es(<MessageInbox kind="updates" items={[]} partial search="" filter="all" timeZone="America/Puerto_Rico" onSearch={noop} onFilter={noop} onOpen={noop}/>);
 expect(partial).toContain('Nada confirmado en esta página');expect(partial).toContain('No pudimos verificar algunos avisos actuales, así que no aparecen.');
});
it('draws an update’s detail in Spanish',()=>{
 const html=es(<MessageDetail item={update} busy={false} onAction={noop}/>);
 for(const word of ['Audiencia original: 3 destinatarios','Tu estado de lectura','No has marcado este aviso como leído.','Disponible hasta el 28 oct, 4:00','Confirmar que lo leí','Marcar como leído','Tu aviso publicado','Retirar aviso','aria-label="Contenido del aviso"'])expect(html).toContain(word);
 for(const word of ['Original audience','Mark as read','Withdraw update',' PM'])expect(html).not.toContain(word);
 const review=es(<MessageDetail item={update} busy={false} onAction={noop} confirm onConfirm={noop}/>);
 expect(review).toContain('¿Retirar esta versión?');expect(review).toContain('Confirmar retiro');expect(review).toContain('Conservar aviso');
});
it('says the recovery notice in Spanish',()=>{
 const html=es(<MessageRecovery state={{pending:false,notice:'unknown',hasUnknown:true,canRetry:true}} allowed onLookup={noop} onRetry={noop}/>);
 expect(html).toContain('No pudimos confirmar que se envió.');expect(html).toContain('Verificar estado del envío');expect(html).toContain('Reintentar el envío original');expect(html).not.toContain('Check submission status');
});
it('messageTime stays English by default and writes Spanish when asked',()=>{
 expect(messageTime(item.at,'America/Puerto_Rico')).toBe('Oct 27, 9:00 AM');expect(messageTime(item.at,'America/Puerto_Rico','es')).toMatch(/^27 oct, 9:00\sa\.\sm\.$/);
});
