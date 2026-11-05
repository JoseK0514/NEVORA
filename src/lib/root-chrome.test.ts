import { describe, expect, it, vi } from 'vitest';
import { claimRootChrome, rootChromeClaimed, subscribeRootChrome } from './root-chrome';

describe('root chrome claim (QA D16)', () => {
  it('holds while any page claims it, tells subscribers, and a release is counted once', () => {
    const heard = vi.fn(), stop = subscribeRootChrome(heard);
    expect(rootChromeClaimed()).toBe(false);
    const a = claimRootChrome(), b = claimRootChrome();
    expect(rootChromeClaimed()).toBe(true);
    a(); a();
    expect(rootChromeClaimed()).toBe(true);
    b();
    expect(rootChromeClaimed()).toBe(false);
    expect(heard).toHaveBeenCalledTimes(4);
    stop(); claimRootChrome()();
    expect(heard).toHaveBeenCalledTimes(4);
  });
});
