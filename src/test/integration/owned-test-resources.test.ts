import { describe, expect, it } from 'vitest';
import { withOwnedTestResources } from './owned-test-resources';

describe('owned SQL test resource lifetime', () => {
  it('retains second-client connection failure and first-client end failure while attempting every cleanup', async () => {
    const connectError = new Error('second client connect failed');
    const endError = new Error('first client end failed');
    const actions: string[] = [];
    const run = withOwnedTestResources(async defer => {
      defer(async () => { actions.push('database disposed'); });
      defer(async () => { actions.push('first client ended'); throw endError; });
      actions.push('first client connected');
      defer(async () => { actions.push('second client ended'); });
      actions.push('second client connect attempted');
      throw connectError;
    });
    await expect(run).rejects.toMatchObject({errors:[connectError,endError]});
    expect(actions).toEqual(['first client connected','second client connect attempted','second client ended','first client ended','database disposed']);
  });

  it('retains the primary assertion and first database disposal error while disposing the other database', async () => {
    const assertionError = new Error('catalog mismatch');
    const disposalError = new Error('generic database disposal failed');
    const actions: string[] = [];
    await expect(withOwnedTestResources(async defer => {
      defer(async () => { actions.push('upgrade disposed'); });
      defer(async () => { actions.push('generic disposal attempted'); throw disposalError; });
      throw assertionError;
    })).rejects.toMatchObject({errors:[assertionError,disposalError]});
    expect(actions).toEqual(['generic disposal attempted','upgrade disposed']);
  });

  it('cleans up the first database if acquiring the second database fails', async () => {
    const acquisitionError = new Error('second database acquisition failed');
    let disposed = false;
    await expect(withOwnedTestResources(async defer => {
      defer(async () => { disposed = true; });
      throw acquisitionError;
    })).rejects.toBe(acquisitionError);
    expect(disposed).toBe(true);
  });

  it('releases the writer barrier before draining pending work and ending resources', async () => {
    const actions: string[] = [];
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    const pending = barrier.then(() => { actions.push('writer finished'); });
    const result = await withOwnedTestResources(async defer => {
      defer(async () => { actions.push('database disposed'); });
      defer(async () => { actions.push('client ended'); });
      defer(() => pending);
      defer(() => { actions.push('barrier released'); release(); });
      return 'result';
    });
    expect(result).toBe('result');
    expect(actions).toEqual(['barrier released','writer finished','client ended','database disposed']);
  });
});
