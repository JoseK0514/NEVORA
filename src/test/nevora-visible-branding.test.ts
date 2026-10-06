import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { NUVORA_BRAND } from "@/lib/brand";
import { manifest } from "@/lib/notifications/manifest";
import { buildPushEnvelope } from "@/lib/notifications/payloads";
import type { NotificationIntent } from "@/lib/notifications/types";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe("NEVORA installation, notifications and status surfaces", () => {
  it("keeps pending Availability surfaces and ordinary recorded breaks out of attention styling", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const selector of [
      ".availability-deadline-banner",
      ".availability-submission-status.pending",
      ".availability-team-row.selected",
      ".employee-time-badge.on-break",
      ".manager-live-card .manager-floor-status.on-break",
      '.employee-shell [data-status="PENDING"] .status-pill',
    ]) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const blocks = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{[^}]*\\}`, "g"));
      expect(blocks, selector).not.toBeNull();
      for (const block of blocks ?? []) {
        expect(block, selector).not.toMatch(/var\(--(?:color-state-warning(?:-bg)?|soft-amber|amber)\)/);
      }
    }
  });

  it("exposes NEVORA metadata and installation identity while preserving PWA scope", () => {
    expect(NUVORA_BRAND.metadataTitle).toBe("NEVORA Workforce");
    expect(NUVORA_BRAND.platformLabel).toBe("NEVORA");
    expect(manifest()).toMatchObject({
      name: "NEVORA", short_name: "NEVORA", id: "/app", start_url: "/app", scope: "/app",
      theme_color: "#20232D", background_color: "#F6F6F8",
    });
    const offline = readFileSync("public/fuel-portal-offline.html", "utf8");
    expect(offline).toContain("NEVORA · Offline");
    expect(offline).not.toMatch(/\b(?:Fuel Scheduler|Fuel Coffee|Coffee Scheduler)\b/i);
  });

  it.each(["SCHEDULE_PUBLISHED", "SCHEDULE_CHANGED", "COVERAGE_ATTENTION", "AVAILABILITY_REMINDER"] as const)(
    "uses NEVORA in visible %s notification copy without changing its compatibility tag",
    (type) => {
      const intent = { id: "11111111-1111-4111-8111-111111111111", type, eventKey: "fictional-brand-check", expiresAt: "2030-10-07T12:00:00Z" } as NotificationIntent;
      const envelope = buildPushEnvelope(intent, "fictional-owner");
      expect(envelope.body).toContain("NEVORA");
      expect(`${envelope.title} ${envelope.body}`).not.toMatch(/\b(?:Fuel|Coffee)\b/i);
      expect(envelope.tag).toMatch(/^fuel-[a-f0-9]{32}$/);
    },
  );
});

describe("NEVORA visible branding regression", () => {
  it("keeps normal Availability states neutral instead of using the warning-brown treatment", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).not.toMatch(
      /\.employee-shell \.employee-availability-view \.availability-deadline-banner:not\(\.locked\)[^{]*\{[^}]*color:\s*var\(--color-state-warning\)/,
    );
    expect(css).not.toMatch(
      /\.employee-shell \.employee-availability-view \.availability-submission-status\.pending strong\s*\{[^}]*color:\s*var\(--color-state-warning\)/,
    );
  });

  it("does not hard-code Fuel-era product branding in user-facing TSX", () => {
    const files = ["src/app", "src/components"]
      .flatMap(walk)
      .filter((path) => path.endsWith(".tsx") && !path.includes(".test."));

    const prohibited = /\b(?:Fuel Scheduler|Fuel Coffee|Coffee Scheduler)\b/i;
    const violations = files.flatMap((path) => {
      const lines = readFileSync(path, "utf8").split("\n");
      return lines
        .map((line, index) => ({ path: relative(".", path), line: index + 1, text: line.trim() }))
        .filter((item) => prohibited.test(item.text));
    });

    expect(violations).toEqual([]);
  });
});
