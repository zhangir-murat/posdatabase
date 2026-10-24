import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import {
  Map,
  Table2,
  ChartNoAxesCombined,
  Layers,
  BookOpen,
  ArrowUpRight,
  Plus,
  Search,
  SlidersHorizontal,
  Download,
  ChevronDown,
  MapPin,
  CheckCheck,
  PanelsTopLeft,
  ArrowRight,
  RefreshCw,
  LogOut,
  LockKeyhole,
  X,
  Compass,
  Database,
  GitBranch,
  Camera,
  FileUp,
  Smartphone,
  Grid3X3,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import AtlasMap from "./components/AtlasMap";
import ProviderBreakdown from "./components/ProviderBreakdown";
const Dashboard = lazy(() => import("./components/Dashboard"));
import MerchantTable from "./components/MerchantTable";
import MerchantForm from "./components/MerchantForm";
import AuthModal from "./components/AuthModal";
import MerchantDetail from "./components/MerchantDetail";
import { demoMerchants } from "./data/demo";
import { rooseveltIslandMerchants } from "./data/rooseveltIsland";
import { useFilters } from "./state/useFilters";
import {
  boroughs,
  providers,
  categories,
  emptyFilters,
  type Merchant,
  type Filters,
} from "./lib/types";
import { distribution, exportCsv } from "./lib/research";
import {
  fetchMerchants,
  saveMerchant,
  importRooseveltIsland,
} from "./lib/data";
import { supabase } from "./lib/supabase";
const nav = [
  { id: "atlas", name: "Merchant atlas", icon: Map },
  { id: "database", name: "Merchant database", icon: Table2 },
  { id: "analytics", name: "Research analytics", icon: ChartNoAxesCombined },
];
export default function App() {
  const [view, setView] = useState("atlas");
  const [dataset, setDataset] = useState<"field" | "demo" | "research">(
    "field",
  );
  const [session, setSession] = useState<Session | null>(null);
  const [research, setResearch] = useState<Merchant[]>([]);
  const [auth, setAuth] = useState(false);
  const [form, setForm] = useState(false);
  const [pendingImport, setPendingImport] = useState(false);
  const [editing, setEditing] = useState<Merchant | undefined>();
  const [selected, setSelected] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [focus, setFocus] = useState("island");
  const [mapVisible, setMapVisible] = useState(true);
  const data =
    dataset === "demo"
      ? demoMerchants
      : dataset === "field"
        ? rooseveltIslandMerchants
        : research;
  const { filters, filtered, setFilter, reset, active } = useFilters(data);
  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setSession(data.session));
    const sub = supabase?.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) setDataset("research");
      else setResearch([]);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setResearch(await fetchMerchants());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (session) {
      if (pendingImport) {
        setPendingImport(false);
        void importFieldReports();
      } else void load();
    }
  }, [session?.user.id]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAuth(false);
        setForm(false);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    setSelected(null);
  }, [dataset]);
  useEffect(() => {
    if (selected && !filtered.some((m) => m.id === selected.id))
      setSelected(null);
  }, [filtered, selected?.id]);
  const verified = filtered.filter(
    (m) => m.verification_status === "Verified",
  ).length;
  const neighborhoods = new Set(
    filtered.map((m) => m.neighborhood).filter(Boolean),
  ).size;
  const known = new Set(
    filtered.map((m) => m.provider).filter((x) => x !== "Unknown"),
  ).size;
  const mapped = filtered.filter((m) => m.latitude !== null).length;
  const providerDist = useMemo(
    () => distribution(filtered, "provider"),
    [filtered],
  );
  function add() {
    if (!session) {
      setAuth(true);
      return;
    }
    setDataset("research");
    setEditing(undefined);
    setForm(true);
  }
  function changeDataset(s: "field" | "demo" | "research") {
    setDataset(s);
    reset();
    setSelected(null);
  }
  async function save(m: Merchant, isNew: boolean) {
    const id = await saveMerchant(m, isNew);
    const rows = await fetchMerchants();
    setResearch(rows);
    setDataset("research");
    setSelected(rows.find((x) => x.id === id) || null);
    setToast("Observation saved to your research database.");
  }
  async function importFieldReports() {
    if (!session) {
      setPendingImport(true);
      setAuth(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const count = await importRooseveltIsland();
      setResearch(await fetchMerchants());
      setDataset("research");
      reset();
      setToast(
        count
          ? `${count} Roosevelt Island observations saved.`
          : "These merchants already exist in your database; existing records were preserved.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const selectFilter = (key: keyof Filters, label: string, opts: string[]) => (
    <label className={`filter-select ${filters[key] ? "has-value" : ""}`}>
      <select
        aria-label={label}
        value={filters[key]}
        onChange={(e) => {
          setFilter(key, e.target.value);
          setSelected(null);
        }}
      >
        <option value="">{label}</option>
        {opts.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <ChevronDown size={13} />
    </label>
  );
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("atlas");
          }}
          aria-label="NYC POS Atlas home"
        >
          <div className="brand-icon">
            <span />
            <span />
            <span />
          </div>
          <div>
            OrangeTower<span>ANALYTICS</span>
          </div>
        </a>
        <div className="workspace-label">RESEARCH WORKSPACE</div>
        <div className="workspace-name">
          <span className="workspace-icon">
            <Compass size={18} />
          </span>
          <div>
            NYC POS Atlas<span>Independent field research</span>
          </div>
          <span className="version">V1</span>
        </div>
        <div className="nav-caption">EXPLORE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "active" : ""}
              onClick={() => {
                setView(n.id);
                setSelected(null);
              }}
            >
              <n.icon size={18} />
              {n.name}
              {view === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-caption second-caption">RESEARCH TOOLS</div>
        <nav>
          <button
            className={view === "methodology" ? "active" : ""}
            onClick={() => setView("methodology")}
          >
            <BookOpen size={18} />
            Methodology
          </button>
          <button
            className={view === "infrastructure" ? "active" : ""}
            onClick={() => setView("infrastructure")}
          >
            <Layers size={18} />
            Project roadmap<span className="mini-badge">02</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="field-card">
            <span className="field-graphic">
              <MapPin size={18} />
              <span />
              <span />
              <span />
            </span>
            <span className="eyebrow">THE FIRST CHAPTER</span>
            <h4>Roosevelt Island</h4>
            <p>
              One neighborhood.
              <br />A city of possibilities.
            </p>
            <button
              onClick={() => {
                setView("atlas");
                setFilter("neighborhood", "Roosevelt Island");
                setFocus("island");
                setSelected(null);
              }}
            >
              Explore the island
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="user-button"
            onClick={() =>
              session ? void supabase?.auth.signOut() : setAuth(true)
            }
          >
            <span className="user-avatar">{session ? "R" : "OT"}</span>
            <span>
              {session ? "Researcher account" : "OrangeTower Analytics"}
              <small>
                {session ? "Sign out" : "Private research workspace"}
              </small>
            </span>
            {session ? <LogOut size={15} /> : <LockKeyhole size={14} />}
          </button>
          <span className="sidebar-copyright">NEW YORK CITY · EST. 2026</span>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <b>NYC POS Atlas</b>
            <span className="edition">FIELD NOTES → CITY INSIGHTS</span>
          </div>
          <div className="topbar-actions">
            <span className={`connection ${session ? "connected" : ""}`}>
              <i />
              {session
                ? "Research database connected"
                : dataset === "field"
                  ? "Roosevelt Island field reports"
                  : "Illustrative dataset"}
            </span>
            <button
              className="icon-button"
              onClick={() => setView("methodology")}
              aria-label="About this research"
            >
              <BookOpen size={17} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow orange">ORANGETOWER RESEARCH / NYC</div>
              <h1>
                {view === "atlas"
                  ? "The city, one checkout at a time."
                  : view === "database"
                    ? "A field notebook for the city."
                    : view === "analytics"
                      ? "Patterns behind the counter."
                      : view === "methodology"
                        ? "Good research starts on the ground."
                        : "Built for the next block."}
              </h1>
              <p>
                {view === "atlas"
                  ? "Mapping the payment systems powering New York’s neighborhood businesses."
                  : view === "database"
                    ? "Structured merchant records, direct observations, and a growing body of evidence."
                    : view === "analytics"
                      ? "Explore POS adoption across your observed merchants and neighborhoods."
                      : view === "methodology"
                        ? "A transparent framework for collecting and interpreting merchant POS observations."
                        : "Phase 1 is operational. The foundations for the next phase are already in place."}
              </p>
            </div>
            {["atlas", "database", "analytics"].includes(view) && (
              <button className="primary add-button" onClick={add}>
                <Plus size={17} />
                Add merchant
              </button>
            )}
          </div>
          {["atlas", "database", "analytics"].includes(view) ? (
            <>
              <div className="dataset-bar">
                <div className="dataset-switch">
                  <button
                    className={dataset === "field" ? "active" : ""}
                    onClick={() => changeDataset("field")}
                  >
                    Roosevelt Island<span>2</span>
                  </button>
                  <button
                    className={dataset === "demo" ? "active" : ""}
                    onClick={() => changeDataset("demo")}
                  >
                    Illustrative dataset
                  </button>
                  <button
                    className={dataset === "research" ? "active" : ""}
                    onClick={() => changeDataset("research")}
                  >
                    My research<span>{research.length}</span>
                  </button>
                </div>
                <span>
                  {dataset === "demo" ? (
                    <>
                      Synthetic examples for exploring the workspace.{" "}
                      <b>Not field observations.</b>
                    </>
                  ) : dataset === "field" ? (
                    <>
                      Two real researcher reports. Dates unknown; map locations
                      approximate.{" "}
                      <button
                        className="inline-link"
                        disabled={loading}
                        onClick={importFieldReports}
                      >
                        {session
                          ? "Save to my database"
                          : "Sign in to save to my database"}
                        <ArrowUpRight size={12} />
                      </button>
                    </>
                  ) : session ? (
                    <>Your private, saved merchant observations.</>
                  ) : (
                    <>
                      Sign in to collect and access your private research.{" "}
                      <button
                        className="inline-link"
                        onClick={() => setAuth(true)}
                      >
                        Sign in <ArrowUpRight size={12} />
                      </button>
                    </>
                  )}
                </span>
              </div>
              <div className="stats">
                <div className="stat">
                  <div className="stat-top">
                    Merchant locations
                    <MapPin size={16} />
                  </div>
                  <div className="stat-value">
                    {filtered.length}
                    <span className="stat-tag">
                      {dataset === "demo" ? "EXAMPLES" : "RECORDS"}
                    </span>
                  </div>
                  <p>
                    {mapped} mapped <span>·</span> {filtered.length - mapped}{" "}
                    awaiting coordinates
                  </p>
                </div>
                <div className="stat">
                  <div className="stat-top">
                    POS providers
                    <PanelsTopLeft size={16} />
                  </div>
                  <div className="stat-value">
                    {known}
                    <span className="stat-small">identified</span>
                  </div>
                  <p>
                    {filtered.filter((m) => m.provider === "Unknown").length}{" "}
                    unknown <span>·</span> retained in analysis
                  </p>
                </div>
                <div className="stat">
                  <div className="stat-top">
                    Verified observations
                    <CheckCheck size={17} />
                  </div>
                  <div className="stat-value">
                    {verified}
                    <span className="stat-small">/ {filtered.length}</span>
                    <span className="percent-tag">
                      {filtered.length
                        ? Math.round((verified / filtered.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <p>Directly identified software provider</p>
                </div>
                <div className="stat">
                  <div className="stat-top">
                    Neighborhood coverage
                    <Layers size={16} />
                  </div>
                  <div className="stat-value">
                    {neighborhoods}
                    <span className="stat-small">neighborhoods</span>
                  </div>
                  <p>
                    {new Set(filtered.map((m) => m.borough)).size} boroughs{" "}
                    <span>·</span> a growing research footprint
                  </p>
                </div>
              </div>
              <div className="filterbar">
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Search merchants"
                    value={filters.search}
                    onChange={(e) => {
                      setFilter("search", e.target.value);
                      setSelected(null);
                    }}
                    placeholder="Search merchants, streets, ZIP…"
                  />
                  {filters.search && (
                    <button
                      title="Clear search"
                      onClick={() => setFilter("search", "")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
                <div className="filter-divider" />
                {selectFilter("borough", "All boroughs", boroughs)}
                {selectFilter("category", "All categories", categories)}
                {selectFilter("provider", "All POS providers", providers)}
                <button
                  className={`filter-more ${advanced ? "active" : ""}`}
                  onClick={() => setAdvanced(!advanced)}
                >
                  <SlidersHorizontal size={15} />
                  <span>Filters</span>
                  {active > 0 && <b>{active}</b>}
                </button>
                <button className="export" onClick={() => exportCsv(filtered)}>
                  <Download size={15} />
                  <span>Export CSV</span>
                </button>
              </div>
              {advanced && (
                <div className="advanced-filters">
                  {selectFilter(
                    "neighborhood",
                    "All neighborhoods",
                    [
                      ...new Set(
                        data.map((m) => m.neighborhood).filter(Boolean),
                      ),
                    ].sort(),
                  )}
                  {selectFilter("status", "All verification statuses", [
                    "Verified",
                    "Inferred",
                    "Unverified",
                  ])}
                  <label>
                    From
                    <input
                      aria-label="Observed from"
                      type="date"
                      value={filters.from}
                      onChange={(e) => setFilter("from", e.target.value)}
                    />
                  </label>
                  <label>
                    To
                    <input
                      aria-label="Observed to"
                      type="date"
                      value={filters.to}
                      onChange={(e) => setFilter("to", e.target.value)}
                    />
                  </label>
                  <button className="text-button" onClick={reset}>
                    Reset all
                  </button>
                  {filters.from && filters.to && filters.from > filters.to && (
                    <span className="orange small">
                      Start date is after end date.
                    </span>
                  )}
                </div>
              )}
              <div className="results-heading">
                <div>
                  <span className="green-dot" />
                  <b>
                    {view === "atlas"
                      ? "Merchant atlas"
                      : view === "database"
                        ? "Merchant records"
                        : "Research overview"}
                  </b>
                  <span className="muted">
                    {filtered.length} of {data.length} locations
                  </span>
                  {active > 0 && (
                    <button
                      className="clear-filters"
                      onClick={() => {
                        reset();
                        setSelected(null);
                      }}
                    >
                      Clear filters <X size={11} />
                    </button>
                  )}
                </div>
                <div>
                  {dataset === "research" && session && (
                    <button
                      className="subtle-button"
                      onClick={load}
                      title="Refresh records"
                    >
                      <RefreshCw size={13} className={loading ? "spin" : ""} />
                    </button>
                  )}
                  {view === "atlas" && (
                    <>
                      <div className="segmented">
                        <button
                          className={focus === "island" ? "active" : ""}
                          onClick={() => setFocus("island")}
                        >
                          Roosevelt Island
                        </button>
                        <button
                          className={focus === "nyc" ? "active" : ""}
                          onClick={() => setFocus("nyc")}
                        >
                          NYC
                        </button>
                      </div>
                      <button
                        className="subtle-button"
                        aria-label={
                          mapVisible ? "Switch to table" : "Switch to map"
                        }
                        onClick={() => setMapVisible(!mapVisible)}
                      >
                        {mapVisible ? <Table2 size={15} /> : <Map size={15} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {error && (
                <div role="alert" className="error-box">
                  Research operation failed: {error}{" "}
                  <button className="inline-link" onClick={load}>
                    Retry
                  </button>
                </div>
              )}
              {loading && dataset === "research" && (
                <p className="info-box">Loading your research records…</p>
              )}
              {dataset === "research" && !session ? (
                <div className="research-empty">
                  <div className="empty-icon">
                    <LockKeyhole size={27} />
                  </div>
                  <span className="eyebrow">YOUR PRIVATE FIELD NOTEBOOK</span>
                  <h2>Start with the next merchant.</h2>
                  <p>
                    Sign in to add real observations, build your research
                    database,
                    <br />
                    and see your findings on the map.
                  </p>
                  <button className="primary" onClick={() => setAuth(true)}>
                    Open research workspace
                    <ArrowRight size={16} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => changeDataset("demo")}
                  >
                    Explore the illustrative dataset
                  </button>
                </div>
              ) : view === "atlas" ? (
                <>
                  {mapVisible ? (
                    <div className="atlas-layout">
                      <AtlasMap
                        merchants={filtered}
                        onSelect={setSelected}
                        selected={selected}
                        focus={focus}
                      />
                      <aside className="map-side">
                        {selected ? (
                          <MerchantDetail
                            merchant={selected}
                            onClose={() => setSelected(null)}
                            onEdit={() => {
                              setEditing(selected);
                              setForm(true);
                            }}
                          />
                        ) : (
                          <>
                            <ProviderBreakdown
                              merchants={filtered}
                              compact
                              onProvider={(s) => setFilter("provider", s)}
                            />
                            <div className="selection-list">
                              <div className="panel-title">
                                <h3>Selected merchants</h3>
                                <span className="tiny">{filtered.length}</span>
                              </div>
                              {filtered.slice(0, 5).map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => setSelected(m)}
                                >
                                  <span className="list-pin">
                                    <MapPin size={14} />
                                  </span>
                                  <span>
                                    <b>{m.business_name}</b>
                                    <small>
                                      {m.category} · {m.provider}
                                    </small>
                                  </span>
                                  <ArrowUpRight size={13} />
                                </button>
                              ))}
                              {!filtered.length && (
                                <p className="muted small">
                                  No matching merchants.
                                </p>
                              )}
                              <button
                                className="view-records"
                                onClick={() => setView("database")}
                              >
                                View all records
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          </>
                        )}
                      </aside>
                    </div>
                  ) : (
                    <MerchantTable
                      merchants={filtered}
                      onSelect={setSelected}
                    />
                  )}
                  <div className="below-map">
                    <span>
                      <span className="green-dot" />{" "}
                      {dataset === "demo"
                        ? "ILLUSTRATIVE RESEARCH ENVIRONMENT"
                        : dataset === "field"
                          ? "RESEARCHER-REPORTED FIELD OBSERVATIONS"
                          : "PRIVATE RESEARCH WORKSPACE"}
                    </span>
                    <span>
                      Coordinates in WGS 84 · Address points are approximate
                    </span>
                  </div>
                  <div className="insight-strip">
                    <div className="insight-symbol">
                      <ChartNoAxesCombined size={23} />
                    </div>
                    <div>
                      <span className="eyebrow">
                        FROM OBSERVATIONS TO INSIGHTS
                      </span>
                      <p>
                        {providerDist[0] ? (
                          <>
                            <b>{providerDist[0].name}</b> appears in{" "}
                            {providerDist[0].value} of {filtered.length}{" "}
                            selected locations.
                          </>
                        ) : (
                          "Your first observation is the start of a bigger picture."
                        )}{" "}
                        <span>
                          Explore how the sample varies by category and
                          neighborhood.
                        </span>
                      </p>
                    </div>
                    <button onClick={() => setView("analytics")}>
                      Explore analytics
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                </>
              ) : view === "database" ? (
                <MerchantTable merchants={filtered} onSelect={setSelected} />
              ) : (
                <Suspense
                  fallback={
                    <p className="info-box">Loading research charts…</p>
                  }
                >
                  <Dashboard merchants={filtered} />
                </Suspense>
              )}
            </>
          ) : view === "methodology" ? (
            <Methodology />
          ) : (
            <Roadmap />
          )}
          <footer className="page-footer">
            <span>
              NYC POS ATLAS <span>/</span> ORANGETOWER ANALYTICS LLC
            </span>
            <span>Independent research. Grounded in observation.</span>
          </footer>
        </main>
      </div>
      {selected &&
        (view === "database" || (view === "atlas" && !mapVisible)) && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <div
              className="detail-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Merchant details"
              onClick={(e) => e.stopPropagation()}
            >
              <MerchantDetail
                merchant={selected}
                onClose={() => setSelected(null)}
                onEdit={() => {
                  setEditing(selected);
                  setForm(true);
                }}
              />
            </div>
          </div>
        )}
      {auth && <AuthModal onClose={() => setAuth(false)} />}{" "}
      {form && (
        <MerchantForm
          merchant={editing}
          onClose={() => setForm(false)}
          onSave={save}
        />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Methodology() {
  return (
    <div className="methodology">
      <div className="method-intro">
        <span className="eyebrow orange">RESEARCH FRAMEWORK / 01</span>
        <h2>
          A merchant location.
          <br />A dated observation.
          <br />
          An explicit level of certainty.
        </h2>
        <p>
          This atlas studies the POS software used by physical merchants in New
          York City. The initial fieldwork starts on Roosevelt Island and can
          expand block by block across all five boroughs.
        </p>
        <div className="method-callout">
          <MapPin />
          <span>
            Each business location is a separate merchant record. Multiple
            locations of the same business count separately.
          </span>
        </div>
      </div>
      <div className="method-cards">
        {[
          [
            "01",
            "Separate software from hardware",
            "A Clover or Verifone terminal does not, on its own, establish the software running the checkout. Record hardware separately; leave software unknown when evidence is insufficient.",
          ],
          [
            "02",
            "Make confidence visible",
            "Verified: directly identified via a visible software interface, explicit staff confirmation, or other direct evidence. Inferred: indirect clues. Unverified: unresolved or unknown. Use notes to explain the basis.",
          ],
          [
            "03",
            "Keep a time dimension",
            "A new dated observation is appended to the merchant’s history. The latest observation date is used in charts and on the map. Ties use creation time, then observation ID.",
          ],
          [
            "04",
            "Interpret sample shares carefully",
            "The database is a non-random convenience sample. Provider shares describe observed merchant locations only. They are not NYC market share, payment volume, or revenue estimates.",
          ],
          [
            "05",
            "Preserve uncertainty and missingness",
            "Unknown software providers remain in the denominator. Unmapped merchants remain in the database and analytics. Coordinate validation uses a NYC bounding envelope, not an exact land or borough boundary test.",
          ],
          [
            "06",
            "Handle sources responsibly",
            "Record the date and evidence method. Avoid personal information in notes. Photographs, import workflows, grid metrics, and mobile collection are reserved for a later phase.",
          ],
        ].map(([n, t, p]) => (
          <section key={n}>
            <span>{n}</span>
            <div>
              <h3>{t}</h3>
              <p>{p}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="method-source">
        <h3>Map data & attribution</h3>
        <p>
          MapLibre GL JS renders OpenFreeMap vector basemaps. An OpenLayers
          canvas renderer uses the same geographic data when WebGL is
          unavailable. OpenFreeMap’s public service requires no API key and
          advertises no request or map-view quota; availability is best effort.
          Attribution to OpenFreeMap, OpenMapTiles, and OpenStreetMap stays
          visible on the map. This application loads the current interactive
          view and provides no offline tile downloads.
        </p>
        <a
          href="https://openfreemap.org/quick_start/"
          target="_blank"
          rel="noreferrer"
        >
          OpenFreeMap usage & attribution
          <ArrowUpRight size={13} />
        </a>
      </div>
    </div>
  );
}
function Roadmap() {
  return (
    <div className="roadmap">
      <div className="roadmap-intro">
        <span className="badge verified">Phase 1 · operational</span>
        <h2>
          A research tool that can grow
          <br />
          with the fieldwork.
        </h2>
        <p>
          The application’s first phase focuses on a reliable data foundation,
          an accurate geographic atlas, and exploratory analysis.
        </p>
      </div>
      <div className="roadmap-cards">
        {[
          [
            Database,
            "Structured merchant database",
            "Relational merchant locations, normalized providers, append-only POS observations, private account ownership, validation, and duplicate protection.",
          ],
          [
            Map,
            "Interactive geographic atlas",
            "MapLibre with WGS 84 merchant points, clustering, provider colors, record inspection, and shared filters.",
          ],
          [
            ChartNoAxesCombined,
            "Research analytics",
            "Sample shares, provider distribution, verification coverage, category composition, and geographic coverage.",
          ],
        ].map(([Icon, title, desc], i) => {
          const I = Icon as typeof Database;
          return (
            <section key={i}>
              <span className="operational">OPERATIONAL</span>
              <I size={25} />
              <h3>{String(title)}</h3>
              <p>{String(desc)}</p>
            </section>
          );
        })}
      </div>
      <div className="phase2-heading">
        <span className="eyebrow orange">PHASE 2 / FOUNDATION ONLY</span>
        <h2>Ready in the architecture. Reserved for later.</h2>
      </div>
      <div className="future-grid">
        {[
          [
            Grid3X3,
            "Grid concentration analysis",
            "PostGIS polygon cells, spatial indexes, configurable 50–5,000 m cell sizes, and meter-based EPSG:26918 projection. Grid generation, coverage denominators, and concentration metrics are not implemented.",
          ],
          [
            Smartphone,
            "Mobile field collection",
            "Reusable merchant form and validated data layer. Offline synchronization, geolocation capture, and a dedicated mobile collection workflow remain future work.",
          ],
          [
            Camera,
            "Photograph evidence",
            "An observation-linked photo metadata table with object paths and captions. Storage bucket, upload permissions, and photo upload UI are not implemented.",
          ],
          [
            FileUp,
            "CSV import pipeline",
            "Import batch and raw row staging tables with validation errors and row identity. Mapping, deduplication review, and batch ingestion remain future work.",
          ],
        ].map(([Icon, t, d], i) => {
          const I = Icon as typeof Database;
          return (
            <section key={i}>
              <I size={22} />
              <div>
                <h3>{String(t)}</h3>
                <p>{String(d)}</p>
                <span className="tiny">
                  SCHEMA PREPARED · WORKFLOW NOT YET BUILT
                </span>
              </div>
            </section>
          );
        })}
      </div>
      <div className="research-note">
        <GitBranch size={22} />
        <span>
          Standalone React + TypeScript application. Supabase PostgreSQL with
          PostGIS and row-level security. No connection to the OrangeTower
          Analytics website.
        </span>
      </div>
    </div>
  );
}
