/** Opt-in gates only. Availability still requires each feature's configuration,
 * current workspace/session authority and release approval. No secret values or
 * process environment snapshots belong in this client-safe registry. */
export const FEATURE_FLAGS = Object.freeze({
  payroll: 'NEVORA_PAYROLL_ENABLED',
  commerce: 'NEVORA_COMMERCE_ENABLED',
  commerceApi: 'NEVORA_COMMERCE_API_ENABLED',
  onboarding: 'NEVORA_ONBOARDING_ENABLED',
  onboardingProvider: 'NEVORA_ONBOARDING_PROVIDER_ENABLED',
  provisionerWorker: 'NEVORA_PROVISIONER_WORKER_ENABLED',
  onboardingEmail: 'NEVORA_ONBOARDING_EMAIL_ENABLED',
  invitationDelivery: 'NEVORA_INVITATION_DELIVERY_ENABLED',
  mobileAccess: 'NEVORA_MOBILE_ACCESS_ENABLED',
  mobileSupport: 'NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED',
  ownerAdvisor: 'NEVORA_OWNER_ADVISOR_ENABLED',
  ownerAdvisorKnowledge: 'NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED',
  ownerAdvisorWeekly: 'NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED',
  ownerAdvisorBusinessImports: 'NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED',
  ownerAdvisorBusinessRetrieval: 'NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED',
  clockerPunch: 'NEVORA_CLOCKER_PUNCH_ENABLED',
  // Retained for development's legacy renderer until reviewed UI integration.
  clockerUiV2: 'NEVORA_CLOCKER_UI_V2',
  // Public-page visit counts only; see src/lib/analytics/redact.ts.
  webAnalytics: 'NEVORA_WEB_ANALYTICS_ENABLED',
} as const);

export type FeatureFlags = Readonly<{[K in keyof typeof FEATURE_FLAGS]: boolean}>;
export function readFeatureFlags(env: Readonly<Record<string, string | undefined>>): FeatureFlags {
  return Object.fromEntries(Object.entries(FEATURE_FLAGS).map(([key, name]) => [key, env[name] === 'true'])) as FeatureFlags;
}
