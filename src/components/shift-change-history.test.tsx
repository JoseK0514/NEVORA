import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {ShiftChangeHistory} from './shift-change-history';
it('a history read failure is explicit rather than an empty successful history',()=>{
 expect(renderToStaticMarkup(<ShiftChangeHistory events={null}/>)).toContain('Request history is unavailable');
 expect(renderToStaticMarkup(<ShiftChangeHistory events={[]}/>)).toBe('');
});
