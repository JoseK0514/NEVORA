import { afterEach, describe, expect, it, rs } from "@rstest/core";
import { isOperationId } from "./contracts";
import {
  deriveOperationId, locationKey, readActivation, readCurrent, readGrant, readOperation, readRegistration, readVerification,
  safeActivationUrl, signupRequest, signupStep, suggestSlug, takeFragmentProof, type Transport,
} from "./signup-client";

const PROOF = "A".repeat(42) + "A"; // 43 base64url characters, a valid 32-byte token shape
const ENVELOPE = "nw1_v1." + "a".repeat(16) + "." + "b".repeat(120) + "." + "c".repeat(22);
const snapshot = { schemaVersion: 1, version: "3", registrationState: "EMAIL_VERIFIED", workspace: null, sections: [], nextStep: null };
const r = (status: number, body: unknown): Transport => ({ kind: "response", status, body });
const lost: Transport = { kind: "lost" };

function history() { const calls: string[] = []; return { calls, replaceState: (_: unknown, __: string, url?: string | URL | null) => { calls.push(String(url)); } }; }

describe("takeFragmentProof", () => {
  it("reads the proof, then scrubs the fragment while keeping path and query", () => {
    const h = history();
    expect(takeFragmentProof({ hash: "#proof=" + PROOF, pathname: "/onboarding/verify", search: "?lang=es" }, h)).toEqual({ proof: PROOF, hadFragment: true });
    expect(h.calls).toEqual(["/onboarding/verify?lang=es"]);
  });
  it("accepts an encoded workplace envelope and decodes it", () => {
    const h = history();
    expect(takeFragmentProof({ hash: "#proof=" + encodeURIComponent(ENVELOPE), pathname: "/onboarding/activate", search: "" }, h).proof).toBe(ENVELOPE);
  });
  it("scrubs but refuses malformed, wrong-key or undecodable fragments", () => {
    for (const hash of ["#proof=short", "#grant=" + PROOF, "#" + PROOF, "#proof=%E0%A4%A"]) {
      const h = history();
      expect(takeFragmentProof({ hash, pathname: "/p", search: "" }, h)).toEqual({ proof: null, hadFragment: true });
      expect(h.calls).toEqual(["/p"]);
    }
  });
  it("leaves the address alone without a fragment", () => {
    const h = history();
    expect(takeFragmentProof({ hash: "", pathname: "/p", search: "" }, h)).toEqual({ proof: null, hadFragment: false });
    expect(h.calls).toEqual([]);
  });
});

describe("deriveOperationId", () => {
  it("is a stable UUID per proof and purpose, so the same link replays the same command", async () => {
    const first = await deriveOperationId(PROOF, "verification");
    expect(isOperationId(first)).toBe(true);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(await deriveOperationId(PROOF, "verification")).toBe(first);
    expect(await deriveOperationId(PROOF, "owner-activation")).not.toBe(first);
    expect(await deriveOperationId("B".repeat(43), "verification")).not.toBe(first);
  });
});

describe("signupRequest", () => {
  afterEach(() => rs.unstubAllGlobals());
  it("returns lost for a network failure or a non-JSON reply, never throws", async () => {
    rs.stubGlobal("fetch", async () => { throw new TypeError("offline"); });
    expect(await signupRequest("/api/onboarding/config", { method: "GET" })).toEqual({ kind: "lost" });
    rs.stubGlobal("fetch", async () => new Response("<html>", { status: 502 }));
    expect(await signupRequest("/api/onboarding/config", { method: "GET" })).toEqual({ kind: "lost" });
  });
  it("sends same-origin JSON with no caching and returns the status and body", async () => {
    let seen: RequestInit | undefined;
    rs.stubGlobal("fetch", async (_path: string, init: RequestInit) => { seen = init; return Response.json({ state: "pending" }, { status: 202 }); });
    expect(await signupRequest("/api/onboarding/workspaces", { method: "POST", body: { a: 1 } })).toEqual({ kind: "response", status: 202, body: { state: "pending" } });
    expect(seen).toMatchObject({ method: "POST", cache: "no-store", credentials: "same-origin", redirect: "error", body: '{"a":1}' });
  });
});

describe("result readers", () => {
  it("registration: generic acknowledgement, field errors, limits and unknown", () => {
    expect(readRegistration(r(202, { schemaVersion: 1, state: "verification_requested", resendAfterMs: 60000 }))).toEqual({ state: "requested", resendAfterMs: 60000 });
    expect(readRegistration(r(400, { state: "invalid", fieldErrors: [{ field: "termsVersion", code: "POLICY_VERSION_CHANGED" }] }))).toEqual({ state: "invalid", fieldErrors: [{ field: "termsVersion", code: "POLICY_VERSION_CHANGED" }] });
    expect(readRegistration(r(429, { state: "limited", retryAfterMs: 900000 }))).toEqual({ state: "limited", retryAfterMs: 900000 });
    expect(readRegistration(r(503, { state: "unavailable", reasonCode: "ONBOARDING_DISABLED" }))).toEqual({ state: "unavailable", reasonCode: "ONBOARDING_DISABLED" });
    expect(readRegistration(r(202, { state: "outcome_unknown", operationId: "x" }))).toEqual({ state: "unknown" });
    expect(readRegistration(lost)).toEqual({ state: "unknown" });
    // A 200 is not the contract's acknowledgement: never treat it as sent.
    expect(readRegistration(r(200, { state: "verification_requested" }))).toEqual({ state: "unknown" });
  });
  it("verification: verified needs a valid snapshot; expired and used links are one generic invalid", () => {
    expect(readVerification(r(200, { schemaVersion: 1, state: "verified", snapshot }))).toMatchObject({ state: "verified", snapshot: { version: "3" } });
    expect(readVerification(r(200, { schemaVersion: 1, state: "verified", snapshot: { ...snapshot, version: "x" } }))).toEqual({ state: "unknown" });
    expect(readVerification(r(400, { state: "invalid" }))).toEqual({ state: "invalid" });
    expect(readVerification(r(202, { state: "outcome_unknown", operationId: "x" }))).toEqual({ state: "unknown" });
    expect(readVerification(r(503, { state: "unavailable" }))).toEqual({ state: "unavailable" });
    expect(readVerification(lost)).toEqual({ state: "unknown" });
  });
  it("current registration: ready, no session or unavailable", () => {
    expect(readCurrent(r(200, { schemaVersion: 1, state: "ready", snapshot }))).toMatchObject({ state: "ready" });
    expect(readCurrent(r(401, { state: "unavailable", reasonCode: "ACCESS_DENIED" }))).toEqual({ state: "no_session" });
    expect(readCurrent(lost)).toEqual({ state: "unavailable" });
  });
  it("operations: known stages poll; unknown stages and shapes never invent progress", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    expect(readOperation(r(202, { state: "pending", operationId: id, stage: "CREATING", pollAfterMs: 3000 }))).toEqual({ state: "pending", operationId: id, stage: "CREATING", pollAfterMs: 3000 });
    expect(readOperation(r(202, { state: "pending", operationId: id, stage: "CREATING", pollAfterMs: 5 }))).toMatchObject({ pollAfterMs: 1000 });
    expect(readOperation(r(202, { state: "pending", operationId: id, stage: "TELEPORTING", pollAfterMs: 1000 }))).toEqual({ state: "unknown", operationId: null });
    expect(readOperation(r(202, { state: "outcome_unknown", operationId: id }))).toEqual({ state: "unknown", operationId: id });
    expect(readOperation(r(409, { state: "conflict", reason: "slug_unavailable" }))).toEqual({ state: "conflict", reason: "slug_unavailable" });
    expect(readOperation(r(503, { state: "unavailable", reasonCode: "RESOURCE_REVIEW_REQUIRED" }))).toEqual({ state: "unavailable", reasonCode: "RESOURCE_REVIEW_REQUIRED" });
    expect(readOperation(r(401, { state: "unavailable", reasonCode: "ACCESS_DENIED" }))).toEqual({ state: "no_session" });
  });
  it("grant: follows only the workplace's own HTTPS activation page", () => {
    const url = "https://fictional-north.portal.example/onboarding/activate#proof=" + encodeURIComponent(ENVELOPE);
    expect(readGrant(r(200, { state: "ready", operationId: "x", url, expiresAt: "2026-11-19T12:00:00Z" }), "portal.example")).toEqual({ state: "ready", url });
    for (const bad of ["https://evil.example/onboarding/activate#proof=x", "http://fictional-north.portal.example/onboarding/activate#proof=x", "https://fictional-north.portal.example/login#proof=x",
      "https://fictional-north.portal.example/onboarding/activate?next=x#proof=x", "https://a.b.portal.example/onboarding/activate#proof=x", "https://portal.example/onboarding/activate#proof=x"])
      expect(readGrant(r(200, { state: "ready", url: bad }), "portal.example")).toEqual({ state: "unavailable" });
    expect(readGrant(r(200, { state: "ready", url }), null)).toEqual({ state: "unavailable" });
    expect(readGrant(r(202, { state: "pending", operationId: "x", pollAfterMs: 1000 }), "portal.example")).toEqual({ state: "pending", pollAfterMs: 1000 });
    expect(readGrant(r(400, { state: "invalid" }), "portal.example")).toEqual({ state: "invalid" });
    expect(readGrant(r(429, { state: "limited", retryAfterMs: 60000 }), "portal.example")).toEqual({ state: "limited", retryAfterMs: 60000 });
    expect(readGrant(lost, "portal.example")).toEqual({ state: "unknown" });
  });
  it("activation: only 200 activated/SIGN_IN is done; 202 and unknown replay; rejections keep their reason", () => {
    expect(readActivation(r(200, { state: "activated", employeeId: "OWNER-1", nextAction: "SIGN_IN" }))).toEqual({ state: "activated", employeeId: "OWNER-1" });
    expect(readActivation(r(200, { state: "activated", employeeId: "OWNER-1" }))).toEqual({ state: "unavailable" });
    expect(readActivation(r(202, { state: "pending", operationId: "x", pollAfterMs: 1000 }))).toEqual({ state: "pending", pollAfterMs: 1000 });
    expect(readActivation(r(202, { state: "outcome_unknown", operationId: "x" }))).toEqual({ state: "unknown" });
    expect(readActivation(r(400, { state: "invalid", passwordReason: "too_short" }))).toEqual({ state: "password", reason: "too_short" });
    expect(readActivation(r(400, { state: "invalid" }))).toEqual({ state: "invalid" });
    expect(readActivation(r(409, { state: "conflict" }))).toEqual({ state: "conflict" });
    expect(readActivation(lost)).toEqual({ state: "unknown" });
  });
  it("safeActivationUrl requires a single-label workplace under the configured domain", () => {
    expect(safeActivationUrl("https://alpha.portal.example/onboarding/activate#proof=x", "portal.example")).toBe(true);
    expect(safeActivationUrl("https://alpha.portal.example:8443/onboarding/activate#proof=x", "portal.example")).toBe(false);
    expect(safeActivationUrl("https://user:pw@alpha.portal.example/onboarding/activate#proof=x", "portal.example")).toBe(false);
  });
});

describe("journey helpers", () => {
  it("continues at the business form until a workplace is reserved", () => {
    expect(signupStep("EMAIL_VERIFIED")).toBe("business");
    for (const state of ["WORKSPACE_RESERVED", "PROVISIONING", "OWNER_ACTIVATION_REQUIRED", "SETUP_IN_PROGRESS", "READY"] as const) expect(signupStep(state)).toBe("progress");
  });
  it("suggests valid workplace addresses and location keys", () => {
    expect(suggestSlug("Café Coquí  Drive-Thru!")).toBe("cafe-coqui-drive-thru");
    expect(suggestSlug("API")).toBe("");
    expect(suggestSlug("¡¡!!")).toBe("");
    expect(suggestSlug("x".repeat(80))).toHaveLength(63);
    expect(locationKey("Calle Loíza")).toBe("calle-loiza");
    expect(locationKey("—")).toBe("main");
  });
});
