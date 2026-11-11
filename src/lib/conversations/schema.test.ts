import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {communicationDevelopmentAllowedSql} from '../communications/sql';
import {currentCalloutReleaseSql} from '../data/shift-change-release';
const migration=readFileSync('db/migrations/0062_conversations.sql','utf8');
it('reuses the owned-runtime D04 predicate and exact current shift-release semantics',()=>{const compact=(s:string)=>s.replace(/\s+/g,'');expect(compact(migration)).toContain(compact(communicationDevelopmentAllowedSql()));expect(migration).toContain(currentCalloutReleaseSql('sc'));expect(migration).not.toContain('SECURITY DEFINER');});
it('pins the real optional staff migration instead of inventing a source table',()=>{expect(createHash('sha256').update(readFileSync('src/test/integration/fixtures/conversations/0061_staff_tasks.sql')).digest('hex')).toBe('ebe9e46d3519fe0bf7ab25eaf380524273e4297e836332d2a4efcc2fd5664f17');});
