export function openManagementCapture(path: string, options?: { exclusive?: boolean }): Promise<{ checkpoint(value: unknown): Promise<void> }>;
