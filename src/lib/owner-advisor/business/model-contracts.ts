import type { BusinessReadResult, BusinessCurrency } from './contracts';
export type BusinessToolName = 'business_finance' | 'business_sales';
export type BusinessModelEvidence = BusinessReadResult & { timeZone: string; queryHash: string; sourceDigest: string };
export type BusinessInspectionReference = { inspectionId: string; occurrence: number; tool: BusinessToolName };
export type BusinessMetricReference = { queryHash: string; sourceDigest: string; currency: BusinessCurrency; unit: 'MINOR'; scale: 2 };
