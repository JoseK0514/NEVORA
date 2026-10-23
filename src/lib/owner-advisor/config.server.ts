import "server-only";
export type ProviderConfig = {
  endpoint: string;
  model: string;
  key: string;
  dailyLimit: number;
};
export function readConfig(
  env: Record<string, string | undefined>,
): ProviderConfig | null {
  const limit = env.NEVORA_OWNER_ADVISOR_DAILY_LIMIT,
    provider = env.NEVORA_OWNER_ADVISOR_PROVIDER;
  if (
    env.NEVORA_OWNER_ADVISOR_ENABLED !== "true" ||
    env.NEVORA_OWNER_ADVISOR_DATA_APPROVED !== "true" ||
    !env.NEVORA_OWNER_ADVISOR_MODEL?.trim() ||
    !limit ||
    !/^([1-9]|[1-9][0-9]|100)$/.test(limit)
  )
    return null;
  let key: string | undefined, endpoint: string;
  if (provider === "openai") {
    key = env.OPENAI_API_KEY;
    endpoint = "https://api.openai.com/v1/responses";
  } else if (provider === "neon") {
    const base = env.NEON_AI_GATEWAY_BASE_URL;
    if (
      !base ||
      !/^https:\/\/br-[a-z0-9]+(?:-[a-z0-9]+)*-api\.ai\.(?:c-[0-9]+\.)?[a-z]{2}(?:-[a-z]+)+-[0-9]\.aws\.neon\.tech$/.test(
        base,
      )
    )
      return null;
    key = env.NEON_AI_GATEWAY_TOKEN;
    endpoint = base + "/openai/v1/responses";
  } else return null;
  if (!key?.trim()) return null;
  return {
    endpoint,
    model: env.NEVORA_OWNER_ADVISOR_MODEL.trim(),
    key,
    dailyLimit: Number(limit),
  };
}
