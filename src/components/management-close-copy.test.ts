import {describe,expect,test} from '@rstest/core';
import {MANAGEMENT_CLOSE_COPY,MANAGEMENT_CLOSE_MESSAGES} from './management-close-copy';

describe('Close open punch copy',()=>{
  test('Spanish has the same keys as English',()=>{
    expect(Object.keys(MANAGEMENT_CLOSE_COPY.es).sort()).toEqual(Object.keys(MANAGEMENT_CLOSE_COPY.en).sort());
  });
  test('English is unchanged and every English message has Spanish',()=>{
    expect(MANAGEMENT_CLOSE_COPY.en.closeOpenPunch).toBe('Close open punch');
    expect(MANAGEMENT_CLOSE_COPY.en.started('Ana','Main','Nov 3, 6:00 AM')).toBe('Ana · Main. Started Nov 3, 6:00 AM.');
    for(const [english,spanish] of Object.entries(MANAGEMENT_CLOSE_MESSAGES)){
      expect(MANAGEMENT_CLOSE_COPY.en.message(english)).toBe(english);
      expect(MANAGEMENT_CLOSE_COPY.es.message(english)).toBe(spanish);
    }
  });
  test('Spanish uses tú and the glossary',()=>{
    const all=[...Object.values(MANAGEMENT_CLOSE_MESSAGES),...Object.values(MANAGEMENT_CLOSE_COPY.es).filter(v=>typeof v==='string')].join(' ');
    expect(all).not.toMatch(/\busted\b|\bsu gerente\b|\bponche\b|timecard/i);
    expect(MANAGEMENT_CLOSE_COPY.es.closeOpenPunch).toBe('Cerrar marcación abierta');
  });
});

describe('Close open punch dates',()=>{
  test('Spanish date and time follow the glossary',()=>{
    expect(MANAGEMENT_CLOSE_COPY.es.when('2026-11-23T14:57:00Z','America/Puerto_Rico')).toBe('23 nov, 10:57 a. m.');
    expect(MANAGEMENT_CLOSE_COPY.en.when('2026-11-23T14:57:00Z','America/Puerto_Rico')).toBe('Nov 23, 10:57 AM');
  });
});

describe('Close open punch facts line',()=>{
  test('the Spanish line ends once after "p. m."',()=>{
    expect(MANAGEMENT_CLOSE_COPY.es.started('Ana','Main','3 nov, 6:00 p. m.')).toBe('Ana · Main. Entrada: 3 nov, 6:00 p. m.');
  });
});
