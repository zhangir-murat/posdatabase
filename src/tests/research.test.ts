import { describe, it, expect } from "vitest";
import { demoMerchants } from "../data/demo";
import {
  filterMerchants,
  distribution,
  validateMerchant,
  csv,
} from "../lib/research";
import { emptyFilters } from "../lib/types";
import { featureCollection } from "../lib/geo";
describe("research semantics", () => {
  it("combines filters and includes unknown POS in sample shares", () => {
    const rows = filterMerchants(demoMerchants, {
      ...emptyFilters,
      neighborhood: "Roosevelt Island",
      status: "Unverified",
      provider: "Unknown",
    });
    expect(rows.length).toBe(2);
    expect(
      rows.every(
        (m) =>
          m.neighborhood === "Roosevelt Island" && m.provider === "Unknown",
      ),
    ).toBe(true);
    expect(
      distribution(demoMerchants, "provider").reduce((s, d) => s + d.value, 0),
    ).toBe(demoMerchants.length);
  });
  it("applies inclusive observation date bounds", () => {
    const row = demoMerchants[0];
    expect(
      filterMerchants([row], {
        ...emptyFilters,
        from: row.observation_date,
        to: row.observation_date,
      }),
    ).toHaveLength(1);
    expect(
      filterMerchants([row], { ...emptyFilters, from: "2026-12-01" }),
    ).toHaveLength(0);
  });
  it("validates coordinate pairs, city envelope and confidence", () => {
    const row = demoMerchants[0];
    expect(validateMerchant(row)).toBeNull();
    expect(
      validateMerchant({ ...row, latitude: null, longitude: row.longitude }),
    ).toMatch(/both/);
    expect(validateMerchant({ ...row, latitude: 0 })).toMatch(/NYC/);
    expect(validateMerchant({ ...row, longitude: NaN })).toMatch(/NYC/);
    expect(validateMerchant({ ...row, provider: "Unknown" })).toMatch(
      /unknown/,
    );
    expect(
      validateMerchant({ ...row, latitude: null, longitude: null }),
    ).toBeNull();
  });
  it("retains unmapped locations in stats but excludes from map features", () => {
    const m = { ...demoMerchants[0], latitude: null, longitude: null };
    expect(distribution([m], "provider")[0].value).toBe(1);
    expect(featureCollection([m]).features).toHaveLength(0);
  });
  it("exports quoted data, marks examples and neutralizes spreadsheet formulas", () => {
    const raw = csv([
      {
        ...demoMerchants[0],
        business_name: "=SUM(1,2)",
        notes: 'A "quoted" note\nNext line',
      },
    ]);
    expect(raw).toContain('"\'=SUM(1,2)"');
    expect(raw).toContain('"A ""quoted"" note\nNext line"');
    expect(raw).toContain('"true"');
  });
});
