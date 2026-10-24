import { useState } from "react";
import { X, LockKeyhole, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) onClose();
      else
        setMessage(
          "Check your email to confirm your account, then return here and sign in. You can close the confirmation page after verification.",
        );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Researcher sign in"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div className="auth-icon">
            <LockKeyhole size={23} />
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>
        <span className="eyebrow">YOUR RESEARCH WORKSPACE</span>
        <h2>
          {mode === "signin" ? "Welcome back." : "Start your field notebook."}
        </h2>
        <p className="muted">
          Sign in to save and access your merchant records. Each researcher’s
          records are private to their account.
        </p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={8}
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && (
            <p role="status" className="info-box">
              {message}
            </p>
          )}
          <button className="primary" disabled={busy || !supabase}>
            {busy
              ? "Connecting…"
              : mode === "signin"
                ? "Sign in"
                : "Create researcher account"}
            <ArrowRight size={16} />
          </button>
        </form>
        <button
          className="text-button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage("");
          }}
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already registered? Sign in"}
        </button>
      </section>
    </div>
  );
}
