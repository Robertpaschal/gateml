"use client";
import { useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/gateml_token=([^;]+)/);
  return match?.[1] ?? localStorage.getItem("gateml_token");
}

const SUBJECTS = [
  "Billing & payments",
  "Account issue",
  "Gateway / API problem",
  "Feature request",
  "Bug report",
  "Other",
];

export function SupportPage() {
  const [subject,  setSubject]  = useState(SUBJECTS[0]);
  const [body,     setBody]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const token = getToken();
    if (!token) { setError("Session expired — please sign in again."); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/support/contact`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? `HTTP ${res.status}`);
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: "rgba(0,255,136,0.12)", border: "1px solid rgba(0,255,136,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent)", fontSize: 16,
          }}>
            ✓
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              Message received
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
              We've logged your message and will reply to your account email within 1–2 business days.
              A confirmation has been sent to your inbox.
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 14 }}
              onClick={() => { setSent(false); setBody(""); setSubject(SUBJECTS[0]); }}
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <form onSubmit={submit}>
          {error && (
            <div style={{
              padding: "9px 12px", marginBottom: 14, borderRadius: 4,
              background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)",
              color: "var(--danger)", fontSize: 11,
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Subject</label>
            <select className="field" value={subject} onChange={e => setSubject(e.target.value)}>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label className="form-label">
              Message
              <span style={{
                fontWeight: 400, textTransform: "none", letterSpacing: 0,
                color: "var(--muted2)", marginLeft: 6,
              }}>
                — include any relevant API key prefixes or error messages
              </span>
            </label>
            <textarea
              className="code-input"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              placeholder={"Describe your issue…\n\nKey prefix: gml-sk-live_abc123\nError: 429 from OpenAI fallback\nTime: 2026-06-07 14:30 UTC"}
              required
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={sending || !body.trim()}>
              {sending ? "Sending…" : "Send message"}
            </button>
            <span style={{ fontSize: 10, color: "var(--muted2)" }}>
              Reply sent to your account email
            </span>
          </div>
        </form>
      </div>

      {/* Context card */}
      <div style={{
        padding: "14px 16px",
        background: "var(--surface2)", border: "1px solid var(--border)",
        borderRadius: 6, fontSize: 11, color: "var(--muted)", lineHeight: 1.8,
      }}>
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <div style={{ color: "var(--muted2)", fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Response time</div>
            <div style={{ color: "var(--text)" }}>1–2 business days</div>
          </div>
          <div>
            <div style={{ color: "var(--muted2)", fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Urgent issues</div>
            <div style={{ color: "var(--text)" }}>Flag subject as "Gateway / API problem"</div>
          </div>
          <div>
            <div style={{ color: "var(--muted2)", fontSize: 9, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>Enterprise SLA</div>
            <div><a href="#pricing" style={{ color: "var(--accent2)", textDecoration: "none" }}>Upgrade for dedicated support</a></div>
          </div>
        </div>
      </div>
    </div>
  );
}
