import "server-only";
export type ProviderConfig = {
  endpoint: string;
  model: string;
  key: string;
  dailyLimit: number;
  apiStyle?: "responses" | "chat_completions";
  reasoningEffort?: "low" | "medium" | "high";
};
/** Return provider settings only when feature/data approval, model, bounded daily
 * cap and an allowed endpoint/key are configured. Availability here is configuration
 * evidence, without a provider health/authentication request or retention guarantee. */
export function readConfig(
  env: Record<string, string | undefined>,
): ProviderConfig | null {
  const limit = env.NEVORA_OWNER_ADVISOR_DAILY_LIMIT,
    provider = env.NEVORA_OWNER_ADVISOR_PROVIDER,
    apiStyle = env.NEVORA_OWNER_ADVISOR_API_STYLE ?? "responses",
    reasoningEffort = env.NEVORA_OWNER_ADVISOR_REASONING_EFFORT;
  if (
    env.NEVORA_OWNER_ADVISOR_ENABLED !== "true" ||
    env.NEVORA_OWNER_ADVISOR_DATA_APPROVED !== "true" ||
    !env.NEVORA_OWNER_ADVISOR_MODEL?.trim() ||
    !limit ||
    !/^([1-9]|[1-9][0-9]|100)$/.test(limit) ||
    (apiStyle !== "responses" && apiStyle !== "chat_completions") ||
    (reasoningEffort !== undefined &&
      (apiStyle !== "responses" || !["low", "medium", "high"].includes(reasoningEffort)))
  )
    return null;
  let key: string | undefined, endpoint: string;
  if (provider === "openai") {
    key = env.OPENAI_API_KEY;
    endpoint = apiStyle === "responses"
      ? "https://api.openai.com/v1/responses"
      : "https://api.openai.com/v1/chat/completions";
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
    endpoint = base + (apiStyle === "responses" ? "/openai/v1/responses" : "/v1/chat/completions");
  } else return null;
  if (!key?.trim()) return null;
  return {
    endpoint,
    model: env.NEVORA_OWNER_ADVISOR_MODEL.trim(),
    key,
    dailyLimit: Number(limit),
    apiStyle,
    ...(reasoningEffort ? { reasoningEffort: reasoningEffort as ProviderConfig["reasoningEffort"] } : {}),
  };
}
