import "server-only";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { neonNotificationExecutor } from "../../data/notification-transactions";
import type { SqlExecutor } from "../../notifications/types";
import type { SessionMutationProof } from "../../shift-changes/types";
import { consumeAuthLimit, consumeLoginAttempt } from "../login-limits";
import { prepareSession } from "../session-issuance";
import type { PasskeyConfig } from "./config";
import { PasskeyStore } from "./store.server";
import { PasskeyError, responseChallenge } from "./types";

/** WebAuthn verification and error boundary. The store owns live session,
 * lifecycle/version and counter checks; successful cryptographic verification
 * alone is never enough to register a key or commit a portal session. */
export class PasskeyService {
  private readonly store: PasskeyStore;
  constructor(private readonly config: PasskeyConfig, private readonly executor: SqlExecutor = neonNotificationExecutor()) {
    this.store = new PasskeyStore(executor);
  }
  private async boundary<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    catch (error) {
      if (error instanceof PasskeyError) throw error;
      if (error instanceof Error && /passkey_not_found|session_login_changed/.test(error.message)) throw new PasskeyError("not_found");
      throw new PasskeyError("unavailable");
    }
  }
  private async limit(subject: string) {
    if (!(await consumeAuthLimit("passkey_ceremony", subject, 30, this.executor))) throw new PasskeyError("rate_limited");
  }
  /** Discoverable login reveals no account-specific credential list. The stored
   * challenge is tied to the flow token, not an asserted employee identity. */
  async loginOptions(token: string) {
    return this.boundary(async () => {
      await this.limit(token);
      const options = await generateAuthenticationOptions({ rpID: this.config.rpID, userVerification: "required", timeout: 300000, allowCredentials: [] });
      await this.store.issueChallenge("login", token, options.challenge);
      return options;
    });
  }
  /** Use the account's stable random user handle and capture current employee/
   * credential revisions for the later, session-bound registration commit. */
  async registrationOptions(proof: SessionMutationProof, token: string) {
    return this.boundary(async () => {
      await this.limit(proof.employee.id);
      const account = await this.store.registrationContext(proof, this.config.rpID);
      const options = await generateRegistrationOptions({
        rpName: "NEVORA", rpID: this.config.rpID, userID: Buffer.from(account.userHandle, "base64url"),
        userName: account.id, userDisplayName: account.firstName + " " + account.lastName,
        attestationType: "none", timeout: 300000, supportedAlgorithmIDs: [-7, -257],
        authenticatorSelection: { residentKey: "required", userVerification: "required" },
        excludeCredentials: account.credentials,
      });
      await this.store.issueChallenge("register", token, options.challenge, proof, account);
      return options;
    });
  }
  /** Consume the challenge before signature verification. Even a failed response
   * spends this ceremony; the client needs fresh options to attempt it again. */
  async register(proof: SessionMutationProof, token: string, response: unknown, name: unknown) {
    return this.boundary(async () => {
      await this.limit(proof.employee.id);
      if (typeof name !== "string" || !name.trim() || name.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(name)) throw new PasskeyError("not_found");
      const challenge = await this.store.consumeChallenge("register", token, responseChallenge(response), proof);
      let verification;
      try {
        verification = await verifyRegistrationResponse({ response: response as RegistrationResponseJSON, expectedChallenge: challenge.challenge,
          expectedOrigin: this.config.origin, expectedRPID: this.config.rpID, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] });
      } catch { throw new PasskeyError("not_found"); }
      if (!verification.verified) throw new PasskeyError("not_found");
      return this.store.register(proof, challenge, verification.registrationInfo.credential, name.trim(), this.config.rpID);
    });
  }
  /** Verify the WebAuthn response and user handle, then atomically
   * advance the credential counter and create a session against captured login
   * revisions. beforeSession runs after verification but before that commit for
   * installation cleanup; the returned bearer is for cookie delivery afterward. */
  async login(token: string, response: unknown, beforeSession: (employeeId: string) => Promise<void> = async () => {}) {
    return this.boundary(async () => {
      await this.limit(token);
      const challenge = await this.store.consumeChallenge("login", token, responseChallenge(response));
      if (!response || typeof response !== "object" || !("id" in response) || typeof response.id !== "string") throw new PasskeyError("not_found");
      const credential = await this.store.credential(response.id, this.config.rpID);
      if (!(await consumeLoginAttempt(credential?.employeeId ?? "missing:" + response.id, this.executor))) throw new PasskeyError("rate_limited");
      if (!credential) throw new PasskeyError("not_found");
      if (!credential.active) throw new PasskeyError("account_disabled");
      if (credential.revokedAt) throw new PasskeyError("not_found");
      let verification;
      try {
        const value = response as AuthenticationResponseJSON;
        if (value.response.userHandle !== credential.userHandle) throw Error();
        const publicKey = typeof credential.publicKey === "string"
          ? Buffer.from(credential.publicKey.replace(/^\\x/, ""), "hex") : new Uint8Array(credential.publicKey);
        verification = await verifyAuthenticationResponse({ response: value, expectedChallenge: challenge.challenge,
          expectedOrigin: this.config.origin, expectedRPID: this.config.rpID, requireUserVerification: true,
          credential: { id: credential.credentialId, publicKey, counter: Number(credential.counter), transports: credential.transports } });
      } catch { throw new PasskeyError("not_found"); }
      if (!verification.verified) throw new PasskeyError("not_found");
      const session = prepareSession(credential.employeeId, credential);
      await beforeSession(credential.employeeId);
      await this.store.commitLogin(credential, verification.authenticationInfo.newCounter, challenge, session);
      return session;
    });
  }
  async list(proof: SessionMutationProof) {
    return this.boundary(() => this.store.list(proof));
  }
  async snapshot(proof: SessionMutationProof) {
    return this.boundary(() => this.store.snapshot(proof));
  }
  async remove(proof: SessionMutationProof, id: string) {
    return this.boundary(async () => {
      if (!(await consumeAuthLimit("passkey_management", proof.employee.id, 30, this.executor))) throw new PasskeyError("rate_limited");
      await this.store.remove(proof, id);
    });
  }
}
