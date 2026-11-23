import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import {HoursFrame} from './hours-frame';
import {MobileLangProvider} from './mobile-lang';

const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const frame=(state:{snapshot:null;refreshing:boolean;paused:boolean})=>renderToStaticMarkup(<MobileLangProvider value="es"><HoursFrame title="Horas" sub="Tu tiempo" back={null} backLabel={null} contextKey="records" view="records" state={state} ready={false} refresh={()=>{}}>Private records</HoursFrame></MobileLangProvider>);
it('draws the Hours frame tabs and status in Spanish',()=>{
 const failed=frame({snapshot:null,refreshing:false,paused:false}),text=plain(failed);
 expect(text).toContain('No pudimos verificar tus registros.');expect(text).toContain('Intentar de nuevo');expect(text).toContain('Tarjetas de tiempo');expect(text).toContain('Correcciones');
 expect(failed).toContain('aria-label="Tu tiempo"');expect(failed).toContain('aria-label="Acceso a tu tiempo"');
 expect(text).not.toContain('Try again');expect(text).not.toContain('Timecards');expect(text).not.toContain('Private records');
 expect(plain(frame({snapshot:null,refreshing:true,paused:false}))).toContain('Verificando tus registros de tiempo actuales…');
 expect(plain(frame({snapshot:null,refreshing:false,paused:true}))).toContain('Tus registros de tiempo están en pausa.');
});
