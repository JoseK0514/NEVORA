import { expect, it } from "vitest";
import { actionMenuGeometry } from "./action-menu-geometry";

const trigger = { left: 31, right: 251, top: 57.828125, bottom: 101.828125 };

it("uses the visible rectangle when neither anchor side fits the short-viewport menu", () => {
  const box = actionMenuGeometry({ trigger, viewport: { width: 320, height: 160 }, naturalHeight: 126 });
  expect(box.left).toBe(12);
  expect(box.width).toBe(296);
  expect(box.top).toBeGreaterThanOrEqual(12);
  // 136px is available in this viewport: enough for the entire 126px menu,
  // including its padding/borders, instead of a clipped 38px strip.
  expect(box.maxHeight).toBe(136);
  expect(box.top + Math.min(126, box.maxHeight)).toBeLessThanOrEqual(148);
});

it("keeps a usable scroll area when the trigger occupies both anchor sides", () => {
  const box = actionMenuGeometry({
    trigger: { left: 31, right: 251, top: 13, bottom: 57 },
    viewport: { width: 320, height: 70 }, naturalHeight: 126,
  });
  expect(box).toEqual({ left: 12, top: 12, width: 296, maxHeight: 46 });
});

it("uses the visual viewport offsets for containment on both axes", () => {
  const box = actionMenuGeometry({
    trigger: { left: 45, right: 89, top: 180, bottom: 224 },
    viewport: { width: 320, height: 160, offsetLeft: 40, offsetTop: 100 },
    naturalHeight: 180,
  });
  expect(box.left).toBe(52);
  expect(box.left + box.width).toBeLessThanOrEqual(348);
  expect(box.top).toBeGreaterThanOrEqual(112);
  expect(box.top + Math.min(180, box.maxHeight)).toBeLessThanOrEqual(248);
});

it("preserves normal below-anchor and end-aligned placement when it fits", () => {
  expect(actionMenuGeometry({
    trigger: { left: 500, right: 720, top: 100, bottom: 144 },
    viewport: { width: 1024, height: 900 }, naturalHeight: 126,
  })).toEqual({ left: 402, top: 152, width: 318, maxHeight: 736 });
});

it("opens above an anchor near the bottom without changing its gap", () => {
  const box = actionMenuGeometry({
    trigger: { left: 500, right: 720, top: 800, bottom: 844 },
    viewport: { width: 1024, height: 900 }, naturalHeight: 126, align: "start",
  });
  expect(box).toEqual({ left: 500, top: 666, width: 318, maxHeight: 780 });
});

it("clamps an offscreen anchor into the visible viewport", () => {
  const box = actionMenuGeometry({
    trigger: { left: -200, right: 20, top: -100, bottom: -56 },
    viewport: { width: 320, height: 160 }, naturalHeight: 200,
  });
  expect(box.left).toBe(12);
  expect(box.top).toBe(12);
  expect(box.maxHeight).toBeLessThanOrEqual(136);
  expect(box.top + box.maxHeight).toBeLessThanOrEqual(148);
});

it("opens a narrower preferred width right-aligned to its trigger (upscale S7: the 240px account menu)", () => {
  const box = actionMenuGeometry({ trigger: { left: 1700, right: 1888, top: 4, bottom: 48 }, viewport: { width: 1920, height: 1080 }, naturalHeight: 260, preferredWidth: 240 });
  expect(box.width).toBe(240);
  expect(box.left).toBe(1888 - 240);
  expect(box.top).toBe(56);
  // Still clamped to the viewport on a narrow window.
  expect(actionMenuGeometry({ trigger, viewport: { width: 200, height: 600 }, naturalHeight: 100, preferredWidth: 240 }).width).toBe(176);
});
