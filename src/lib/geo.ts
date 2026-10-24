import type { Merchant } from "./types";
export function featureCollection(data: Merchant[]) {
  return {
    type: "FeatureCollection" as const,
    features: data
      .filter((m) => m.latitude !== null && m.longitude !== null)
      .map((m) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [m.longitude!, m.latitude!],
        },
        properties: { id: m.id, provider: m.provider, name: m.business_name },
      })),
  };
}
export const NYC_BOUNDS: [number, number, number, number] = [
  -74.2591, 40.4774, -73.7004, 40.9176,
];
