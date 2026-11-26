// Signed-in Spanish (Nov 23, 2026): every English word of the company-access views has a Puerto Rico Spanish entry.
import {expect,it} from '@rstest/core';
import {ACCESS_COPY,COMMAND_MESSAGES,commandMessage,esDay} from './access-copy';

/** Every key path of a table: nested objects are walked, functions and strings are leaves. */
function paths(value:unknown,prefix=''):string[]{
 if(value&&typeof value==='object')return Object.entries(value).flatMap(([key,child])=>paths(child,prefix?`${prefix}.${key}`:key)).sort();
 return [`${prefix}:${typeof value}`];
}

it('has a Spanish entry, of the same kind, for every English one',()=>{
 expect(paths(ACCESS_COPY.es)).toEqual(paths(ACCESS_COPY.en));
});

it('keeps Spanish free of exclamation marks and of the words the glossary replaces',()=>{
 const strings=(value:unknown):string[]=>typeof value==='string'?[value]:typeof value==='function'?[String((value as (...a:unknown[])=>unknown)(1,2,'x'))]:value&&typeof value==='object'?Object.values(value).flatMap(strings):[];
 const all=strings(ACCESS_COPY.es).join('\n');
 expect(all).not.toMatch(/[!¡]/);
 expect(all).not.toMatch(/\b(Owner|Manager|Lead|Team|Schedule|Home|location|usted|ubicaci[oó]n|tiempo libre)\b/i);
});

it('pluralises its counts in both languages',()=>{
 expect(ACCESS_COPY.en.team.matches(1)).toBe('1 match');expect(ACCESS_COPY.en.team.matches(3)).toBe('3 matches');
 expect(ACCESS_COPY.es.team.matches(1)).toBe('1 resultado');expect(ACCESS_COPY.es.team.matches(3)).toBe('3 resultados');
 expect(ACCESS_COPY.es.invite.limited(1)).toContain('1 segundo y');expect(ACCESS_COPY.es.invite.limited(30)).toContain('30 segundos');
 expect(ACCESS_COPY.en.invite.limited(30)).toBe('Too many invitation actions. Wait at least 30 seconds, then check the invitation.');
});

it('translates the messages commands.ts throws, and leaves any other text alone',()=>{
 expect(commandMessage(COMMAND_MESSAGES.phone,'es')).toBe('Escribe un número de teléfono válido.');
 expect(commandMessage(COMMAND_MESSAGES.phone,'en')).toBe('Enter a valid contact phone number.');
 expect(commandMessage('A server sentence.','es')).toBe('A server sentence.');
});

it('writes Spanish dates the voice guide way',()=>{
 expect(esDay('2026-10-14')).toBe('mié, 14 oct');
});
