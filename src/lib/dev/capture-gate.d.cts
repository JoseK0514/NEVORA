import type { PushRuntimeConfig } from '../notifications/types';
export function captureDirectory(env: Record<string, string | undefined>): string | null | undefined;
export function captureNotificationRuntime(config: PushRuntimeConfig, env: Record<string, string | undefined>): PushRuntimeConfig;
