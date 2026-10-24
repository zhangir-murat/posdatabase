import { useEffect, useRef, useState, lazy, Suspense } from "react";
import maplibregl, {
  type GeoJSONSource,
  type ExpressionSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker.js?url";
maplibregl.setWorkerUrl(workerUrl);
const OpenLayersMap = lazy(() => import("./OpenLayersMap"));
import { Maximize2, LocateFixed, MapPin } from "lucide-react";
import { featureCollection, NYC_BOUNDS } from "../lib/geo";
import { colors, type Merchant } from "../lib/types";
export default function AtlasMap({
  merchants,
  onSelect,
  selected,
  focus,
}: {
  merchants: Merchant[];
  onSelect: (m: Merchant) => void;
  selected: Merchant | null;
  focus: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const current = useRef({ merchants, onSelect });
  current.current = { merchants, onSelect };
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    let m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: container.current,
        center: [-73.9537, 40.7619],
        zoom: 14.45,
        minZoom: 9,
        maxZoom: 19,
        maxBounds: [
          [-74.5, 40.3],
          [-73.4, 41.1],
        ],
        attributionControl: { compact: false },
        style:
          import.meta.env.VITE_MAP_STYLE_URL ||
          "https://tiles.openfreemap.org/styles/positron",
      });
      map.current = m;
    } catch (error) {
      console.info("Using canvas map: WebGL unavailable");
      setFailed(true);
      return;
    }
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    m.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-left",
    );
    m.on("load", () => {
      m.addSource("merchants", {
        type: "geojson",
        data: featureCollection(current.current.merchants),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 40,
      });
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "merchants",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#e77847",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15,
            20,
            20,
            100,
            26,
          ],
          "circle-stroke-width": 4,
          "circle-stroke-color": "#ffffff",
        },
      });
      m.addLayer({
        id: "halo",
        type: "circle",
        source: "merchants",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 13,
          "circle-color": [
            "match",
            ["get", "provider"],
            ...Object.entries(colors).flat(),
            "#999",
          ] as unknown as ExpressionSpecification,
          "circle-opacity": 0.15,
        },
      });
      m.addLayer({
        id: "points",
        type: "circle",
        source: "merchants",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 7,
          "circle-color": [
            "match",
            ["get", "provider"],
            ...Object.entries(colors).flat(),
            "#999",
          ] as unknown as ExpressionSpecification,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
        },
      });
      m.on("click", "points", (e) => {
        const id = e.features?.[0].properties?.id;
        const found = current.current.merchants.find((x) => x.id === id);
        if (found) current.current.onSelect(found);
      });
      m.on("click", "clusters", async (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const z = await (
          m.getSource("merchants") as GeoJSONSource
        ).getClusterExpansionZoom(Number(f.properties?.cluster_id));
        if (f.geometry.type === "Point")
          m.easeTo({
            center: f.geometry.coordinates as [number, number],
            zoom: z,
          });
      });
      ["points", "clusters"].forEach((layer) => {
        m.on(
          "mouseenter",
          layer,
          () => (m.getCanvas().style.cursor = "pointer"),
        );
        m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
      });
      setLoaded(true);
    });
    let errors = 0;
    m.on("error", () => {
      if (++errors > 5) setFailed(true);
    });
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (loaded)
      (map.current?.getSource("merchants") as GeoJSONSource)?.setData(
        featureCollection(merchants),
      );
  }, [merchants, loaded]);
  useEffect(() => {
    if (selected?.latitude != null && selected.longitude != null)
      map.current?.flyTo({
        center: [selected.longitude, selected.latitude],
        zoom: 16,
        duration: 700,
      });
  }, [selected]);
  useEffect(() => {
    if (focus === "sample") {
      fit();
      return;
    }
    if (focus === "nyc")
      map.current?.fitBounds(
        [
          [NYC_BOUNDS[0], NYC_BOUNDS[1]],
          [NYC_BOUNDS[2], NYC_BOUNDS[3]],
        ],
        { padding: 45, duration: 900 },
      );
    else
      map.current?.flyTo({
        center: [-73.9537, 40.7619],
        zoom: 14.45,
        duration: 900,
      });
  }, [focus]);
  function fit() {
    const mapped = merchants.filter((m) => m.latitude !== null);
    if (!mapped.length) return;
    const b = new maplibregl.LngLatBounds();
    mapped.forEach((m) => b.extend([m.longitude!, m.latitude!]));
    map.current?.fitBounds(b, { padding: 65, maxZoom: 16, duration: 700 });
  }
  if (failed)
    return (
      <Suspense
        fallback={
          <div className="map-shell">
            <div className="map-empty">Loading geographic canvas…</div>
          </div>
        }
      >
        <OpenLayersMap
          merchants={merchants}
          onSelect={onSelect}
          selected={selected}
          focus={focus}
        />
      </Suspense>
    );
  return (
    <div className="map-shell">
      <div ref={container} className="map-canvas" />
      {failed && (
        <div className="map-error">
          Map tiles could not load. Check your connection. Merchant records
          remain available in the database.
        </div>
      )}
      <div className="map-top">
        <div className="map-location">
          <span className="green-dot" />
          NEW YORK CITY <span>/</span>{" "}
          {focus === "nyc"
            ? "ALL BOROUGHS"
            : focus === "sample"
              ? "RESEARCH SAMPLE"
              : "ROOSEVELT ISLAND"}
        </div>
      </div>
      <div className="map-bottom">
        <button onClick={fit} title="Fit map to filtered merchants">
          <Maximize2 size={14} /> Fit to results
        </button>
        <button
          onClick={() =>
            map.current?.flyTo({ center: [-73.9505, 40.7625], zoom: 15 })
          }
          title="Center Roosevelt Island"
        >
          <LocateFixed size={15} />
        </button>
      </div>
      <div className="map-key">
        <span className="eyebrow">POS PROVIDER</span>
        <div>
          {Object.entries(colors)
            .filter(([n]) => merchants.some((m) => m.provider === n))
            .map(([n, c]) => (
              <span key={n}>
                <i style={{ background: c }} />
                {n}
              </span>
            ))}
        </div>
      </div>
      {!merchants.some((m) => m.latitude !== null) && (
        <div className="map-empty">
          <MapPin size={25} />
          <strong>No mapped merchants</strong>
          <span>Add coordinates or adjust your filters.</span>
        </div>
      )}
    </div>
  );
}
