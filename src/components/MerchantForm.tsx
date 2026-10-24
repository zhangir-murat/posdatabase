import { useState } from "react";
import { X, MapPin, Save } from "lucide-react";
import { boroughs, categories, providers, type Merchant } from "../lib/types";
import { validateMerchant } from "../lib/research";
export default function MerchantForm({
  merchant,
  onClose,
  onSave,
}: {
  merchant?: Merchant;
  onClose: () => void;
  onSave: (m: Merchant, isNew: boolean) => Promise<void>;
}) {
  const [m, setM] = useState<Merchant>(
    merchant || {
      id: "",
      business_name: "",
      street_address: "",
      city: "New York",
      borough: "Manhattan",
      neighborhood: "Roosevelt Island",
      zip_code: "10044",
      latitude: null,
      longitude: null,
      category: "Café & bakery",
      provider: "Unknown",
      hardware: "Unknown",
      verification_status: "Unverified",
      observation_date: new Date().toLocaleDateString("en-CA", {
        timeZone: "America/New_York",
      }),
      notes: "",
      evidence_method: "Visual inspection",
    },
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (k: keyof Merchant, v: unknown) =>
    setM((x) => ({ ...x, [k]: v }));
  const input = (
    label: string,
    k: keyof Merchant,
    required = false,
    type = "text",
  ) => (
    <label>
      {label}
      {required && " *"}
      <input
        type={type}
        required={required}
        value={String(m[k] ?? "")}
        onChange={(e) => field(k, e.target.value)}
        maxLength={k === "business_name" ? 200 : 300}
      />
    </label>
  );
  const select = (label: string, k: keyof Merchant, opts: string[]) => (
    <label>
      {label}
      <select value={String(m[k])} onChange={(e) => field(k, e.target.value)}>
        {opts.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateMerchant(m);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSave(m, !merchant);
      onClose();
    } catch (e) {
      const x = e as { message?: string; code?: string };
      setError(
        x.code === "23505"
          ? "This merchant name and address already exist. Open that record to add an observation."
          : x.message ||
              "Could not save. Your form is still here; please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal form-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Merchant observation"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">FIELD RESEARCH</span>
            <h2>{merchant ? "Update merchant & observe" : "Add a merchant"}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="form-section">
            <h4>
              01 <span>Merchant location</span>
            </h4>
            <div className="form-grid">
              {input("Business name", "business_name", true)}
              {input("Street address", "street_address", true)}
              {select("Borough", "borough", boroughs)}
              {input("Neighborhood", "neighborhood")}
              {input("ZIP code", "zip_code", true)}
              {select("Merchant category", "category", categories)}
            </div>
            <p className="input-note">
              <MapPin size={13} /> Enter decimal coordinates from your field
              notes. Leave both blank if unmapped.
            </p>
            <div className="form-grid">
              {(["latitude", "longitude"] as const).map((k) => (
                <label key={k}>
                  {k === "latitude" ? "Latitude" : "Longitude"}
                  <input
                    type="number"
                    step="any"
                    value={m[k] ?? ""}
                    onChange={(e) =>
                      field(
                        k,
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                    placeholder={k === "latitude" ? "40.7625" : "-73.9501"}
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="form-section">
            <h4>
              02 <span>POS observation</span>
            </h4>
            <div className="form-grid">
              {select("POS software provider", "provider", providers)}
              {input("Terminal hardware brand", "hardware")}
              {select("Verification status", "verification_status", [
                "Verified",
                "Inferred",
                "Unverified",
              ])}
              {input("Observation date", "observation_date", true, "date")}
              {select("Evidence method", "evidence_method", [
                "Visual inspection",
                "Staff confirmation",
                "Receipt",
                "Public source",
                "Other",
              ])}
            </div>
            <label>
              Observation notes
              <textarea
                rows={3}
                maxLength={10000}
                value={m.notes}
                onChange={(e) => field("notes", e.target.value)}
                placeholder="What did you observe? Record supporting details and uncertainty."
              />
            </label>
            <p className="input-note">
              Verified = provider identified directly. Inferred = indirect
              evidence. Unverified = unknown or unresolved. Hardware alone does
              not establish the software provider.
            </p>
            {merchant && (
              <p className="info-box">
                Saving adds a dated observation. Earlier POS observations are
                preserved; the latest observation date determines the current
                POS.
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="error-box">
              {error}
            </p>
          )}
          <footer>
            <span>* Required fields</span>
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="primary" type="submit" disabled={busy}>
              <Save size={15} />
              {busy ? "Saving…" : "Save observation"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
