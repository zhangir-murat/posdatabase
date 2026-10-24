import { distribution } from "../lib/research";
import type { Merchant } from "../lib/types";
export default function ProviderBreakdown({
  merchants,
  compact = false,
  onProvider,
}: {
  merchants: Merchant[];
  compact?: boolean;
  onProvider?: (s: string) => void;
}) {
  const dist = distribution(merchants, "provider");
  return (
    <section className={`provider-breakdown ${compact ? "compact" : ""}`}>
      <div className="panel-title">
        <h3>POS landscape</h3>
        <span className="tiny">{merchants.length} locations</span>
      </div>
      <p className="muted small">Share of the current selection</p>
      {dist.length ? (
        dist.map((d) => (
          <button
            className="provider-row"
            key={d.name}
            onClick={() => onProvider?.(d.name)}
            title={`Filter ${d.name}`}
          >
            <div>
              <span>
                <i style={{ background: d.color }} />
                {d.name}
              </span>
              <span>
                {d.value}{" "}
                <em>{Math.round((d.value / merchants.length) * 100)}%</em>
              </span>
            </div>
            <div className="bar-track">
              <i
                style={{
                  width: `${(d.value / merchants.length) * 100}%`,
                  background: d.color,
                }}
              />
            </div>
          </button>
        ))
      ) : (
        <p className="muted">No records match.</p>
      )}
      <p className="footnote">Observed sample share · not NYC market share</p>
    </section>
  );
}
