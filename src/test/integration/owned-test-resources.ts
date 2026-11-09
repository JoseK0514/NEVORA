type Cleanup = () => void | Promise<unknown>;

/** Test-only lifetime scope; register cleanup immediately after acquisition.
 * Reverse order releases barriers and drains work before connections/databases.
 * Every cleanup is attempted, preserving both the primary and teardown errors. */
export async function withOwnedTestResources<T>(work: (defer: (cleanup: Cleanup) => void) => Promise<T>): Promise<T> {
  const cleanups: Cleanup[] = [];
  const errors: unknown[] = [];
  let value!: T;
  try { value = await work(cleanup => { cleanups.push(cleanup); }); }
  catch (error) { errors.push(error); }
  finally {
    for (const cleanup of cleanups.reverse()) {
      try { await cleanup(); }
      catch (error) { if (!errors.includes(error)) errors.push(error); }
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Owned test resource scope failed; all cleanups were attempted.');
  return value;
}
