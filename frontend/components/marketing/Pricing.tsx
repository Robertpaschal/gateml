"use client";
import { useState } from "react";
import Link from "next/link";

const FREE_FEATURES = [
  "1,000 live requests / month",
  "Unlimited test mode requests",
  "GateML Managed Keys (no setup)",
  "Basic observability dashboard",
  "1 API key pair",
  "7-day log retention (last 100)",
  "Community support",
];

const PRO_FEATURES = [
  "30,000 live requests / month",
  "Full observability + cost tracking",
  "GateML Managed Keys (no setup)",
  "Prompt library + version diffs",
  "Eval testing suite",
  "Fallback chain configuration",
  "Up to 5 API key pairs",
  "90-day log retention",
  "Pay-as-you-go for overages",
  "Email support",
];

const ENTERPRISE_FEATURES = [
  "Unlimited requests",
  "Custom rate limits",
  "SSO / SAML",
  "99.9% uptime SLA",
  "Dedicated Slack channel",
  "Custom contract & invoicing",
];

// ── Enterprise contact modal ───────────────────────────────────────────────────

const BASE = typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : "/api";

function EnterpriseModal({ onClose }: { onClose: () => void }) {
  const [form,    setForm]    = useState({ name: "", email: "", company: "", body: "" });
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  function set(k: keyof typeof form, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${BASE}/support/public`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:     form.name,
          email:    form.email,
          company:  form.company,
          subject:  "Enterprise plan inquiry",
          body:     form.body,
          category: "ENTERPRISE_LEAD",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(d.message ?? `HTTP ${res.status}`);
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: 480 }}>
        {sent ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div className="modal-title">Message received</div>
            <div className="modal-sub" style={{ marginBottom: 24 }}>
              We'll reach out to <strong>{form.email}</strong> within one business day to
              discuss your use case and put together a custom quote.
            </div>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <div className="modal-title">Talk to us about Enterprise</div>
              <div className="modal-sub">
                Unlimited requests, custom SLA, SSO, and dedicated support.
                Tell us about your team and we'll follow up within one business day.
              </div>
            </div>

            {error && (
              <div style={{
                padding: "9px 12px", marginBottom: 14, borderRadius: 4,
                background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)",
                color: "var(--danger)", fontSize: 11,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-col">
                  <label className="form-label">Your name</label>
                  <input className="field" value={form.name} onChange={e => set("name", e.target.value)}
                    placeholder="Alex Johnson" required />
                </div>
                <div className="form-col">
                  <label className="form-label">Work email</label>
                  <input className="field" type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    placeholder="alex@company.com" required />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="form-label">Company</label>
                <input className="field" value={form.company} onChange={e => set("company", e.target.value)}
                  placeholder="Acme Corp" required />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="form-label">
                  Tell us about your use case
                  <span style={{ fontWeight: 400, textTransform: "none", color: "var(--muted2)", marginLeft: 4 }}>
                    — volume, providers, what you're building
                  </span>
                </label>
                <textarea className="field" value={form.body} onChange={e => set("body", e.target.value)}
                  rows={4} placeholder="We process ~500k requests/month across OpenAI and Anthropic…"
                  required style={{ resize: "vertical" }} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Pricing component ─────────────────────────────────────────────────────

export function Pricing() {
  const [annual,          setAnnual]          = useState(false);
  const [showEnterprise,  setShowEnterprise]  = useState(false);

  return (
    <section className="section" id="pricing" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="section-label">Pricing</div>
      <h2 className="section-title">Simple, transparent pricing</h2>
      <p className="section-sub" style={{ marginBottom: 32 }}>
        Start free with real LLM access. Scale as you grow. No surprise bills.
      </p>

      {/* Billing toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
        <span style={{ fontSize: 12, color: annual ? "var(--muted)" : "var(--text)" }}>Monthly</span>
        <button
          onClick={() => setAnnual(v => !v)}
          style={{
            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            background: annual ? "var(--accent)" : "var(--surface2)",
            position: "relative", transition: "background 0.2s",
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: annual ? 23 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "#000",
            transition: "left 0.2s",
          }} />
        </button>
        <span style={{ fontSize: 12, color: annual ? "var(--text)" : "var(--muted)" }}>
          Annual
          <span style={{
            marginLeft: 6, background: "rgba(0,255,136,0.12)", color: "var(--accent)",
            fontSize: 10, padding: "1px 7px", borderRadius: 10, border: "1px solid rgba(0,255,136,0.25)",
          }}>Save 33%</span>
        </span>
      </div>

      <div className="pricing-grid">
        {/* Free */}
        <div className="pricing-card">
          <div className="pricing-name">Starter</div>
          <div className="pricing-desc">For developers and side projects.</div>
          <div className="pricing-price">
            Free<span>&nbsp;forever</span>
          </div>
          <ul className="pricing-features">
            {FREE_FEATURES.map(f => <li key={f}>{f}</li>)}
          </ul>
          <Link href="/auth" className="btn-ghost-lg"
            style={{ width: "100%", justifyContent: "center", display: "flex" }}>
            Get started
          </Link>
          <p className="pricing-cta-note">No credit card required</p>
        </div>

        {/* Pro */}
        <div className="pricing-card featured">
          <div className="pricing-name">Pro</div>
          <div className="pricing-desc">For teams running AI in production.</div>
          <div className="pricing-price">
            {annual ? "$12.67" : "$19"}
            <span>&nbsp;/ mo{annual ? " · billed $152/yr" : ""}</span>
          </div>
          <ul className="pricing-features">
            {PRO_FEATURES.map(f => <li key={f}>{f}</li>)}
          </ul>
          <Link href="/auth" className="btn-primary-lg"
            style={{ width: "100%", justifyContent: "center", display: "flex" }}>
            Start free trial
          </Link>
          <p className="pricing-cta-note">7-day free trial · cancel anytime</p>
        </div>

        {/* Enterprise */}
        <div className="pricing-card">
          <div className="pricing-name">Enterprise</div>
          <div className="pricing-desc">Unlimited scale, SLA, and dedicated support.</div>
          <div className="pricing-price">
            Custom<span />
          </div>
          <ul className="pricing-features">
            {ENTERPRISE_FEATURES.map(f => <li key={f}>{f}</li>)}
          </ul>
          <button
            className="btn-ghost-lg"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => setShowEnterprise(true)}
          >
            Talk to us
          </button>
          <p className="pricing-cta-note">Response within 1 business day</p>
        </div>
      </div>

      {/* Pay-as-you-go + Managed Keys callouts */}
      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{
          padding: "18px 24px",
          background: "rgba(0,201,255,0.04)", border: "1px solid rgba(0,201,255,0.15)",
          borderRadius: 8, display: "flex", alignItems: "center", gap: 16,
        }}>
          <span style={{
            fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, color: "var(--accent2)",
            whiteSpace: "nowrap",
          }}>Managed Keys</span>
          <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
            Don&apos;t want to manage provider API keys? Enable <strong style={{ color: "var(--text)" }}>GateML Managed Keys</strong> — GateML
            routes through its own provider accounts and bills you per-token at provider cost + 20% markup.
            Available on all plans, no credit card required to start.
          </span>
        </div>

        <div style={{
          padding: "18px 24px",
          background: "rgba(0,255,136,0.03)", border: "1px solid rgba(0,255,136,0.12)",
          borderRadius: 8, display: "flex", alignItems: "center", gap: 16,
        }}>
          <span style={{
            fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, color: "var(--accent)",
            whiteSpace: "nowrap",
          }}>Pay-as-you-go</span>
          <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
            Hit your monthly limit? Enable pay-as-you-go and keep going at{" "}
            <strong style={{ color: "var(--text)" }}>$0.002/request</strong> (Starter) or{" "}
            <strong style={{ color: "var(--text)" }}>$0.001/request</strong> (Pro) — billed monthly,
            no upfront commitment.
          </span>
        </div>
      </div>

      {showEnterprise && <EnterpriseModal onClose={() => setShowEnterprise(false)} />}
    </section>
  );
}
