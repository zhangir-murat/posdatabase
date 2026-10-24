import { useEffect, useState } from "react";
import { X, MapPin, ArrowUpRight, ClipboardPen, History } from "lucide-react";
import { colors, type Merchant } from "../lib/types";
import { supabase } from "../lib/supabase";
type Observation = {
  id: string;
  provider: string;
  hardware: string;
  verification_status: string;
  observation_date: string;
  notes: string;
  evidence_method: string;
};
export default function MerchantDetail({
  merchant: m,
  onClose,
  onEdit,
}: {
  merchant: Merchant;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [history, setHistory] = useState<Observation[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (m.is_demo) {
      setHistory([{ ...m, id: m.id }]);
      return;
    }
    let active = true;
    supabase
      ?.from("pos_observations")
      .select("*")
      .eq("merchant_id", m.id)
      .order("observation_date", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (active) {
          setHistory(data || []);
          if (error) setError(error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [m.id]);
  return (
    <div className="detail">
      <header>
        <span className="eyebrow">MERCHANT RECORD</span>
        <button
          className="icon-button"
          aria-label="Close merchant details"
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </header>
      <div className="merchant-avatar">
        <MapPin size={24} />
      </div>
      <h2>{m.business_name}</h2>
      <p className="muted">
        {m.street_address}
        <br />
        {m.neighborhood} · {m.borough}, NY {m.zip_code}
      </p>
      <span className={`badge ${m.verification_status.toLowerCase()}`}>
        {m.verification_status}
      </span>
      {m.is_demo && (
        <p className="demo-note">
          Illustrative record · not a real business observation
        </p>
      )}
      <div className="detail-pos">
        <span className="eyebrow">POS SOFTWARE</span>
        <h2>
          <i style={{ background: colors[m.provider] }} />
          {m.provider}
        </h2>
        <span className="muted small">Terminal hardware: {m.hardware}</span>
      </div>
      <dl>
        <dt>Category</dt>
        <dd>{m.category}</dd>
        <dt>Last observed</dt>
        <dd>{m.observation_date}</dd>
        <dt>Evidence</dt>
        <dd>{m.evidence_method}</dd>
        <dt>Coordinates</dt>
        <dd>
          {m.latitude?.toFixed(5) ?? "Unmapped"},{" "}
          {m.longitude?.toFixed(5) ?? "—"}
        </dd>
      </dl>
      <h4>Research notes</h4>
      <p className="notes">{m.notes || "No notes recorded."}</p>
      {m.latitude !== null && (
        <a
          className="map-link"
          href={`https://www.openstreetmap.org/?mlat=${m.latitude}&mlon=${m.longitude}#map=18/${m.latitude}/${m.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Open location in OpenStreetMap
          <ArrowUpRight size={14} />
        </a>
      )}
      <div className="history">
        <h4>
          <History size={15} />
          Observation history{" "}
          <span className="count-pill">{history.length}</span>
        </h4>
        {error && <p className="error-box">{error}</p>}
        {history.map((o) => (
          <div key={o.id}>
            <span className="mono tiny">{o.observation_date}</span>
            <strong>
              {o.provider}{" "}
              <span className="muted small">· {o.verification_status}</span>
            </strong>
            <p>
              {o.evidence_method} · {o.hardware}
            </p>
            {o.notes && <p className="notes">{o.notes}</p>}
          </div>
        ))}
      </div>
      {!m.is_demo && (
        <button className="primary full" onClick={onEdit}>
          <ClipboardPen size={16} />
          Update & add observation
        </button>
      )}
      <p className="record-id">ID {m.id}</p>
    </div>
  );
}
