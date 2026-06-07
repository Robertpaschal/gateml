"use client";
import { useState } from "react";
import { systemApi } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

export default function SystemPage() {
  const [operational, setOperational] = useState(true);
  const [message,     setMessage]     = useState("");
  const [affected,    setAffected]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [result,      setResult]      = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) return;
    setSaving(true);
    setResult("");
    try {
      const affectedServices = affected
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      await systemApi.setStatus(token, operational, message, affectedServices);
      setResult("Status updated.");
    } catch (err: unknown) {
      setResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="page-header">
        <h1 className="page-title">System Status</h1>
      </div>

      <div className="card">
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>
              Operational State
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              {[true, false].map(v => (
                <label key={String(v)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                  <input
                    type="radio" name="op" checked={operational === v}
                    onChange={() => setOperational(v)}
                    style={{ width: "auto", accentColor: "var(--accent)" }}
                  />
                  <span style={{ color: v ? "var(--green)" : "var(--red)" }}>
                    {v ? "✓ Operational" : "✗ Degraded / Incident"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Status Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="All systems operational. / Investigating elevated latency on the gateway."
              required
              style={{ resize: "vertical" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Affected Services <span style={{ textTransform: "none", opacity: 0.6 }}>(comma-separated, optional)</span>
            </label>
            <input
              value={affected}
              onChange={e => setAffected(e.target.value)}
              placeholder="gateway, observability"
            />
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Updating…" : "Publish Status"}
            </button>
            {result && (
              <span style={{ fontSize: 11, color: result === "Status updated." ? "var(--green)" : "var(--red)" }}>
                {result}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16, fontSize: 11, color: "var(--muted)" }}>
        <strong style={{ color: "var(--text)" }}>Note:</strong> Status writes to Firestore (<code style={{ color: "var(--accent-h)" }}>meta/systemStatus</code>)
        and is visible in the consumer dashboard sidebar within seconds.
      </div>
    </div>
  );
}
