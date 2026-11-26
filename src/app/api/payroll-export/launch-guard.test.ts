import * as exportService from "@/lib/payroll-export/service" with { rstest: "importActual" };
import { afterEach, beforeEach, describe, expect, it, rs } from "@rstest/core";
import { neutralProfile } from "@/lib/payroll-export/model";
import { POST as closePeriod } from "../period-close/route";
import { GET as downloadArtifact } from "../period-close/artifact/route";
import { GET as listProfiles, POST as saveProfile } from "./profiles/route";
import { GET as listReceipts, POST as retrieveReceipt } from "./receipts/route";
import { POST as generateExport } from "./route";

const fake = rs.hoisted(() => ({
  session: { id: "OWNER-1", role: "OWNER" },
  proof: rs.fn(),
  create: rs.fn(),
  download: rs.fn(),
  listReceipts: rs.fn(),
  retrieveReceipt: rs.fn(),
  listProfiles: rs.fn(),
  saveProfile: rs.fn(),
  read: rs.fn(),
  history: rs.fn(),
  population: rs.fn(),
  manifest: rs.fn(),
  handoff: rs.fn(),
}));

rs.mock("@/lib/auth/session", () => ({
  getSession: async () => fake.session,
  requireSessionMutationProof: fake.proof,
}));
rs.mock("@/lib/payroll-export/service", () => ({
  ...exportService,
  createPayrollExport: fake.create,
  listOwnPayrollExportReceipts: fake.listReceipts,
  readOwnPayrollExportReceipt: fake.retrieveReceipt,
  readExportProfiles: fake.listProfiles,
  saveExportProfile: fake.saveProfile,
}));
rs.mock("@/lib/period-close/service", () => ({
  readPeriodArtifact: fake.download,
  readPeriodClose: fake.read,
  readPeriodCloseHistory: fake.history,
  savePeriodPopulation: fake.population,
  preparePeriodManifest: fake.manifest,
  recordPeriodHandoff: fake.handoff,
}));

const origin = "https://example.test";
const operationId = "11111111-1111-4111-8111-111111111111";
const artifactId = "22222222-2222-4222-8222-222222222222";
const period = { startDate: "2026-09-21", endDate: "2026-09-27" };
const exportCommand = {
  ...period,
  operationId,
  profileId: null,
  profileRevision: 0,
  cards: [{
    employeeId: "EMPLOYEE-1",
    revision: 2,
    sourceHash: "a".repeat(32),
    finalizationOperationId: artifactId,
  }],
};
const savedFile = { operationId, csv: "employee,hours\nEMPLOYEE-1,8\n" };

function request(path: string, marker: string, body?: object) {
  return new Request(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin,
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "x-nevora-actor": fake.session.id,
      [marker]: "1",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const exportRequest = (suffix = "", body?: object) =>
  request("/api/payroll-export" + suffix, "x-nevora-payroll-export", body);
const closeRequest = (action: string) =>
  request("/api/period-close", "x-nevora-period-close", { action, command: period });
const artifactRequest = (format: string) =>
  request(`/api/period-close/artifact?id=${artifactId}&format=${format}`, "x-nevora-period-close");

async function expectDisabled(response: Response) {
  expect(response.status).toBe(403);
  expect(response.headers.get("cache-control")).toBe("no-store, private");
  expect(response.headers.get("content-disposition")).toBeNull();
  expect(await response.json()).toEqual({
    state: "unavailable",
    reason: "PAYROLL_EXPORTS_DISABLED",
  });
  expect(fake.proof).not.toHaveBeenCalled();
}

beforeEach(() => {
  rs.clearAllMocks();
  rs.stubEnv("FUEL_PORTAL_ORIGIN", origin);
  rs.stubEnv("NEVORA_PAYROLL_EXPORTS_DISABLED", "true");
  fake.proof.mockResolvedValue({ employee: fake.session });
  fake.create.mockResolvedValue(savedFile);
  fake.download.mockResolvedValue({
    content: savedFile.csv,
    contentType: "text/csv",
    filename: "fictional-payroll.csv",
    sha256: "b".repeat(64),
  });
  fake.listReceipts.mockResolvedValue([{ operationId }]);
  fake.retrieveReceipt.mockResolvedValue(savedFile);
  fake.listProfiles.mockResolvedValue([neutralProfile()]);
  fake.saveProfile.mockResolvedValue(neutralProfile());
  for (const handler of [fake.read, fake.history, fake.population, fake.manifest, fake.handoff]) {
    handler.mockResolvedValue(period);
  }
});

afterEach(() => {
  rs.unstubAllEnvs();
});

describe("server-side payroll export launch switch", () => {
  it("blocks generation and the same operation retry", async () => {
    await expectDisabled(await generateExport(exportRequest("", exportCommand)));
    await expectDisabled(await generateExport(exportRequest("", exportCommand)));
    expect(fake.create).not.toHaveBeenCalled();
  });

  it("blocks receipt listing and exact stored file retrieval", async () => {
    await expectDisabled(await listReceipts(exportRequest("/receipts")));
    await expectDisabled(await retrieveReceipt(exportRequest("/receipts", { operationId })));
    expect(fake.listReceipts).not.toHaveBeenCalled();
    expect(fake.retrieveReceipt).not.toHaveBeenCalled();
  });

  it("blocks export mapping reads and writes", async () => {
    await expectDisabled(await listProfiles(exportRequest("/profiles")));
    await expectDisabled(await saveProfile(exportRequest("/profiles", { profile: neutralProfile() })));
    expect(fake.listProfiles).not.toHaveBeenCalled();
    expect(fake.saveProfile).not.toHaveBeenCalled();
  });

  it.each(["manifest", "csv", "canonical"])("blocks a direct %s download", async (format) => {
    await expectDisabled(await downloadArtifact(artifactRequest(format)));
    expect(fake.download).not.toHaveBeenCalled();
  });

  it.each(["MANIFEST", "HANDOFF"])("blocks the period-close %s action", async (action) => {
    await expectDisabled(await closePeriod(closeRequest(action)));
    expect(fake.manifest).not.toHaveBeenCalled();
    expect(fake.handoff).not.toHaveBeenCalled();
  });

  it.each([
    ["READ", "read"],
    ["HISTORY", "history"],
    ["POPULATION", "population"],
  ] as const)("keeps %s available with exports disabled", async (action, handler) => {
    const response = await closePeriod(closeRequest(action));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: "ready", result: period });
    expect(fake[handler]).toHaveBeenCalledOnce();
    expect(fake.proof).toHaveBeenCalledOnce();
  });

  it("keeps authorized file generation and recovery when the switch is false", async () => {
    rs.stubEnv("NEVORA_PAYROLL_EXPORTS_DISABLED", "false");
    const generated = await generateExport(exportRequest("", exportCommand));
    expect(generated.status).toBe(200);
    expect(await generated.json()).toEqual({ state: "generated", export: savedFile });
    const retrieved = await retrieveReceipt(exportRequest("/receipts", { operationId }));
    expect(retrieved.status).toBe(200);
    expect(await retrieved.json()).toEqual({ state: "ready", export: savedFile });
    const downloaded = await downloadArtifact(artifactRequest("csv"));
    expect(downloaded.status).toBe(200);
    expect(await downloaded.text()).toBe(savedFile.csv);
    expect(fake.proof).toHaveBeenCalledTimes(3);
  });
});
