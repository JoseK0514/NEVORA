import {expect,it} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import type {ReadyUpdate} from '../employee-mobile/messages-view';
import {BStatusCard,EmployeeComposeB,EmployeeNotificationsB,EmployeeUpdateB,EmployeeUpdatesB} from './messages-b';

const noop = () => {};
const zone = 'America/Puerto_Rico';
const at = '2026-11-24T14:00:00Z';
const item: ReadyUpdate = {
 state: 'ready', id: 'update', revisionId: 'revision', contentHash: 'a'.repeat(64), title: 'Store hours',
 body: 'Fictional store opening hours.', type: 'OPERATIONAL_UPDATE', publishedAt: at, editedAt: null,
 acknowledgement: 'REQUIRED', ownAcknowledgedAt: null, ownReadAt: null, authority: 'fictional',
 observedAt: at, validForMs: 45000, timeZone: zone, expiresAt: null, authorContext: 'Management', canWithdraw: true,
};

it('draws the Direction B mobile notifications with Spanish pay and settings copy',()=>{
 const html = renderToStaticMarkup(<PortalLangProvider lang="es"><EmployeeNotificationsB settingsHref="/app/profile/device-alerts" list={{
  partial: false, tab: 'all', onTab: noop, timeZone: zone, onOpen: noop, opening: null, more: false, now: new Date(at),
  items: [
   {id: 'notice', label: 'Pay statement update', at, href: '/app/my-pay', reviewState: 'unread', actionState: 'none'},
   {id: 'device', label: 'Device notification test', at, href: '/app/notifications', reviewState: 'read', actionState: 'none'},
  ],
 }}/></PortalLangProvider>);
 for (const words of ['Notificaciones','Todas','Sin leer','Comprobante de pago compartido','Configuración','Prueba de notificación del dispositivo']) expect(html).toContain(words);
 expect(html).toContain('href="/app/profile/device-alerts"');
 expect(html).toContain('href="/app/my-pay"');
});

it('draws the Direction B mobile list, detail and compose with Spanish actions and the original update',()=>{
 const html = renderToStaticMarkup(<PortalLangProvider lang="es">
  <EmployeeUpdatesB list={{items:[item],partial:false,search:'',filter:'all',timeZone:zone,
   onSearch:noop,onFilter:noop,onOpen:noop,more:false,busy:false,onConfirm:noop,onCompose:noop}}/>
  <EmployeeUpdateB back={{href:'/app/updates',label:'Avisos'}} item={item} busy={false} onAction={noop} withdraw onWithdraw={noop}/>
  <EmployeeComposeB/>
 </PortalLangProvider>);
 for (const words of ['Avisos','Por confirmar','Confirmar','Escribir un aviso','Gerencia','Confirmar retiro','Store hours','Fictional store opening hours.'])
  expect(html).toContain(words);
 expect(html).toContain('placeholder="Buscar avisos"');
 expect(html).toContain('Buscar avisos por título');
 expect(html).toContain('href="/app/updates/compose"');
 expect(html).toContain('href="/app/updates/update"');
});

it('uses the profile language for the busy action while checking updates', () => {
 for (const [lang, label] of [['es', 'Revisando…'], ['en', 'Checking…']] as const) {
  const html = renderToStaticMarkup(<PortalLangProvider lang={lang}>
   <BStatusCard status={{kind: 'loading', copy: '', retry: {label: 'Retry', disabled: true, onClick: noop}}}/>
  </PortalLangProvider>);
  expect(html).toContain(label);
  if (lang === 'es') expect(html).not.toContain('Checking…');
 }
});
