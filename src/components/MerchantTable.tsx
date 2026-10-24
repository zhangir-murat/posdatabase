import { useState, useEffect } from "react";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { colors, type Merchant } from "../lib/types";
export default function MerchantTable({
  merchants,
  onSelect,
}: {
  merchants: Merchant[];
  onSelect: (m: Merchant) => void;
}) {
  const [sort, setSort] = useState<keyof Merchant>("business_name");
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [merchants]);
  const rows = [...merchants].sort(
    (a, b) =>
      String(a[sort] ?? "").localeCompare(String(b[sort] ?? "")) *
      (asc ? 1 : -1),
  );
  const totalPages = Math.ceil(rows.length / 10);
  const toggle = (k: keyof Merchant) => {
    setAsc(sort === k ? !asc : true);
    setSort(k);
  };
  return (
    <section className="table-panel">
      <div className="table-heading">
        <div>
          <h3>
            Merchant database <span className="count-pill">{rows.length}</span>
          </h3>
          <p className="muted small">
            One location per row. Select a merchant to inspect its record.
          </p>
        </div>
        <span className="tiny">LATEST OBSERVATION</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {[
                ["Business / location", "business_name"],
                ["Category", "category"],
                ["POS provider", "provider"],
                ["Hardware / platform", "hardware"],
                ["Verification", "verification_status"],
                ["Observed", "observation_date"],
              ].map(([t, k]) => (
                <th key={k}>
                  <button onClick={() => toggle(k as keyof Merchant)}>
                    {t}
                    <ArrowUpDown size={12} />
                  </button>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 10, page * 10 + 10).map((m) => (
              <tr
                key={m.id}
                onClick={() => onSelect(m)}
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect(m)}
                aria-label={`Open ${m.business_name}`}
              >
                <td>
                  <strong>{m.business_name}</strong>
                  <span>
                    {m.street_address} · {m.neighborhood || m.borough}
                  </span>
                </td>
                <td>{m.category}</td>
                <td>
                  <span className="provider-label">
                    <i style={{ background: colors[m.provider] }} />
                    {m.provider}
                  </span>
                </td>
                <td>
                  <strong>
                    {m.hardware !== "Unknown"
                      ? m.hardware
                      : m.payment_platform && m.payment_platform !== "Unknown"
                        ? m.payment_platform
                        : "Unknown"}
                  </strong>
                  {m.gateway && m.gateway !== "Unknown" && (
                    <span>Gateway: {m.gateway}</span>
                  )}
                </td>
                <td>
                  <span
                    className={`badge ${m.verification_status.toLowerCase()}`}
                  >
                    {m.verification_status === "Verified" ? "✓ " : ""}
                    {m.verification_status}
                  </span>
                </td>
                <td className="mono">{m.observation_date || "—"}</td>
                <td>
                  <ArrowUpRight size={15} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            <strong>No merchants found</strong>
            <p>Adjust the filters or add your first research observation.</p>
          </div>
        )}
      </div>
      <div className="table-footer">
        <span>
          {rows.length
            ? `${page * 10 + 1}–${Math.min((page + 1) * 10, rows.length)}`
            : "0"}{" "}
          of {rows.length} locations
        </span>
        <div>
          <button
            title="Previous page"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={15} />
          </button>
          <span>
            {rows.length ? page + 1 : 0} / {totalPages}
          </span>
          <button
            title="Next page"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
