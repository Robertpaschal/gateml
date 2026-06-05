import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs Overview",
  description: "GateML documentation — learn how to route LLM calls through the GateML gateway.",
};

export default function DocsPage() {
  return (
    <div className="docs-content">
      <div className="docs-h1">Documentation</div>
      <p className="docs-p">
        GateML is an OpenAI-compatible API gateway. Point your existing code at{" "}
        <code className="docs-inline-code">https://api.gateml.io/v1</code> and your
        requests are routed, observed, and protected — with automatic fallback on failures.
      </p>

      <div className="docs-note">
        New here? Start with the{" "}
        <Link href="/docs/quickstart" style={{ color: "var(--accent2)" }}>Quickstart →</Link>
      </div>

      <div className="docs-h2">What GateML does</div>
      <p className="docs-p">
        When your code calls <code className="docs-inline-code">POST /v1/chat/completions</code> with a GateML key,
        we:
      </p>
      <ol style={{ fontSize: 13, color: "var(--muted)", lineHeight: 2, paddingLeft: 20, marginBottom: 20 }}>
        <li>Validate your API key (test or live)</li>
        <li>Route to your configured primary model (e.g. gpt-4o)</li>
        <li>On 429 or 5xx, retry the next model in your fallback chain</li>
        <li>Log the request — latency, tokens, cost, status</li>
        <li>Return the response in standard OpenAI format</li>
      </ol>

      <div className="docs-h2">Key concepts</div>
      {[
        { term: "Test keys (gml-sk-test_...)", def: "Return synthetic responses. No real LLM calls. No charges. Use during development." },
        { term: "Live keys (gml-sk-live_...)", def: "Forward to real providers using your stored provider API keys." },
        { term: "Provider keys", def: "Your OpenAI / Anthropic / Google API keys, stored encrypted (AES-256) in GateML." },
        { term: "Fallback chain", def: "Ordered list of models to try on failure. Configure in Gateway → Routing." },
      ].map(({ term, def }) => (
        <div key={term} style={{ marginBottom: 16, paddingLeft: 16, borderLeft: "2px solid var(--border2)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--text)" }}>{term}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{def}</div>
        </div>
      ))}

      <div className="docs-h2">Quicklinks</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {[
          { href: "/docs/quickstart", label: "→ Quickstart", desc: "Up and running in 3 minutes" },
          { href: "/docs/sdk", label: "→ SDKs", desc: "Python, TypeScript, Go, Ruby, PHP" },
          { href: "/auth", label: "→ Get your API key", desc: "Free account, no credit card" },
          { href: "/changelog", label: "→ Changelog", desc: "What's new in GateML" },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px", textDecoration: "none", display: "block", transition: "border-color 0.15s" }}>
            <div style={{ fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>{l.label}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
