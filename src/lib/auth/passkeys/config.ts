export type PasskeyConfig = { rpID: string; origin: string };

/** Return the exact WebAuthn RP/origin pair or disable the route with null.
 * Production uses explicit HTTPS configuration with host equal to rpID; only
 * development derives an origin from the request, and only for localhost. */
export function passkeyConfig(requestURL: string, env: Partial<NodeJS.ProcessEnv> = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_NEVORA_PASSKEYS: process.env.NEXT_PUBLIC_NEVORA_PASSKEYS,
  NEVORA_PASSKEY_RP_ID: process.env.NEVORA_PASSKEY_RP_ID,
  NEVORA_PASSKEY_ORIGIN: process.env.NEVORA_PASSKEY_ORIGIN,
}): PasskeyConfig | null {
  if (env.NEXT_PUBLIC_NEVORA_PASSKEYS !== "on") return null;
  try {
    if (env.NODE_ENV !== "production") {
      const url = new URL(requestURL);
      if (url.hostname !== "localhost" || !["http:", "https:"].includes(url.protocol)) return null;
      return { rpID: "localhost", origin: url.origin };
    }
    const rpID = env.NEVORA_PASSKEY_RP_ID;
    if (!rpID || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(rpID)) return null;
    const origin = new URL(env.NEVORA_PASSKEY_ORIGIN ?? "");
    if (origin.protocol !== "https:" || origin.hostname !== rpID || origin.port || origin.username ||
      origin.password || origin.pathname !== "/" || origin.search || origin.hash) return null;
    return { rpID, origin: origin.origin };
  } catch { return null; }
}
