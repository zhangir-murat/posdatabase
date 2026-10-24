import { colors, type Merchant, type Filters } from "./types";
export function filterMerchants(data: Merchant[], f: Filters) {
  const q = f.search.trim().toLowerCase();
  return data.filter(
    (m) =>
      (!q ||
        [m.business_name, m.street_address, m.zip_code, m.neighborhood, m.id]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      (!f.borough || m.borough === f.borough) &&
      (!f.neighborhood || m.neighborhood === f.neighborhood) &&
      (!f.category || m.category === f.category) &&
      (!f.provider || m.provider === f.provider) &&
      (!f.status || m.verification_status === f.status) &&
      (!f.from || (!!m.observation_date && m.observation_date >= f.from)) &&
      (!f.to || (!!m.observation_date && m.observation_date <= f.to)),
  );
}
export function distribution(data: Merchant[], field: keyof Merchant) {
  const counts = new Map<string, number>();
  data.forEach((m) => {
    const k = String(m[field] || "Unknown");
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  return [...counts]
    .map(([name, value]) => ({ name, value, color: colors[name] || "#e56d3b" }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}
export function validateMerchant(m: Merchant) {
  if (!m.business_name.trim() || !m.street_address.trim())
    return "Business name and street address are required.";
  if (!/^\d{5}$/.test(m.zip_code)) return "Enter a five-digit ZIP code.";
  if ((m.latitude === null) !== (m.longitude === null))
    return "Provide both coordinates or leave both empty.";
  if (
    m.latitude !== null &&
    (!Number.isFinite(m.latitude) ||
      m.latitude < 40.4774 ||
      m.latitude > 40.9176 ||
      m.longitude! < -74.2591 ||
      m.longitude! > -73.7004 ||
      !Number.isFinite(m.longitude))
  )
    return "Coordinates must be within the NYC bounding envelope. Borough boundaries still require field verification.";
  if (
    m.observation_date &&
    m.observation_date >
      new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })
  )
    return "Observation date must be today or earlier.";
  if (m.verification_status === "Verified" && m.provider === "Unknown")
    return "An unknown POS provider cannot be marked verified.";
  return null;
}
export function csv(data: Merchant[]) {
  const fields: (keyof Merchant)[] = [
    "id",
    "business_name",
    "street_address",
    "city",
    "borough",
    "neighborhood",
    "zip_code",
    "latitude",
    "longitude",
    "category",
    "provider",
    "hardware",
    "gateway",
    "verification_status",
    "observation_date",
    "evidence_method",
    "notes",
    "is_demo",
  ];
  const quote = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    fields.join(","),
    ...data.map((m) => fields.map((k) => quote(m[k])).join(",")),
  ].join("\r\n");
}
export function exportCsv(data: Merchant[]) {
  const a = document.createElement("a");
  const u = URL.createObjectURL(
    new Blob([csv(data)], { type: "text/csv;charset=utf-8" }),
  );
  a.href = u;
  a.download = `nyc-pos-atlas-${data.some((m) => m.is_demo) ? "illustrative" : "research"}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
