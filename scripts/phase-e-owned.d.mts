export type SourceCustody = {checkpoint: string; tree: string; sourceClean: true; hashes: Record<string,string>};
export function captureSource(source: string, expectedSha?: string): SourceCustody;
export function assertSourceUnchanged(source: string, custody: SourceCustody): void;
export function safeEnvironment(env?: NodeJS.ProcessEnv): NodeJS.ProcessEnv & {NODE_ENV: 'test'};
export function registerOwnedProcess(input: {kind: string; pid: number; ownerId: string}): Promise<void>;
