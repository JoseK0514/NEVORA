import {expect,it} from '@rstest/core';
import {messageSessionCopy} from './copy/message-session';
// The return link (EmployeeMessageReturn) needs an origin set by a tap, which a server render can't set; its words are
// checked here, and the component reads them with useMobileCopy(messageSessionCopy).
it('keeps the English return link and has a Spanish one for each list',()=>{
 expect(messageSessionCopy.en.back).toEqual({notifications:'Back to notifications',updates:'Back to updates'});
 expect(messageSessionCopy.es.back).toEqual({notifications:'Volver a notificaciones',updates:'Volver a avisos'});
});
