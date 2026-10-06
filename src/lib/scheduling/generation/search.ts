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
  const stack: IterableIterator<State>[] = [
    [options.initial][Symbol.iterator](),
  ];
  const seen = new Set<string>();
  let best = options.initial,
    exploredNodes = 0;
  while (stack.length && !options.stopped()) {
    if (exploredNodes >= options.maxNodes)
      return { best, exploredNodes, exhausted: true };
    const next = stack[stack.length - 1].next();
    if (next.done) {
      stack.pop();
      continue;
    }
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
