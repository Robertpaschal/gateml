import { Shuffle, ShieldCheck, Activity, GitBranch, FlaskConical, KeyRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const FEATURES: Array<{
  icon: LucideIcon;
  iconColor: string;
  bg: string;
  title: string;
  desc: string;
}> = [
  {
    icon: Shuffle,
    iconColor: "#00ff88",
    bg: "rgba(0,255,136,0.12)",
    title: "Smart Routing",
    desc: "Route between GPT-4o, Claude, and Gemini with a simple config. No code changes. Rules live in the dashboard.",
  },
  {
    icon: ShieldCheck,
    iconColor: "#00c9ff",
    bg: "rgba(0,201,255,0.12)",
    title: "Automatic Fallback",
    desc: "On rate-limits or 5xx errors, GateML retries the next model with exponential backoff. Your users never see a failure.",
  },
  {
    icon: Activity,
    iconColor: "#ffb800",
    bg: "rgba(255,184,0,0.12)",
    title: "Real-time Observability",
    desc: "Every request logged. Track latency, tokens, costs, and error rates in real time. Drill down into any request.",
  },
  {
    icon: GitBranch,
    iconColor: "#ff6b35",
    bg: "rgba(255,107,53,0.12)",
    title: "Prompt Versioning",
    desc: "Version your prompts like code. Diff versions, compare outputs, and roll back in one click without a deploy.",
  },
  {
    icon: FlaskConical,
    iconColor: "#00ff88",
    bg: "rgba(0,255,136,0.12)",
    title: "Eval Testing",
    desc: "Write assertions against your prompts. Run them in CI before you ship. Catch regressions before your users do.",
  },
  {
    icon: KeyRound,
    iconColor: "#00c9ff",
    bg: "rgba(0,201,255,0.12)",
    title: "Test Mode",
    desc: "Test keys return synthetic responses — no real LLM calls, no charges. Develop and integrate with confidence.",
  },
];

export function Features() {
  return (
    <section className="section">
      <div className="section-label">Features</div>
      <h2 className="section-title">Everything your AI stack needs</h2>
      <p className="section-sub" style={{ marginBottom: 40 }}>
        From your first prototype to millions of requests, GateML grows with you.
      </p>

      <div className="features-grid">
        {FEATURES.map(f => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon" style={{ background: f.bg }}>
              <f.icon size={18} color={f.iconColor} strokeWidth={1.5} />
            </div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
