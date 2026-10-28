import { describe, it, expect } from "vitest";
import { fieldReports as rows } from "../data/fieldReports";
import { distribution, validateMerchant, csv } from "../lib/research";
describe("NYC field report expansion", () => {
  it("retains fifteen unique, undated, real branch-specific records", () => {
    expect(rows).toHaveLength(15);
    expect(new Set(rows.map((m) => m.id)).size).toBe(15);
    expect(
      rows.filter((m) => m.neighborhood === "Roosevelt Island"),
    ).toHaveLength(4);
    expect(rows.every((m) => !m.is_demo && m.observation_date === "")).toBe(
      true,
    );
    expect(rows.every((m) => validateMerchant(m) === null)).toBe(true);
  });
  it("keeps hardware brands and ambiguous payment platforms out of POS shares", () => {
    expect(rows.filter((m) => m.hardware === "Verifone")).toHaveLength(4);
    expect(rows.find((m) => m.hardware === "PAX S300")?.provider).toBe(
      "Unknown",
    );
    const valor = rows.find((m) => m.payment_platform === "Valor PayTech");
    expect(valor).toMatchObject({
      provider: "Unknown",
      hardware: "Unknown",
      gateway: "Unknown",
    });
    const dist = distribution(rows, "provider");
    expect(dist.find((d) => d.name === "Unknown")?.value).toBe(7);
    expect(dist.find((d) => d.name === "Square")?.value).toBe(3);
    expect(dist.find((d) => d.name === "Toast")?.value).toBe(2);
    expect(dist.find((d) => d.name === "Clover")?.value).toBe(1);
  });
  it("preserves the confirmed Gentile branch and all payment fields in exports", () => {
    expect(
      rows.find((m) => m.business_name.startsWith("Gelateria Gentile")),
    ).toMatchObject({
      neighborhood: "Nolita",
      street_address: "229 Elizabeth Street",
      provider: "Toast",
    });
    const text = csv(rows);
    expect(text).toContain("payment_platform");
    expect(text).toContain("Valor PayTech");
    expect(text).toContain("PAX S300");
  });
});
