import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ fail: false, missingTable: false, noWorkspace: false, disabled: [] as string[] }));
vi.mock("react", async () => ({ ...(await vi.importActual<typeof import("react")>("react")), cache: <T,>(fn: T) => fn }));
vi.mock("@/components/module-off", () => ({ ModuleOff: () => null }));
vi.mock("../auth/session", () => ({ getSession: async () => null }));
vi.mock("../data/workspaces", () => ({ getWorkspace: async () => { if (state.noWorkspace) throw Error("fictional: no database"); return { id: "workspace-fictional" }; } }));
vi.mock("./service", async () => {
  const { ALL_MODULES_ON } = await import("./modules");
  return { readActivePresentation: async (_id: string, _ex: unknown, options?: { strict?: boolean }) => {
    if (state.fail && options?.strict) throw Error("fictional database blip");
    if (state.missingTable) return { style: undefined, tokens: null, logoAssetId: null, revision: 0, words: "standard", modules: ALL_MODULES_ON };
    return { style: undefined, tokens: null, logoAssetId: null, revision: 1, words: "standard", modules: { ...ALL_MODULES_ON, ...Object.fromEntries(state.disabled.map(id => [id, false])) } };
  } };
});
import { currentPresentation, moduleEnabled } from "./current.server";
beforeEach(() => { state.fail = false; state.missingTable = false; state.noWorkspace = false; state.disabled = []; });

it("P4 module gates read the saved setting", async () => {
  state.disabled = ["payStatements"];
  expect(await moduleEnabled("payStatements")).toBe(false);
  expect(await moduleEnabled("timeOff")).toBe(true);
});
it("P4 when the setting can't be read, the look falls back to every module on but gates treat modules as off", async () => {
  state.fail = true;
  expect((await currentPresentation()).modules.payStatements).toBe(true);
  expect(await moduleEnabled("payStatements")).toBe(false);
  expect(await moduleEnabled("timeOff")).toBe(false);
});
it("P4 a database that never set up presentation, or has no company record yet, keeps every module on", async () => {
  state.missingTable = true;
  expect(await moduleEnabled("payStatements")).toBe(true);
  state.missingTable = false; state.noWorkspace = true;
  expect(await moduleEnabled("timeOff")).toBe(true);
});
