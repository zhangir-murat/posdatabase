import type { Merchant } from "../lib/types";
// Entirely synthetic examples. Names, providers, dates and coordinates are illustrative.
const examples: [string, string, number, number, string, string][] = [
  ["Island Coffee", "Café & bakery", 40.76255, -73.95013, "Square", "Verified"],
  [
    "Main Street Market",
    "Grocery & deli",
    40.76294,
    -73.9497,
    "Clover",
    "Verified",
  ],
  ["Riverwalk Kitchen", "Restaurant", 40.7596, -73.95323, "Toast", "Verified"],
  [
    "Northside Pharmacy",
    "Health & beauty",
    40.76412,
    -73.94872,
    "Unknown",
    "Unverified",
  ],
  ["The Island Table", "Restaurant", 40.76112, -73.95158, "Toast", "Verified"],
  [
    "East River Books",
    "Retail",
    40.76339,
    -73.94948,
    "Shopify POS",
    "Verified",
  ],
  ["Corner Deli", "Grocery & deli", 40.7637, -73.94898, "Clover", "Inferred"],
  ["Daily Bread", "Café & bakery", 40.76035, -73.95232, "Square", "Verified"],
  ["Studio on Main", "Services", 40.7645, -73.94834, "Square", "Inferred"],
  [
    "Riverwalk Bar",
    "Bar & nightlife",
    40.75914,
    -73.95367,
    "Toast",
    "Verified",
  ],
  ["Island Flowers", "Retail", 40.76214, -73.95057, "Square", "Verified"],
  [
    "The Little Salon",
    "Health & beauty",
    40.76502,
    -73.94779,
    "Clover",
    "Unverified",
  ],
  [
    "Southpoint Café",
    "Café & bakery",
    40.7586,
    -73.95403,
    "Square",
    "Verified",
  ],
  ["Main Street Goods", "Retail", 40.7654, -73.9474, "Lightspeed", "Inferred"],
  [
    "Fresh Island",
    "Grocery & deli",
    40.76162,
    -73.9511,
    "Unknown",
    "Unverified",
  ],
  [
    "Neighborhood Pizza",
    "Restaurant",
    40.76313,
    -73.94962,
    "Toast",
    "Verified",
  ],
  [
    "Bridgeview Café",
    "Café & bakery",
    40.75491,
    -73.95435,
    "Square",
    "Verified",
  ],
  [
    "Queensboro Market",
    "Grocery & deli",
    40.75621,
    -73.95084,
    "Clover",
    "Inferred",
  ],
  ["Vernon Studio", "Retail", 40.75112, -73.95424, "Shopify POS", "Verified"],
  [
    "Waterfront Kitchen",
    "Restaurant",
    40.74917,
    -73.95882,
    "Toast",
    "Verified",
  ],
  ["Garden Coffee", "Café & bakery", 40.75903, -73.96198, "Square", "Verified"],
  [
    "Eastside Apothecary",
    "Health & beauty",
    40.76134,
    -73.96308,
    "Lightspeed",
    "Unverified",
  ],
  [
    "York Avenue Deli",
    "Grocery & deli",
    40.76521,
    -73.95895,
    "Other",
    "Inferred",
  ],
  ["The Weekend Shop", "Retail", 40.76441, -73.9603, "Shopify POS", "Verified"],
];
export const demoMerchants: Merchant[] = examples.map((e, i) => ({
  id: `DEMO-${String(i + 1).padStart(3, "0")}`,
  business_name: e[0],
  street_address: `${100 + i * 15} ${i < 16 ? "Main Street" : i < 20 ? "Vernon Boulevard" : "York Avenue"}`,
  city: "New York",
  borough: i >= 16 && i < 20 ? "Queens" : "Manhattan",
  neighborhood:
    i < 16
      ? "Roosevelt Island"
      : i < 20
        ? "Long Island City"
        : "Upper East Side",
  zip_code: i < 16 ? "10044" : i < 20 ? "11101" : "10065",
  latitude: e[2],
  longitude: e[3],
  category: e[1],
  provider: e[4],
  hardware:
    e[4] === "Square"
      ? "Square Terminal"
      : e[4] === "Clover"
        ? "Clover Flex"
        : "Unknown",
  verification_status: e[5] as Merchant["verification_status"],
  observation_date: `2026-10-${String(5 + (i % 15)).padStart(2, "0")}`,
  notes:
    "Illustrative record only. This business name, location and POS assignment are synthetic and are not field research.",
  evidence_method: "Synthetic example",
  is_demo: true,
  observation_count: 1,
}));
