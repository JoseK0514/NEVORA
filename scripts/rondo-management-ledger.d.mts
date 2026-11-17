export type ManagementLedger = {
  reserve(caseId: string, body: string): Promise<number>;
  settle(id: number, metadata: Record<string, unknown>): Promise<void>;
  result(value: Record<string, unknown>): Promise<void>;
  assertDispatch(id: number): void;
};
export declare const MANAGEMENT_LEDGER_PATH: string;
export function openManagementContinuation(path: string, options?: { approval?: string; now?: () => number; sourceHead?: string; fixtureOnly?: boolean; expectedOriginalDigest?: string }): Promise<ManagementLedger>;
export declare const openManagementRepair: typeof openManagementContinuation;
