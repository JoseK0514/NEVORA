export type PasskeyErrorCode = "not_supported" | "cancelled" | "not_found" | "rate_limited" | "account_disabled" | "unavailable";
export class PasskeyError extends Error {
  constructor(public readonly code: PasskeyErrorCode) { super(code); this.name = "PasskeyError"; }
}
export type PasskeyMetadata = { id: string; name: string; createdAt: string; lastUsedAt: string | null };
/** The flow cookie is a canonical random bearer used to locate a ceremony;
 * validating its encoding does not prove a challenge or an authenticated user. */
export const validateFlowToken = (value: string) => {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value) || Buffer.from(value, "base64url").toString("base64url") !== value)
    throw new PasskeyError("not_found");
  return value;
};
/** Extract the untrusted challenge solely to consume the matching stored row.
 * SimpleWebAuthn must still verify the entire signed response, RP and origin. */
export function responseChallenge(value: unknown): string {
  try {
    if (!value || typeof value !== "object" || !("response" in value) || !value.response ||
      typeof value.response !== "object" || !("clientDataJSON" in value.response) ||
      typeof value.response.clientDataJSON !== "string" || value.response.clientDataJSON.length > 8192) throw Error();
    const data: unknown = JSON.parse(Buffer.from(value.response.clientDataJSON, "base64url").toString("utf8"));
    if (!data || typeof data !== "object" || !("challenge" in data) || typeof data.challenge !== "string" ||
      !/^[A-Za-z0-9_-]{43,128}$/.test(data.challenge)) throw Error();
    return data.challenge;
  } catch { throw new PasskeyError("not_found"); }
}
