/** Preserve both unchanged factories' namespace fences on the runner's NEW
 * loopback cluster. Each still proves database absence and owns its own marker. */
export function nativeRegressionTarget(value: string, prefix: 'nevora_foundation_test_' | 'fuel_phase3_test_'): string {
  const target = new URL(value), name = decodeURIComponent(target.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
    || !target.port || target.search || target.hash || !/^nevora_foundation_test_c1_[a-f0-9]{12}$/.test(name)
    || !['nevora_foundation_test_', 'fuel_phase3_test_'].includes(prefix)) throw Error('Refusing an unmarked or non-loopback native regression fixture');
  target.pathname = '/' + prefix + name.slice('nevora_foundation_test_'.length);
  return target.href;
}
