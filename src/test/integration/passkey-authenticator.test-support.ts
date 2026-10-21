import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";

export function fictionalAuthenticator() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  const credential = randomBytes(32), id = credential.toString("base64url");
  const key = isoCBOR.encode(new Map<number, number | Uint8Array>([
    [1, 2], [3, -7], [-1, 1],
    [-2, Buffer.from(jwk.x!, "base64url")], [-3, Buffer.from(jwk.y!, "base64url")],
  ]));
  const clientData = (type: string, challenge: string, origin: string) =>
    Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  const authData = (rpID: string, counter: number, registration: boolean, verified: boolean) => {
    const count = Buffer.alloc(4); count.writeUInt32BE(counter);
    const flags = Buffer.from([(verified ? 5 : 1) | (registration ? 64 : 0)]);
    return Buffer.concat([createHash("sha256").update(rpID).digest(), flags, count]);
  };
  return {
    id,
    register(challenge: string, origin = "http://localhost:3000", rpID = "localhost", counter = 0): RegistrationResponseJSON {
      const length = Buffer.alloc(2); length.writeUInt16BE(credential.length);
      const data = Buffer.concat([authData(rpID, counter, true, true), Buffer.alloc(16), length, credential, key]);
      return { id, rawId: id, type: "public-key", clientExtensionResults: { credProps: { rk: true } },
        response: { clientDataJSON: clientData("webauthn.create", challenge, origin).toString("base64url"),
          attestationObject: Buffer.from(isoCBOR.encode(new Map<string, string | Uint8Array | Map<string, never>>([
            ["fmt", "none"], ["attStmt", new Map<string, never>()], ["authData", data],
          ]))).toString("base64url"), transports: ["internal"] } };
    },
    authenticate(challenge: string, userHandle: string, counter = 0, origin = "http://localhost:3000", rpID = "localhost", verified = true): AuthenticationResponseJSON {
      const data = clientData("webauthn.get", challenge, origin), authenticatorData = authData(rpID, counter, false, verified);
      const signature = sign("sha256", Buffer.concat([authenticatorData, createHash("sha256").update(data).digest()]), privateKey);
      return { id, rawId: id, type: "public-key", clientExtensionResults: {},
        response: { clientDataJSON: data.toString("base64url"), authenticatorData: authenticatorData.toString("base64url"),
          signature: signature.toString("base64url"), userHandle } };
    },
  };
}
