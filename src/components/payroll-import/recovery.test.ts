// U01: one write whose answer may not arrive. The contract's own fixtures feed the classifiers.
import { describe, expect, it } from "vitest";
import fixtures from "../../../docs/handoffs/2026-11-16-backend-phase2-finance-fixtures.json";
import { IDLE, classifyExportAnswer, classifyPayrollAnswer, classifyReceiptLook, holdsCustody, sendGuard, writeReducer, type WriteState } from "./recovery";

type State = WriteState<{ operationId: string }>;
const original = { key: "55555555-5555-4555-8555-555555555555", body: fixtures.imports.recovery.originalBody };
const send = (state: State, custody = original) => writeReducer(state, { type: "send", custody });

describe("the recovery state machine", () => {
  it("freezes the first body and key, and saves only on a receipt", () => {
    const sending = send(IDLE);
    expect(sending).toEqual({ phase: "sending", custody: original });
    expect(Object.isFrozen((sending as { custody: object }).custody)).toBe(true);
    expect(writeReducer(sending, { type: "saved", receipt: { operationId: original.key } })).toEqual({ phase: "saved", custody: original, receipt: { operationId: original.key } });
  });
  it("keeps a lost reply unknown: never failed, never saved, and it holds the page", () => {
    const unknown = writeReducer(send(IDLE), { type: "unknown" });
    expect(unknown).toEqual({ phase: "unknown", custody: original, seen: "nothing" });
    expect(holdsCustody(unknown)).toBe(true);
    // Nothing but a look-up or the same bytes moves it.
    expect(writeReducer(unknown, { type: "refused", reason: "X" })).toBe(unknown);
    expect(writeReducer(unknown, { type: "reset" })).toBe(unknown);
  });
  it("looks the original up first; no receipt yet is still unknown", () => {
    const unknown = writeReducer(send(IDLE), { type: "unknown" }), checking = writeReducer(unknown, { type: "check" });
    expect(checking.phase).toBe("checking");
    expect(writeReducer(checking, { type: "no_receipt" })).toEqual({ phase: "unknown", custody: original, seen: "no_receipt" });
    expect(writeReducer(checking, { type: "check_failed" })).toEqual({ phase: "unknown", custody: original, seen: "check_failed" });
    // A look-up can't refuse: a request still on its way may yet commit.
    expect(writeReducer(checking, { type: "refused", reason: "X" }).phase).toBe("unknown");
    expect(writeReducer(checking, { type: "saved", receipt: { operationId: original.key } }).phase).toBe("saved");
  });
  it("retries the exact same body and refuses a changed one under the same key", () => {
    const unknown = writeReducer(send(IDLE), { type: "unknown" });
    expect(sendGuard(unknown, { ...original })).toBe("same");
    const retry = send(unknown, { key: original.key, body: fixtures.imports.recovery.retryBody });
    expect(fixtures.imports.recovery.retryBody).toBe(fixtures.imports.recovery.originalBody);
    expect(retry.phase).toBe("sending");
    expect((retry as { custody: unknown }).custody).toBe((unknown as { custody: unknown }).custody);
    const changed = { key: original.key, body: fixtures.imports.recovery.changedBody };
    expect(sendGuard(unknown, changed)).toBe("changed");
    expect(send(unknown, changed)).toBe(unknown);
    // A new key can't start either while the first is unresolved.
    expect(sendGuard(unknown, { key: "66666666-6666-4666-8666-666666666666", body: fixtures.imports.recovery.changedBody })).toBe("unresolved");
  });
  it("lets a new, reviewed request follow a known refusal, and stops on a blocked original", () => {
    const refused = writeReducer(send(IDLE), { type: "refused", reason: "REVISION_CONFLICT" });
    expect(refused.phase).toBe("refused");
    expect(holdsCustody(refused)).toBe(false);
    expect(send(refused, { key: "66666666-6666-4666-8666-666666666666", body: "{}" }).phase).toBe("sending");
    const blocked = writeReducer(send(IDLE), { type: "blocked", reason: "OPERATION_CONFLICT" });
    expect(send(blocked, { key: "77777777-7777-4777-8777-777777777777", body: "{}" })).toBe(blocked);
    expect(holdsCustody(blocked)).toBe(true);
  });
  it("ignores a second send while one is out, and a send after it is saved", () => {
    const sending = send(IDLE);
    expect(send(sending)).toBe(sending);
    const saved = writeReducer(sending, { type: "saved", receipt: { operationId: original.key } });
    expect(send(saved)).toBe(saved);
  });
});

describe("answers from the payroll routes", () => {
  it("accepts only this request's receipt", () => {
    expect(classifyPayrollAnswer(200, fixtures.imports.success, original.key)).toEqual({ kind: "saved", receipt: fixtures.imports.success.receipt });
    expect(classifyPayrollAnswer(200, fixtures.imports.success, "66666666-6666-4666-8666-666666666666")).toEqual({ kind: "unknown" });
    expect(classifyPayrollAnswer(200, undefined, original.key)).toEqual({ kind: "unknown" });
  });
  it("reads a refusal with its place, a changed request as blocked, and everything unnamed as unknown", () => {
    expect(classifyPayrollAnswer(400, fixtures.imports.invalidResponse, original.key)).toEqual({ kind: "refused", code: "INVALID_PAYROLL_INPUT", issues: ["rows.0.netMinor"] });
    expect(classifyPayrollAnswer(409, fixtures.imports.conflictResponse, original.key)).toEqual({ kind: "blocked", code: "OPERATION_CONFLICT" });
    expect(classifyPayrollAnswer(409, { error: "REVISION_CONFLICT", message: "x" }, original.key)).toEqual({ kind: "refused", code: "REVISION_CONFLICT", issues: [] });
    expect(classifyPayrollAnswer(503, fixtures.imports.recovery.unknownResponse, original.key)).toEqual({ kind: "unknown" });
    expect(classifyPayrollAnswer(0, undefined, original.key)).toEqual({ kind: "unknown" });
    expect(classifyPayrollAnswer(500, { error: "ANYTHING" }, original.key)).toEqual({ kind: "unknown" });
    expect(classifyPayrollAnswer(403, {}, original.key)).toEqual({ kind: "unknown" });
    expect(classifyPayrollAnswer(401, {}, original.key)).toEqual({ kind: "unknown" });
  });
  it("reads a receipt look-up: found, not there yet, or not readable", () => {
    expect(classifyReceiptLook(200, fixtures.imports.recovery.receiptRead, original.key).kind).toBe("saved");
    expect(classifyReceiptLook(200, { receipt: null }, original.key)).toEqual({ kind: "none" });
    expect(classifyReceiptLook(200, fixtures.imports.recovery.receiptRead, "66666666-6666-4666-8666-666666666666")).toEqual({ kind: "failed" });
    expect(classifyReceiptLook(503, {}, original.key)).toEqual({ kind: "failed" });
    expect(classifyReceiptLook(0, undefined, original.key)).toEqual({ kind: "failed" });
  });
  it("reads every export reply the contract names", () => {
    expect(classifyExportAnswer(200, fixtures.exports.generated).kind).toBe("generated");
    expect(classifyExportAnswer(400, fixtures.exports.invalid)).toEqual({ kind: "refused", reason: "PROVIDER_EMPLOYEE_MAPPING_REQUIRED" });
    expect(classifyExportAnswer(400, { state: "invalid", reason: "made up" })).toEqual({ kind: "refused", reason: "INVALID" });
    expect(classifyExportAnswer(409, fixtures.exports.conflict)).toEqual({ kind: "conflict" });
    expect(classifyExportAnswer(409, fixtures.exports.duplicate)).toEqual({ kind: "already_generated" });
    expect(classifyExportAnswer(503, fixtures.exports.unknown)).toEqual({ kind: "unknown" });
    expect(classifyExportAnswer(200, { state: "unavailable" })).toEqual({ kind: "unknown" });
    expect(classifyExportAnswer(0, undefined)).toEqual({ kind: "unknown" });
    expect(classifyExportAnswer(403, fixtures.exports.unknown)).toEqual({ kind: "denied", signedOut: false });
  });
});
