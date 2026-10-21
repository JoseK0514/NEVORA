import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ fail: false, disabled: [] as string[] }));
vi.mock("react", async () => ({ ...(await vi.importActual<typeof import("react")>("react")), cache: <T,>(fn: T) => fn }));
vi.mock("@/components/module-off", () => ({ ModuleOff: () => null }));
vi.mock("../auth/session", () => ({ getSession: async () => null }));
vi.mock("../data/workspaces", () => ({ getWorkspace: async () => ({ id: "workspace-fictional" }) }));
vi.mock("./service", async () => {
  const { ALL_MODULES_ON } = await import("./modules");
  return { readActivePresentation: async () => {
    if (state.fail) throw Error("fictional database blip");
    return { style: undefined, tokens: null, logoAssetId: null, revision: 1, words: "standard", modules: { ...ALL_MODULES_ON, ...Object.fromEntries(state.disabled.map(id => [id, false])) } };
  } };
});
import { currentPresentation, moduleEnabled } from "./current.server";
beforeEach(() => { state.fail = false; state.disabled = []; });

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
