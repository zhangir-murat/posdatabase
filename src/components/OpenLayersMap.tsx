import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import VectorLayer from "ol/layer/Vector";
import LayerGroup from "ol/layer/Group";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { fromLonLat, transformExtent } from "ol/proj";
import {
  defaults as defaultControls,
  Attribution,
  ScaleLine,
} from "ol/control";
import { apply } from "ol-mapbox-style";
import "ol/ol.css";
import { Maximize2, LocateFixed, MapPin } from "lucide-react";
import { colors, type Merchant } from "../lib/types";
// Canvas fallback uses the same OpenFreeMap vector source without requiring WebGL.
export default function OpenLayersMap({
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
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const source = useRef(new VectorSource());
  const current = useRef({ merchants, onSelect });
  current.current = { merchants, onSelect };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!el.current) return;
    let active = true;
    const basemap = new LayerGroup();
    const points = new VectorLayer({
      source: source.current,
      zIndex: 100,
      style: (feature) => {
        const c = colors[String(feature.get("provider"))] || "#999";
        return [
          new Style({
            image: new CircleStyle({
              radius: 12,
              fill: new Fill({ color: c + "28" }),
            }),
          }),
          new Style({
            image: new CircleStyle({
              radius: 6.5,
              fill: new Fill({ color: c }),
              stroke: new Stroke({ color: "#fff", width: 2 }),
            }),
          }),
        ];
      },
    });
    const m = new Map({
      target: el.current,
      layers: [basemap, points],
      controls: defaultControls({ attribution: false }).extend([
        new Attribution({ collapsible: false }),
        new ScaleLine({ units: "metric" }),
      ]),
      view: new View({
        center: fromLonLat([-73.9537, 40.7619]),
        zoom: 14.45,
        minZoom: 9,
        maxZoom: 19,
        extent: transformExtent(
          [-74.5, 40.3, -73.4, 41.1],
          "EPSG:4326",
          "EPSG:3857",
        ),
      }),
    });
    map.current = m;
    // Use local system fonts; no font CDN or account is required by this fallback.
    fetch(
      import.meta.env.VITE_MAP_STYLE_URL ||
        "https://tiles.openfreemap.org/styles/positron",
    )
      .then((r) => {
        if (!r.ok) throw Error("Map style unavailable");
        return r.json();
      })
      .then((style) => {
        if (!active) return;
        style.layers.forEach((l: { layout?: Record<string, unknown> }) => {
          if (l.layout?.["text-font"]) l.layout["text-font"] = ["Arial"];
        });
        return apply(basemap, style);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    m.on("singleclick", (event) => {
      const hit = m.forEachFeatureAtPixel(event.pixel, (f) => f, {
        layerFilter: (l) => l === points,
        hitTolerance: 5,
      });
      if (hit) {
        const found = current.current.merchants.find(
          (x) => x.id === hit.get("merchantId"),
        );
        if (found) current.current.onSelect(found);
      }
    });
    m.on("pointermove", (e) => {
      const target = m.getTargetElement();
      if (target)
        target.style.cursor = m.hasFeatureAtPixel(e.pixel, {
          layerFilter: (l) => l === points,
          hitTolerance: 5,
        })
          ? "pointer"
          : "";
    });
    const resize = new ResizeObserver(() => m.updateSize());
    resize.observe(el.current);
    return () => {
      active = false;
      resize.disconnect();
      m.setTarget(undefined);
      map.current = null;
    };
  }, []);
  useEffect(() => {
    source.current.clear();
    source.current.addFeatures(
      merchants
        .filter((m) => m.latitude !== null && m.longitude !== null)
        .map(
          (m) =>
            new Feature({
              geometry: new Point(fromLonLat([m.longitude!, m.latitude!])),
              merchantId: m.id,
              provider: m.provider,
            }),
        ),
    );
  }, [merchants]);
  useEffect(() => {
    if (selected?.latitude != null && selected.longitude != null)
      map.current?.getView().animate({
        center: fromLonLat([selected.longitude, selected.latitude]),
        zoom: 16,
        duration: 650,
      });
  }, [selected]);
  useEffect(() => {
    if (focus === "sample") {
      fit();
      return;
    }
    if (focus === "nyc")
      map.current
        ?.getView()
        .fit(
          transformExtent(
            [-74.2591, 40.4774, -73.7004, 40.9176],
            "EPSG:4326",
            "EPSG:3857",
          ),
          { padding: [30, 30, 30, 30], duration: 700 },
        );
    else
      map.current?.getView().animate({
        center: fromLonLat([-73.9537, 40.7619]),
        zoom: 14.45,
        duration: 700,
      });
  }, [focus]);
  function fit() {
    const extent = source.current.getExtent();
    if (extent && source.current.getFeatures().length)
      map.current
        ?.getView()
        .fit(extent, { padding: [65, 65, 95, 65], maxZoom: 16, duration: 650 });
  }
  return (
    <div className="map-shell">
      <div
        className="map-canvas openlayers-map"
        ref={el}
        aria-label="Interactive NYC merchant map"
      />
      {failed && (
        <div className="map-error">
          The basemap could not load. Check your connection; merchant
          coordinates and records remain available.
        </div>
      )}
      <div className="map-top">
        <div className="map-location">
          <span className="green-dot" />
          NEW YORK CITY <span>/</span>
          {focus === "nyc"
            ? "ALL BOROUGHS"
            : focus === "sample"
              ? "RESEARCH SAMPLE"
              : "ROOSEVELT ISLAND"}
        </div>
      </div>
      <div className="map-bottom">
        <button onClick={fit}>
          <Maximize2 size={14} />
          Fit to results
        </button>
        <button
          title="Center Roosevelt Island"
          onClick={() =>
            map.current?.getView().animate({
              center: fromLonLat([-73.9505, 40.7625]),
              zoom: 15,
              duration: 600,
            })
          }
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
