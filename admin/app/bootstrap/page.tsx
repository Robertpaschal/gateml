"use client";
import { useState } from "react";

async function apiFetch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/admin/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({})) as T & { message?: string };
  if (!res.ok) throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`);
  return data;
}

export default function BootstrapPage() {
  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setDone(""); setLoading(true);
    try {
      const res = await apiFetch<{ message: string }>("/bootstrap", { email, name });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        width: 400, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: 32,
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            GateML Admin — First Time Setup
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Create the first Super Admin account. This page is only available when no admins exist.
          </div>
        </div>

        {done ? (
          <div style={{ padding: "14px 16px", borderRadius: "var(--radius)", background: "rgba(74,222,128,.08)", border: "1px solid rgba(74,222,128,.2)", color: "var(--green)", fontSize: 13 }}>
            {done}
            <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
              Check your email inbox to set your password and complete setup.
            </div>
            <div style={{ marginTop: 12 }}>
              <a href="/login" style={{ color: "var(--accent)", fontSize: 12 }}>Go to login</a>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div style={{ padding: "10px 12px", marginBottom: 14, borderRadius: "var(--radius)", background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.3)", color: "var(--red)", fontSize: 12 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Company Email
                </label>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required autoFocus
                />
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                  Must be a verified company domain with MX records.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name" required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? "Sending invite…" : "Send Setup Invite"}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <a href="/login" style={{ fontSize: 11, color: "var(--muted)" }}>
                Already have an account? Sign in
              </a>
            </div>
          </>
        )}

        <div style={{ marginTop: 20, padding: "10px 12px", background: "var(--surface2)", borderRadius: "var(--radius)", fontSize: 10, color: "var(--muted2)" }}>
          After submitting, check your email. You will receive a link to set your password. You will have full Super Admin access.
        </div>
      </div>
    </div>
  );
}
