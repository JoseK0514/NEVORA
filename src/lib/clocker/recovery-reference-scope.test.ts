import {expect,it} from 'vitest';
import {historyReferenceSubject,scopedJournalReferences} from './recovery-journal';
const subject='a'.repeat(64),other='b'.repeat(64),own={commandId:'own',action:'CLOCK_IN'},foreign={commandId:'foreign',action:'CLOCK_OUT'};
it('returns only the verified subject references and a count of other or unreadable records',()=>{
 expect(scopedJournalReferences([{subject,reference:own},{subject:other,reference:foreign},{subject:null,reference:{commandId:null,action:null}}],subject)).toEqual({references:[own],otherCount:2});
});
it('deduplicates a persons migrated and historical command without mixing other subjects',()=>{
 expect(scopedJournalReferences([{subject,reference:own},{subject,reference:own},{subject:other,reference:foreign},{subject:other,reference:foreign}],subject)).toEqual({references:[own],otherCount:1});
});
it('recovers subject only from an exact history key matching location and reference',()=>{
 expect(historyReferenceSubject(JSON.stringify(['2',subject,'own']),'2','own')).toBe(subject);
 for(const key of ['bad',JSON.stringify(['3',subject,'own']),JSON.stringify(['2',subject,'other']),JSON.stringify(['2','not-subject','own']),JSON.stringify(['2',subject,'own','extra'])])expect(historyReferenceSubject(key,'2','own')).toBeNull();
});
