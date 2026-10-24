import { supabase } from "./supabase";
import type { Merchant } from "./types";
export async function fetchMerchants(): Promise<Merchant[]> {
  if (!supabase) throw Error("Database environment is not configured.");
  const rows: Merchant[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("merchant_current")
      .select("*")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(
      ...(data || []).map((row) => ({
        ...row,
        observation_date: row.observation_date || "",
      })),
    );
    if (!data || data.length < 1000) break;
  }
  return rows;
}
export async function saveMerchant(m: Merchant, isNew: boolean) {
  if (!supabase) throw Error("Database is not configured.");
  const { data, error } = await supabase.rpc("save_merchant_observation", {
    payload: { ...m, id: isNew ? null : m.id },
  });
  if (error) throw error;
  return data;
}

export async function importRooseveltIsland() {
  if (!supabase) throw Error("Database is not configured.");
  const { data, error } = await supabase.rpc("import_roosevelt_island");
  if (error) throw error;
  return data as number;
}

export async function importFieldReports() {
  if (!supabase) throw Error("Database is not configured.");
  const { data, error } = await supabase.rpc("import_field_reports");
  if (error) throw error;
  return data as number;
}
