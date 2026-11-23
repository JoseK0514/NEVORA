import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({push:()=>{}})}));
import {EmployeeMobileWeekPicker} from './week-picker';
import {MobileLangProvider} from './mobile-lang';
// Signed-in Spanish: the Schedule week picker in Puerto Rico Spanish, and English unchanged.
it('names the week and its controls in Spanish, with a lowercase month',()=>{
 const html=renderToStaticMarkup(<MobileLangProvider value="es"><EmployeeMobileWeekPicker weekStart="2026-11-16"/></MobileLangProvider>);
 for(const text of ['aria-label="Elegir semana del horario, semana del 16 nov 2026"','Semana del 16 nov 2026','Elige cualquier día de la semana','>Ver semana<','>Sincronizar calendario<'])expect(html).toContain(text);
 for(const text of ['Week of','Choose any day','View week','Calendar sync'])expect(html).not.toContain(text);
});
it('keeps the English picker as it was',()=>{
 const html=renderToStaticMarkup(<EmployeeMobileWeekPicker weekStart="2026-11-16"/>);
 for(const text of ['aria-label="Choose schedule week, week of Nov 16, 2026"','Week of Nov 16, 2026','Choose any day in the week','>View week<','>Calendar sync<'])expect(html).toContain(text);
});
