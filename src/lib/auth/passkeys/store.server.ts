import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { SqlExecutor, SqlStatement } from "../../notifications/types";
import type { SessionMutationProof } from "../../shift-changes/types";
import type { PreparedSession, ReviewedLoginCredential } from "../session-issuance";
import { PasskeyError, type PasskeyMetadata, validateFlowToken } from "./types";

const s = (text: string, values: readonly unknown[] = []): SqlStatement => ({ text, values });
const hash = (token: string) => createHash("sha256").update(validateFlowToken(token)).digest("hex");
const metadataFields = 'id::text,name,created_at::text AS "createdAt",last_used_at::text AS "lastUsedAt"';
const metadata = (row: PasskeyMetadata): PasskeyMetadata => ({ ...row,
  createdAt: new Date(row.createdAt).toISOString(), lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null });
export type Challenge = { challenge: string; employeeId: string | null; sessionTokenHash: string | null;
  credentialUpdatedAt: string | null; employeeUpdatedAt: string | null; expiresAt: string };
export type RegistrationContext = ReviewedLoginCredential & { id: string; firstName: string; lastName: string; userHandle: string;
  credentials: { id: string; transports: string[] }[] };
export type StoredCredential = ReviewedLoginCredential & { id: string; employeeId: string; active: boolean; credentialId: string;
  publicKey: Buffer | string; counter: string; transports: string[]; revokedAt: string | null; userHandle: string };

function assertion(proof: SessionMutationProof) {
  return s(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employee_sessions ss JOIN employees e ON e.id=ss.employee_id
    WHERE ss.token_hash=$1 AND e.id=$2 AND e.active AND ss.expires_at>clock_timestamp())
    THEN '1' ELSE 'passkey_not_found' END)::integer`, [proof.sessionTokenHash, proof.employee.id]);
}
function guards(proof: SessionMutationProof): SqlStatement[] {
  if (!proof?.employee?.id || !/^[a-f0-9]{64}$/.test(proof.sessionTokenHash ?? "")) throw new PasskeyError("not_found");
  return [s("SELECT id FROM employees WHERE id=$1 FOR SHARE", [proof.employee.id]),
    s("SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR SHARE", [proof.employee.id]),
    s("SELECT token_hash FROM employee_sessions WHERE token_hash=$1 FOR SHARE", [proof.sessionTokenHash]), assertion(proof)];
}
const liveChallenge = (challenge: Challenge) => s("SELECT (CASE WHEN clock_timestamp()<$1::timestamptz THEN '1' ELSE 'passkey_not_found' END)::integer", [challenge.expiresAt]);
const revisionGuard = (employee: string, updated: string | null, credential: string | null) =>
  s(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN employee_credentials c ON c.employee_id=e.id
    WHERE e.id=$1 AND e.active AND e.updated_at=$2::timestamptz AND c.password_updated_at=$3::timestamptz)
    THEN '1' ELSE 'passkey_not_found' END)::integer`, [employee, updated, credential]);

export class PasskeyStore {
  constructor(private readonly executor: SqlExecutor) {}

  async registrationContext(proof: SessionMutationProof, rpID: string): Promise<RegistrationContext> {
    const prefix = guards(proof);
    const result = await this.executor.transaction([...prefix,
      s("INSERT INTO auth_passkey_users(employee_id,user_handle) VALUES($1,$2) ON CONFLICT(employee_id) DO NOTHING",
        [proof.employee.id, randomBytes(32).toString("base64url")]),
      s(`SELECT e.id,e.first_name AS "firstName",e.last_name AS "lastName",e.updated_at::text,c.password_hash,c.password_updated_at::text,
        u.user_handle AS "userHandle",COALESCE((SELECT jsonb_agg(jsonb_build_object('id',p.credential_id,'transports',p.transports))
        FROM employee_passkeys p WHERE p.employee_id=e.id AND p.rp_id=$2 AND p.revoked_at IS NULL),'[]'::jsonb) AS credentials
        FROM employees e JOIN employee_credentials c ON c.employee_id=e.id JOIN auth_passkey_users u ON u.employee_id=e.id WHERE e.id=$1`,
        [proof.employee.id, rpID]), assertion(proof)]);
    const row = result[prefix.length + 1]?.[0] as RegistrationContext | undefined;
    if (!row) throw new PasskeyError("not_found");
    return row;
  }

  async issueChallenge(purpose: "login" | "register", token: string, challenge: string,
    proof?: SessionMutationProof, account?: RegistrationContext) {
    const prefix = purpose === "register" && proof && account ? [
      ...guards(proof), revisionGuard(proof.employee.id, account.updated_at, account.password_updated_at),
    ] : [];
    if (purpose === "register" && (!proof || !account)) throw new PasskeyError("not_found");
    await this.executor.transaction([...prefix,
      s("DELETE FROM auth_passkey_challenges WHERE expires_at<=clock_timestamp()"),
      s(`INSERT INTO auth_passkey_challenges(token_hash,purpose,challenge,employee_id,session_token_hash,credential_updated_at,employee_updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(token_hash,purpose) DO UPDATE SET
        challenge=EXCLUDED.challenge,employee_id=EXCLUDED.employee_id,session_token_hash=EXCLUDED.session_token_hash,
        credential_updated_at=EXCLUDED.credential_updated_at,employee_updated_at=EXCLUDED.employee_updated_at,
        expires_at=clock_timestamp()+interval '5 minutes'`,
        [hash(token), purpose, challenge, proof?.employee.id ?? null, proof?.sessionTokenHash ?? null,
          account?.password_updated_at ?? null, account?.updated_at ?? null]),
      ...(proof ? [assertion(proof)] : []),
    ]);
  }

  async consumeChallenge(purpose: "login" | "register", token: string, challenge: string, proof?: SessionMutationProof): Promise<Challenge> {
    const [row] = await this.executor.query<Challenge>(s(`DELETE FROM auth_passkey_challenges
      WHERE token_hash=$1 AND purpose=$2 AND challenge=$3 AND expires_at>clock_timestamp()
      AND ($2='login' OR (employee_id=$4 AND session_token_hash=$5))
      RETURNING challenge,employee_id AS "employeeId",session_token_hash AS "sessionTokenHash",
      credential_updated_at::text AS "credentialUpdatedAt",employee_updated_at::text AS "employeeUpdatedAt",expires_at::text AS "expiresAt"`,
      [hash(token), purpose, challenge, proof?.employee.id ?? null, proof?.sessionTokenHash ?? null]));
    if (!row) throw new PasskeyError("not_found");
    return row;
  }

  async credential(credentialId: string, rpID: string): Promise<StoredCredential | null> {
    if (typeof credentialId !== "string" || credentialId.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(credentialId)) throw new PasskeyError("not_found");
    const [row] = await this.executor.query<StoredCredential>(s(`SELECT p.id::text,p.employee_id AS "employeeId",p.credential_id AS "credentialId",
      p.public_key AS "publicKey",p.sign_counter::text AS counter,p.transports,p.revoked_at::text AS "revokedAt",
      u.user_handle AS "userHandle",e.active,e.updated_at::text,c.password_hash,c.password_updated_at::text
      FROM employee_passkeys p JOIN auth_passkey_users u ON u.employee_id=p.employee_id JOIN employees e ON e.id=p.employee_id
      JOIN employee_credentials c ON c.employee_id=e.id WHERE p.credential_id=$1 AND p.rp_id=$2`, [credentialId, rpID]));
    return row ?? null;
  }

  async register(proof: SessionMutationProof, challenge: Challenge, credential: {
    id: string; publicKey: Uint8Array; counter: number; transports?: string[];
  }, name: string, rpID: string): Promise<PasskeyMetadata> {
    const id = randomUUID(), prefix = [...guards(proof),
      s("SELECT employee_id FROM auth_passkey_users WHERE employee_id=$1 FOR UPDATE", [proof.employee.id]),
      revisionGuard(proof.employee.id, challenge.employeeUpdatedAt, challenge.credentialUpdatedAt), liveChallenge(challenge),
      s("SELECT (CASE WHEN (SELECT count(*) FROM employee_passkeys WHERE employee_id=$1 AND revoked_at IS NULL)<10 THEN '1' ELSE 'passkey_not_found' END)::integer", [proof.employee.id]),
    ];
    const result = await this.executor.transaction([...prefix,
      s(`INSERT INTO employee_passkeys(id,employee_id,credential_id,public_key,sign_counter,transports,rp_id,name)
        VALUES($1::uuid,$2,$3,$4::bytea,$5,$6::text[],$7,$8) RETURNING ${metadataFields}`,
        [id, proof.employee.id, credential.id, "\\x" + Buffer.from(credential.publicKey).toString("hex"), credential.counter,
          credential.transports ?? [], rpID, name]),
      s("INSERT INTO auth_passkey_audit(employee_id,passkey_id,event) VALUES($1,$2::uuid,'register')", [proof.employee.id, id]),
      assertion(proof), liveChallenge(challenge),
    ]);
    return metadata(result[prefix.length][0] as PasskeyMetadata);
  }

  async commitLogin(credential: StoredCredential, counter: number, challenge: Challenge, session: PreparedSession) {
    await this.executor.transaction([...session.guards,
      s("SELECT id FROM employee_passkeys WHERE id=$1::uuid FOR UPDATE", [credential.id]),
      s(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employee_passkeys WHERE id=$1::uuid AND employee_id=$2 AND revoked_at IS NULL
        AND sign_counter=$3 AND (($3::bigint=0 AND $4::bigint=0) OR $4::bigint>$3::bigint))
        THEN '1' ELSE 'passkey_not_found' END)::integer`, [credential.id, credential.employeeId, credential.counter, counter]),
      liveChallenge(challenge),
      s("UPDATE employee_passkeys SET sign_counter=$2,last_used_at=clock_timestamp() WHERE id=$1::uuid", [credential.id, counter]),
      session.insert,
      s("INSERT INTO auth_passkey_audit(employee_id,passkey_id,event) VALUES($1,$2::uuid,'sign_in')", [credential.employeeId, credential.id]),
      liveChallenge(challenge),
    ]);
  }

  async list(proof: SessionMutationProof): Promise<PasskeyMetadata[]> {
    const prefix = guards(proof), results = await this.executor.transaction([...prefix,
      s(`SELECT ${metadataFields} FROM employee_passkeys WHERE employee_id=$1 AND revoked_at IS NULL ORDER BY created_at,id`, [proof.employee.id]),
      assertion(proof),
    ]);
    return (results[prefix.length] as PasskeyMetadata[]).map(metadata);
  }

  async remove(proof: SessionMutationProof, id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new PasskeyError("not_found");
    await this.executor.transaction([...guards(proof),
      s("SELECT id FROM employee_passkeys WHERE id=$1::uuid AND employee_id=$2 FOR UPDATE", [id, proof.employee.id]),
      s("SELECT (CASE WHEN EXISTS(SELECT 1 FROM employee_passkeys WHERE id=$1::uuid AND employee_id=$2) THEN '1' ELSE 'passkey_not_found' END)::integer", [id, proof.employee.id]),
      s(`WITH removed AS(UPDATE employee_passkeys SET revoked_at=clock_timestamp(),revocation_reason='removed'
        WHERE id=$1::uuid AND employee_id=$2 AND revoked_at IS NULL RETURNING id)
        INSERT INTO auth_passkey_audit(employee_id,passkey_id,event) SELECT $2,id,'remove' FROM removed`, [id, proof.employee.id]),
      assertion(proof),
    ]);
  }
}
