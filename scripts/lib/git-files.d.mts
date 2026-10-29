import type { ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';
export declare const GIT_LIST_MAX_BUFFER: number;
export declare function gitFileList(args: string[], options?: Partial<ExecFileSyncOptionsWithStringEncoding>): string[];
