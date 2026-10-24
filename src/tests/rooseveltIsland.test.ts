import { describe, it, expect } from "vitest";
import { rooseveltIslandMerchants as rows } from "../data/rooseveltIsland";
import {
  filterMerchants,
  distribution,
  csv,
  validateMerchant,
} from "../lib/research";
import { emptyFilters } from "../lib/types";
describe("actual Roosevelt Island reports", () => {
  it("separates observed hardware and gateway from unknown POS", () => {
    expect(rows).toHaveLength(2);
    expect(rows.every((m) => !m.is_demo)).toBe(true);
    expect(rows[0]).toMatchObject({
      provider: "Unknown",
      hardware: "Ingenico",
      gateway: "FreedomPay",
      verification_status: "Unverified",
    });
    expect(rows[1]).toMatchObject({ provider: "Clover", hardware: "Unknown" });
    expect(
      distribution(rows, "provider")
        .map((d) => d.name)
        .sort(),
    ).toEqual(["Clover", "Unknown"]);
  });
  it("does not invent observation dates and excludes undated records from date filters", () => {
    expect(rows.every((m) => m.observation_date === "")).toBe(true);
    expect(filterMerchants(rows, emptyFilters)).toHaveLength(2);
    expect(
      filterMerchants(rows, { ...emptyFilters, to: "2026-12-31" }),
    ).toHaveLength(0);
    expect(rows.every((m) => validateMerchant(m) === null)).toBe(true);
  });
  it("preserves gateway in research exports", () => {
    const result = csv(rows);
    expect(result).toContain("gateway");
    expect(result).toContain("FreedomPay");
    expect(result).not.toContain("2026-10-24");
  });
});
