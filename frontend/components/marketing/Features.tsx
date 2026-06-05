const FEATURES = [
  {
    icon: "🔀",
    color: "rgba(0,255,136,0.12)",
    title: "Smart Routing",
    desc: "Route between GPT-4o, Claude, and Gemini with a simple config. No code changes. Rules live in the dashboard.",
  },
  {
    icon: "🛡️",
    color: "rgba(0,201,255,0.12)",
    title: "Automatic Fallback",
    desc: "On rate-limits or 5xx errors, GateML retries the next model with exponential backoff. Your users never see a failure.",
  },
  {
    icon: "📊",
    color: "rgba(255,184,0,0.12)",
    title: "Real-time Observability",
    desc: "Every request logged. Track latency, tokens, costs, and error rates in real time. Drill down into any request.",
  },
  {
    icon: "📝",
    color: "rgba(255,107,53,0.12)",
    title: "Prompt Versioning",
    desc: "Version your prompts like code. Diff versions, compare outputs, and roll back in one click without a deploy.",
  },
  {
    icon: "🧪",
    color: "rgba(0,255,136,0.12)",
    title: "Eval Testing",
    desc: "Write assertions against your prompts. Run them in CI before you ship. Catch regressions before your users do.",
  },
  {
    icon: "🔑",
    color: "rgba(0,201,255,0.12)",
    title: "Test Mode",
    desc: "Test keys return synthetic responses — no real LLM calls, no charges. Develop and integrate with confidence.",
  },
];

export function Features() {
  return (
    <section style={{ padding: "0 48px 80px", maxWidth: 1200, margin: "0 auto" }}>
      <div className="section-label">Features</div>
      <h2 className="section-title">Everything your AI stack needs</h2>
      <p className="section-sub" style={{ marginBottom: 40 }}>
        From your first prototype to millions of requests, GateML grows with you.
      </p>

      <div className="features-grid">
        {FEATURES.map(f => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon" style={{ background: f.color, fontSize: 18 }}>
              {f.icon}
            </div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
