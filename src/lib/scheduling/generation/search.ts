/** A deterministic, iterative depth-first search. Child iterators make alternate allocations lazy. */
export function boundedSearch<State>(options: {
  initial: State;
  maxNodes: number;
  key: (state: State) => string;
  better: (state: State, incumbent: State) => boolean;
  complete: (state: State) => boolean;
  children: (state: State) => IterableIterator<State>;
  stopped: () => boolean;
}): { best: State; exploredNodes: number; exhausted: boolean } {
  const steps = boundedSearchSteps(options);
  let next = steps.next();
  while (!next.done) next = steps.next();
  return next.value;
}

/** Checkpoints allow a caller to yield the event loop without changing search order. */
export function* boundedSearchSteps<State>(options: {
  initial: State;
  maxNodes: number;
  key: (state: State) => string;
  better: (state: State, incumbent: State) => boolean;
  complete: (state: State) => boolean;
  children: (state: State) => IterableIterator<State | undefined>;
  stopped: () => boolean;
}): Generator<undefined, { best: State; exploredNodes: number; exhausted: boolean }, undefined> {
  const stack: IterableIterator<State | undefined>[] = [
    [options.initial][Symbol.iterator](),
  ];
  const seen = new Set<string>();
  let best = options.initial,
    exploredNodes = 0;
  while (stack.length && !options.stopped()) {
    yield;
    if (options.stopped()) break;
    if (exploredNodes >= options.maxNodes)
      return { best, exploredNodes, exhausted: true };
    const next = stack[stack.length - 1].next();
    if (next.done) {
      stack.pop();
      continue;
    }
    if (next.value === undefined) continue;
    const state = next.value,
      key = options.key(state);
    if (seen.has(key)) continue;
    seen.add(key);
    exploredNodes++;
    if (options.better(state, best)) best = state;
    if (options.complete(state))
      return { best: state, exploredNodes, exhausted: false };
    stack.push(options.children(state));
  }
  return { best, exploredNodes, exhausted: options.stopped() };
}
