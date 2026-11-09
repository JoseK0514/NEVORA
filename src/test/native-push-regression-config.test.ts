import {expect, it} from 'vitest';
import {nativeRegressionTarget} from './integration/native-push-fixture-url';
it('preserves the owned cluster while choosing only the factory-specific disposable database namespace', () => {
  expect(nativeRegressionTarget('postgresql://nevora_test@127.0.0.1:54321/nevora_foundation_test_c1_012345abcdef', 'fuel_phase3_test_'))
    .toBe('postgresql://nevora_test@127.0.0.1:54321/fuel_phase3_test_c1_012345abcdef');
});
it.each(['postgresql://user@remote.example:54321/nevora_foundation_test_c1_012345abcdef',
  'postgresql://user@127.0.0.1:54321/customer', 'postgresql://user@127.0.0.1:54321/nevora_foundation_test_existing',
  'postgresql://user@127.0.0.1/nevora_foundation_test_c1_012345abcdef',
  'postgresql://user@127.0.0.1:54321/nevora_foundation_test_c1_012345abcdef?option=1'])('refuses to relabel an unowned target %s', value => {
  expect(() => nativeRegressionTarget(value, 'fuel_phase3_test_')).toThrow('Refusing');
});
