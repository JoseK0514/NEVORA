import { describe, expect, it } from '@rstest/core';
import { copy } from './features-editor-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

// Branch audit, Nov 26, 2026: the 409 busy refusal (a feature turned off while its requests still wait) reads in the
// person's language. The server's English sentence is only the fallback, and English is unchanged word for word.
import { featuresBusyText } from './features-editor-copy';
import { blockerText } from '@/lib/workspace-presentation/modules';
describe('the busy refusal when turning a feature off', () => {
  it('reads in English exactly as the server writes it', () => {
    expect(featuresBusyText('en', { state: 'busy', module: 'timeOff', count: 2 } as never)).toBe(blockerText('timeOff', 2));
    expect(featuresBusyText('en', { module: 'marketplace', count: 1 })).toBe(blockerText('marketplace', 1));
  });
  it('reads in Spanish for a Spanish Owner', () => {
    expect(featuresBusyText('es', { module: 'timeOff', count: 1 })).toBe('1 solicitud de días libres espera una decisión. Decídela primero.');
    expect(featuresBusyText('es', { module: 'marketplace', count: 3 })).toBe('3 solicitudes de turno (cambios, cubiertas y no puedo trabajar) siguen abiertas. Deja que terminen primero.');
  });
  it('falls back (null) when the reply has no known module or count', () => {
    for (const body of [null, {}, { module: 'payroll', count: 2 }, { module: 'timeOff' }, { module: 'timeOff', count: 0 }, { module: 'timeOff', count: 1.5 }, { module: 'timeOff', count: '2' }]) expect(featuresBusyText('es', body as never)).toBeNull();
  });
});
