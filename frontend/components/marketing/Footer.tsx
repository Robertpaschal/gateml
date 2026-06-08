"use client";
import { useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const CATEGORIES = [
  { value: "GENERAL",        label: "General inquiry" },
  { value: "SUPPORT",        label: "Technical support" },
  { value: "ENTERPRISE_LEAD", label: "Enterprise / sales" },
];

function ContactModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState("GENERAL");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [company,  setCompany]  = useState("");
  const [subject,  setSubject]  = useState("");
  const [body,     setBody]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/support/public`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ category, name, email, company, subject, body }),
      });
      if (!res.ok) {
        const d = await res.json() as { message?: string };
        throw new Error(d.message ?? `HTTP ${res.status}`);
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", background: "var(--surface2)",
    border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)",
    fontSize: 13, fontFamily: "var(--font-mono)", outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: 28, width: "100%", maxWidth: 500,
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        {sent ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Message sent</div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              We'll get back to you within one business day.
            </div>
            <button
              onClick={onClose}
              style={{ marginTop: 20, padding: "8px 20px", background: "var(--accent)", border: "none",
                borderRadius: 4, color: "#fff", cursor: "pointer", fontSize: 13 }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Contact us</div>
              <button type="button" onClick={onClose}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 18 }}>
                ×
              </button>
            </div>

            {error && (
              <div style={{ padding: "8px 12px", background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)",
                borderRadius: 4, color: "#e05555", fontSize: 12, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Name *</label>
                <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="Your name" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Email *</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="you@company.com" />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Company <span style={{ color: "var(--muted2)" }}>(optional)</span></label>
              <input value={company} onChange={e => setCompany(e.target.value)} style={inputStyle} placeholder="Acme Inc." />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Subject *</label>
              <input required value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} placeholder="How can we help?" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Message *</label>
              <textarea required value={body} onChange={e => setBody(e.target.value)}
                rows={5} style={{ ...inputStyle, resize: "vertical" }} placeholder="Tell us more…" />
            </div>

            <button
              type="submit" disabled={loading}
              style={{ width: "100%", padding: "10px", background: "var(--accent)", border: "none",
                borderRadius: 4, color: "#fff", cursor: loading ? "not-allowed" : "pointer",
                fontSize: 13, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function Footer() {
  const [showContact, setShowContact] = useState(false);

  return (
    <>
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">GateML</div>
            <p className="footer-tagline">
              AI infrastructure for developers. Route, observe, and control every LLM call from one place.
            </p>
            <div style={{ marginTop: 16, fontSize: 11, color: "var(--muted2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", marginRight: 6 }} />
              api.gateml.io operational
            </div>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Product</div>
            <Link href="/docs/quickstart">Quickstart</Link>
            <Link href="/docs/sdk">SDKs</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/changelog">Changelog</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Developers</div>
            <Link href="/docs">Documentation</Link>
            <Link href="/docs/sdk">API Reference</Link>
            <a href="https://github.com/gateml" target="_blank" rel="noreferrer">GitHub</a>
            <Link href="/dashboard">Dashboard</Link>
          </div>

          <div className="footer-col">
            <div className="footer-col-title">Company</div>
            <a href="#">Blog</a>
            <a href="#">Twitter / X</a>
            <a href="#">Discord</a>
            <button onClick={() => setShowContact(true)}>
              Contact
            </button>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 GateML. All rights reserved.</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href="#" style={{ color: "var(--muted2)", textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ color: "var(--muted2)", textDecoration: "none" }}>Terms</a>
          </div>
        </div>
      </footer>
    </>
  );
}
