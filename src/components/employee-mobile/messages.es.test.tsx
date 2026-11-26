import {beforeEach,expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture=rs.hoisted(()=>({mobile:true,state:{snapshot:null as null|{state:'unavailable';reason:string},paused:false,refreshing:false}}));
rs.mock('next/navigation',()=>({useRouter:()=>({push:()=>{}})}));
rs.mock('./use-mobile',()=>({useEmployeeMobile:()=>fixture.mobile,useEmployeeBScreen:()=>fixture.mobile}));
rs.mock('./use-messages',()=>({useMessages:()=>({state:fixture.state,read:null,allowed:()=>false,current:()=>null,refresh:()=>{}})}));
rs.mock('./message-session',()=>({useMessageSession:()=>({origin:null,lists:{notifications:{search:'',filter:'all',cursors:[]},updates:{search:'',filter:'all',cursors:[]}},state:{pending:false,hasUnknown:false},operationHref:null,setOrigin:()=>{}})}));
import {ResponsiveEmployeeMessages} from './messages';
import {MobileLangProvider} from './mobile-lang';
import type {MessageView} from '@/lib/employee-messages';
import {withoutB} from '../owner-b/test-support';
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const draw=(view:MessageView)=>renderToStaticMarkup(<MobileLangProvider value="es"><ResponsiveEmployeeMessages authority="fictional-view" view={view}><span>Desktop</span></ResponsiveEmployeeMessages></MobileLangProvider>);
beforeEach(()=>{fixture.mobile=true;fixture.state={snapshot:null,paused:false,refreshing:false};});
it('says the Notifications states in Spanish',()=>{
 fixture.state.refreshing=true;expect(plain(draw('notifications'))).toContain('Verificando tus notificaciones actuales…');
 fixture.state.refreshing=false;const failed=plain(draw('notifications'));expect(failed).toContain('No pudimos verificar tus notificaciones.');expect(failed).toContain('Intentar de nuevo');expect(failed).toContain('Notificaciones');expect(failed).not.toContain('Try again');
 fixture.state.snapshot={state:'unavailable',reason:'access_denied'};const denied=plain(draw('notifications'));expect(denied).toContain('Tu acceso cambió. Inicia sesión de nuevo para continuar.');expect(denied).toContain('Iniciar sesión');
});
it('titles Updates and Write an update in Spanish, with Spanish back links',()=>{
 const updates=plain(withoutB(draw('updates')));expect(updates).toContain('Avisos');expect(updates).toContain('Más');expect(updates).toContain('Mensajes actuales compartidos contigo');expect(updates).toContain('No pudimos verificar tus avisos. Inténtalo de nuevo.');expect(updates).not.toContain('Current messages');
 fixture.state.paused=true;expect(plain(draw('updates'))).toContain('Tus avisos están en pausa.');
 const compose=plain(withoutB(draw('compose')));expect(compose).toContain('Escribir un aviso');expect(compose).toContain('Un mensaje para el equipo de hoy');expect(compose).not.toContain('Write an update');
});
it('shows the Spanish loading line before the phone page takes over',()=>{
 fixture.mobile=false;const html=plain(draw('updates'));expect(html).toContain('Cargando tus avisos…');expect(html).not.toContain('Loading your updates');
});
