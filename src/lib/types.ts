export type Status = "Verified" | "Inferred" | "Unverified";
export type Borough =
  | "Manhattan"
  | "Brooklyn"
  | "Queens"
  | "Bronx"
  | "Staten Island";
export interface Merchant {
  id: string;
  business_name: string;
  street_address: string;
  city: string;
  borough: Borough;
  neighborhood: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  provider: string;
  hardware: string;
  gateway?: string;
  verification_status: Status;
  observation_date: string;
  notes: string;
  evidence_method: string;
  observation_id?: string;
  observation_count?: number;
  is_demo?: boolean;
  is_seed?: boolean;
}
export type Filters = {
  search: string;
  borough: string;
  neighborhood: string;
  category: string;
  provider: string;
  status: string;
  from: string;
  to: string;
};
export const emptyFilters: Filters = {
  search: "",
  borough: "",
  neighborhood: "",
  category: "",
  provider: "",
  status: "",
  from: "",
  to: "",
};
export const providers = [
  "Square",
  "Toast",
  "Clover",
  "Shopify POS",
  "Lightspeed",
  "Other",
  "Unknown",
];
export const categories = [
  "Café & bakery",
  "Restaurant",
  "Bar & nightlife",
  "Grocery & deli",
  "Retail",
  "Health & beauty",
  "Services",
  "Other",
];
export const boroughs: Borough[] = [
  "Manhattan",
  "Brooklyn",
  "Queens",
  "Bronx",
  "Staten Island",
];
export const colors: Record<string, string> = {
  Square: "#e56d3b",
  Toast: "#ddad49",
  Clover: "#688c76",
  "Shopify POS": "#8d80b1",
  Lightspeed: "#568fa5",
  Other: "#c78185",
  Unknown: "#9b9d97",
};
