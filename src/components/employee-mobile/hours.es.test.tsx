import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
const fixture=rs.hoisted(()=>({mobile:true,read:null as unknown}));
rs.mock('next/navigation',()=>({useRouter:()=>({push:()=>{},replace:()=>{}})}));
rs.mock('./use-mobile',()=>({useEmployeeMobile:()=>fixture.mobile,useEmployeeBScreen:()=>fixture.mobile}));
rs.mock('./use-hours',()=>({useHours:()=>({state:{snapshot:null,paused:false,refreshing:!fixture.read},read:fixture.read,refresh:()=>{},accept:()=>{},allowed:()=>false})}));
rs.mock('@/app/app/employee-hours/actions',()=>({saveEmployeeHoursCorrection:rs.fn()}));
import {ResponsiveEmployeeHours,ResponsiveEmployeeTimecards} from './hours';
import {MobileLangProvider} from './mobile-lang';
import type {ReactNode} from 'react';

const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/[\s  ]+/g,' ');
const es=(node:ReactNode)=>plain(renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>));
const period={startDate:'2026-10-26',endDate:'2026-11-01'};
const props={authority:'fictional-view',period,entryId:null,requestId:null,filter:'waiting',fromCards:false,parent:{href:'/app/my-pay',label:'Pay'}};

it('names the Hours pages in Spanish while they load',()=>{
 fixture.mobile=true;fixture.read=null;
 const edit=es(<ResponsiveEmployeeHours {...props} view="corrections" edit="new" tabTitle="Hours"/>);
 expect(edit).toContain('Solicitar tiempo sin registrar');expect(edit).toContain('Las horas que quieres que tu gerente revise');expect(edit).toContain('Correcciones');expect(edit).toContain('Verificando tus registros de tiempo actuales…');
 expect(edit).not.toContain('Request missing time');
 const records=es(<ResponsiveEmployeeHours {...props} view="records" edit={null} tabTitle="Hours"/>);
 expect(records).toContain('Horas');expect(records).toContain('Tus marcaciones, descansos y tiempo registrado');expect(records).toContain('Pago');expect(records).not.toContain('Your punches');
 fixture.mobile=false;
 expect(es(<ResponsiveEmployeeHours {...props} view="records" edit={null}/>)).toContain('Cargando tu tiempo…');
 expect(es(<ResponsiveEmployeeTimecards period={period}/>)).toContain('Cargando tus tarjetas de tiempo…');
 fixture.mobile=true;
 const redirect=es(<ResponsiveEmployeeTimecards period={period}/>);
 expect(redirect).toContain('Abriendo tus tarjetas de tiempo…');expect(redirect).toContain('Abrir mis tarjetas de tiempo');expect(redirect).not.toContain('Open my timecards');
});
it('draws the Lead records view inside the Spanish page',()=>{
 fixture.mobile=true;
 fixture.read={view:'records',data:{state:'ready',observedAt:'2026-10-27T18:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',date:'2026-10-27',current:null,today:{entries:[],recordedSeconds:0,breakSeconds:0},recent:{entries:[],total:0,limit:20}}};
 const text=es(<ResponsiveEmployeeHours {...props} view="records" edit={null} tabTitle="Hours"/>);
 expect(text).toContain('Fuera de turno');expect(text).toContain('No hay marcaciones registradas hoy.');expect(text).not.toContain('Off clock');
 const english=plain(renderToStaticMarkup(<ResponsiveEmployeeHours {...props} view="records" edit={null} tabTitle="Hours"/>));
 expect(english).toContain('Your punches, breaks and recorded time');expect(english).toContain('Off clock');expect(english).toContain('Pay');
 fixture.read=null;
});
