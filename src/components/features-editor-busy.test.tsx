import * as actualReact from "react" with { rstest: 'importActual' };
import { afterEach, expect, it, rs } from "@rstest/core";
import type { ReactElement, ReactNode } from "react";

const host = rs.hoisted(() => ({ index: 0, slots: [] as unknown[], effects: [] as (() => unknown)[], lang: "en" as "en" | "es" }));
rs.mock("react", () => ({
  ...actualReact,
  useState: (initial: unknown) => {
    const index = host.index++;
    if (!(index in host.slots)) host.slots[index] = initial;
    return [host.slots[index], (next: unknown) => { host.slots[index] = typeof next === "function" ? next(host.slots[index]) : next; }];
  },
  useRef: (initial: unknown) => {
    const index = host.index++;
    return host.slots[index] ??= { current: initial };
  },
  useEffect: (fn: () => unknown) => { host.effects.push(fn); },
}));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: rs.fn() }) }));
rs.mock("@/lib/i18n/portal-lang", () => ({ usePortalLang: () => host.lang }));
import { FeaturesEditor } from "./features-editor";
import { ResultB, SwitchRowB } from "@/app/app/settings/settings-b-form";

function visit(children: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(children)) return children.flatMap(visit);
  if (!actualReact.isValidElement<Record<string, unknown>>(children)) return [];
  return [children, ...visit(children.props.children as ReactNode)];
}
function draw(blockers = {}) {
  host.index = 0;
  host.effects = [];
  return visit(FeaturesEditor({ revision: 1, preset: "standard", disabled: [], payrollEnabled: false, blockers }));
}
const toggle = (nodes: ReturnType<typeof draw>) => nodes.find(n => n.type === SwitchRowB && n.props.id === "module-timeOff")!.props;

afterEach(() => { rs.unstubAllGlobals(); rs.useRealTimers(); host.slots = []; });

it.each(["en", "es"] as const)("keeps time off on and takes the owner to pending requests after a 409 in %s", async lang => {
  host.lang = lang;
  rs.useFakeTimers();
  rs.stubGlobal("window", { setTimeout, clearTimeout });
  const send = rs.fn(async () => Response.json({ state: "busy", module: "timeOff", count: 1 }, { status: 409 }));
  rs.stubGlobal("fetch", send);
  const initiallyBlocked = toggle(draw({timeOff: 1}));
  expect(initiallyBlocked.disabled).toBe(true);
  expect(initiallyBlocked.checked).toBe(true);
  expect(initiallyBlocked.description).toMatch(lang === "en" ? /1 request.*first/i : /1 solicitud.*primero/i);
  const open = toggle(draw());
  expect(open.disabled).toBe(false);
  (open.onChange as () => void)();
  draw();
  host.effects.forEach(effect => effect());
  await rs.advanceTimersByTimeAsync(401);
  expect(send).toHaveBeenCalledTimes(1);
  const output = draw();
  expect(toggle(output).checked).toBe(true);
  const refusal = output.find(n => n.type === ResultB)!;
  expect(String(refusal.props.children)).toMatch(lang === "en" ? /1 request.*first/i : /1 solicitud.*primero/i);
  const action = refusal.props.action as ReactElement<{href?:string, children?:ReactNode}>;
  expect(action.props.href).toBe("/app/requests");
  expect(action.props.children).toBe(lang === "en" ? "Review time-off requests" : "Revisar solicitudes de días libres");
});
