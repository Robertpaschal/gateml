import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    sub: "forever",
    desc: "Perfect for exploring and development.",
    features: [
      "1,000 requests / month",
      "Test mode (synthetic responses)",
      "Basic request log (last 100)",
      "1 API key",
      "Community support",
    ],
    cta: "Get started",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    sub: "/ month",
    desc: "For teams running AI in production.",
    features: [
      "100,000 requests / month",
      "Full observability + cost tracking",
      "Prompt versioning + diffs",
      "Eval testing suite",
      "Fallback chain configuration",
      "Up to 10 API keys",
      "Email support",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    sub: "",
    desc: "Unlimited scale, SLA, and dedicated support.",
    features: [
      "Unlimited requests",
      "Custom rate limits",
      "SSO / SAML",
      "99.9% uptime SLA",
      "Dedicated Slack channel",
      "Custom contract",
    ],
    cta: "Contact us",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section className="section" id="pricing" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="section-label">Pricing</div>
      <h2 className="section-title">Simple, transparent pricing</h2>
      <p className="section-sub" style={{ marginBottom: 48 }}>
        Start free. Scale as you grow. No surprise bills.
      </p>

      <div className="pricing-grid">
        {PLANS.map(plan => (
          <div key={plan.name} className={`pricing-card ${plan.featured ? "featured" : ""}`}>
            <div className="pricing-name">{plan.name}</div>
            <div className="pricing-desc">{plan.desc}</div>
            <div className="pricing-price">
              {plan.price}
              {plan.sub && <span>{plan.sub}</span>}
            </div>
            <ul className="pricing-features">
              {plan.features.map(f => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link
              href="/auth"
              className={plan.featured ? "btn-primary-lg" : "btn-ghost-lg"}
              style={{ width: "100%", justifyContent: "center", display: "flex" }}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
