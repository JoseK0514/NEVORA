import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({replace:()=>{}})}));
rs.mock('../../lib/passkeys/client',()=>({passkeysFlagOn:()=>true}));
import {EmployeeProfilePage,EmployeeProfilePreferences,EmployeeProfileDocumentFrame} from './profile';
import {EmployeeMobileProfileView,ProfileSignInId} from './profile-view';
import {MobileLangProvider} from './mobile-lang';
import type {EmployeeProfile} from '../../lib/employee-view';
import {withoutB} from '../owner-b/test-support';
// Signed-in Spanish: Profile and settings (tablet and desktop cards) and its Personal info card in Puerto Rico Spanish.
// The phone screen (Direction B) and the account panel around Personal info are other files'. Fictional data only.
const es=(node:React.ReactNode)=>renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>);
const own:EmployeeProfile={state:'ready',kind:'profile',observedAt:'2026-10-27T12:00:00Z',validForMs:45000,profile:{name:'Fictional name',role:'Lead',workspace:'Fictional workplace',timeZone:'America/Puerto_Rico',locations:['Main Office','West Office']}};
it('Profile and settings: title, Display, Security and its rows in Spanish',()=>{
 const html=withoutB(es(<EmployeeProfilePage authority={'a'.repeat(64)} lang="es" policies/>));
 for(const text of ['Perfil y ajustes','>Más<','Información personal','Pantalla','Idioma','Solo las páginas de inicio de sesión.','Seguridad','Llaves de acceso','Eliminar mi cuenta','Verificando tus datos de trabajo actuales…'])expect(html).toContain(text);
 for(const text of ['Profile and settings','Personal info','>Display<','Security','Passkeys','Delete my account'])expect(html).not.toContain(text);
 expect(html).toMatch(/lang="es" aria-pressed="true"[^>]*>Español/);
});
it('Display alone, and the document frame back link',()=>{
 const html=es(<EmployeeProfilePreferences lang="en"/>);expect(html).toContain('Idioma');expect(html).not.toContain('Language');
 const doc=es(<EmployeeProfileDocumentFrame title="Fictional doc" sub="Fictional sub" back="/app/profile">Body</EmployeeProfileDocumentFrame>);expect(doc).toContain('>Perfil<');expect(doc).not.toContain('Profile');
});
it('Personal info rows and read states in Spanish',()=>{
 const ready=es(<ProfileSignInId.Provider value="FICTIONAL-E1"><EmployeeMobileProfileView state={{snapshot:own,paused:false,refreshing:false}} onRetry={()=>{}}/></ProfileSignInId.Provider>);
 for(const text of ['Información personal','Tu perfil de trabajo','Nombre','ID de empleado','Inicias sesión con este ID.','Localidades','Zona horaria','Main Office · West Office','Puerto Rico'])expect(ready).toContain(text);
 for(const text of ['Personal info','Employee ID','Locations','Time zone'])expect(ready).not.toContain(text);
 const view=(snapshot:EmployeeProfile|{state:'unavailable';reason:'read_failed'|'access_denied'}|null,paused=false,refreshing=false)=>es(<EmployeeMobileProfileView state={{snapshot,paused,refreshing}} onRetry={()=>{}}/>);
 expect(view(own,true)).toContain('Perfil en pausa.');
 const failed=view({state:'unavailable',reason:'read_failed'});expect(failed).toContain('No pudimos cargar tus datos.');expect(failed).toContain('>Intentar de nuevo<');expect(failed).not.toContain('Try again');
 const denied=view({state:'unavailable',reason:'access_denied'});expect(denied).toContain('Tu acceso cambió.');expect(denied).toContain('>Iniciar sesión<');
});
