export function runBeforeRecoveryDeadline<T>(work: () => T | Promise<T>, deadline: number): Promise<T>;
export function finishResponseByDeadline(response: { finished(): Promise<unknown> }, deadline: number): Promise<void>;
