"use client";
import { useState } from "react";
import Link from "next/link";

const FREE_FEATURES = [
  "1,000 live requests / month",
  "Unlimited test mode requests",
  "Basic observability dashboard",
  "1 API key pair",
  "7-day log retention (last 100)",
  "Community support",
];

const PRO_FEATURES = [
  "30,000 live requests / month",
  "Full observability + cost tracking",
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

export function Pricing() {
  const [annual, setAnnual] = useState(false);

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
          <p style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", marginTop: 12 }}>
            7-day free trial · cancel anytime
          </p>
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
          <a href="mailto:hello@gateml.io" className="btn-ghost-lg"
            style={{ width: "100%", justifyContent: "center", display: "flex" }}>
            Contact us
          </a>
        </div>
      </div>

      {/* Pay-as-you-go callout */}
      <div style={{
        marginTop: 32, padding: "18px 24px",
        background: "rgba(0,201,255,0.04)", border: "1px solid rgba(0,201,255,0.15)",
        borderRadius: 8, display: "flex", alignItems: "center", gap: 16,
      }}>
        <span style={{
          fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, color: "var(--accent2)",
          whiteSpace: "nowrap",
        }}>Pay-as-you-go</span>
        <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          Have a busy day? Enable pay-as-you-go in your billing settings and continue beyond your
          monthly quota at <strong style={{ color: "var(--text)" }}>$0.002/request</strong> (Starter)
          or <strong style={{ color: "var(--text)" }}>$0.001/request</strong> (Pro) — billed monthly,
          no upfront commitment.
        </span>
      </div>
    </section>
  );
}
