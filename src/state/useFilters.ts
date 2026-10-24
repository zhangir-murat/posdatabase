import { useState, useMemo } from "react";
import { emptyFilters, type Filters, type Merchant } from "../lib/types";
import { filterMerchants } from "../lib/research";
export function useFilters(data: Merchant[]) {
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const filtered = useMemo(
    () => filterMerchants(data, filters),
    [data, filters],
  );
  return {
    filters,
    filtered,
    setFilter: (key: keyof Filters, value: string) =>
      setFilters((f) => ({ ...f, [key]: value })),
    reset: () => setFilters(emptyFilters),
    active: Object.values(filters).filter(Boolean).length,
  };
}
