import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quickstart",
  description: "Get up and running with GateML in under 3 minutes.",
};

const STEP_CSS = { fontSize: 12, color: "var(--muted)", lineHeight: 1.8, marginBottom: 16 };

export default function QuickstartPage() {
  return (
    <div className="docs-content">
      <div className="docs-h1">Quickstart</div>
      <p className="docs-p">Get from zero to your first routed LLM call in under 3 minutes.</p>

      <div className="docs-h2">Step 1 — Get your API key</div>
      <p style={STEP_CSS}>
        <Link href="/auth" style={{ color: "var(--accent2)" }}>Create a free account</Link>.
        You immediately receive two keys:
      </p>
      <ul style={{ ...STEP_CSS, paddingLeft: 20 }}>
        <li><strong style={{ color: "var(--text)" }}>Test key</strong> — Returns synthetic responses. Free, no LLM calls.</li>
        <li><strong style={{ color: "var(--text)" }}>Live key</strong> — Routes to real providers using your stored provider keys.</li>
      </ul>

      <div className="docs-h2">Step 2 — Add a provider key (for live mode)</div>
      <p style={STEP_CSS}>
        Go to <strong>Dashboard → Gateway → Provider Keys</strong> and paste your OpenAI or Anthropic API key.
        We store it encrypted with AES-256. Skip this step if you only want test mode.
      </p>

      <div className="docs-h2">Step 3 — Change one line of code</div>

      <div className="docs-h3">Python</div>
      <div className="docs-code">{`pip install openai  # already installed? skip this

from openai import OpenAI

client = OpenAI(
    api_key="gml-sk-test_...",          # your test key
    base_url="https://api.gateml.io/v1" # ← only change
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
# → [GateML test mode] This is a synthetic response...`}</div>

      <div className="docs-h3">TypeScript / Node.js</div>
      <div className="docs-code">{`npm install gateml  # thin wrapper around OpenAI SDK

import { createGateMLClient } from 'gateml';

const client = await createGateMLClient({ apiKey: 'gml-sk-test_...' });

const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello!' }],
});
console.log(response.choices[0].message.content);`}</div>

      <div className="docs-h2">Step 4 — Go live</div>
      <p style={STEP_CSS}>
        Switch your key from <code className="docs-inline-code">gml-sk-test_...</code> to{" "}
        <code className="docs-inline-code">gml-sk-live_...</code>. That's it.
        GateML will now forward your requests to the real provider using your stored provider key.
      </p>

      <div className="docs-note">
        <strong>Tip:</strong> Configure a fallback chain in Gateway → Routing. For example: gpt-4o →
        claude-sonnet-4-6 → gpt-4o-mini. GateML retries automatically on rate-limits (429) and errors (5xx).
      </div>

      <div className="docs-h2">What's next?</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
        {[
          { href: "/docs/sdk", label: "→ Explore SDKs", desc: "Go, Ruby, PHP, curl" },
          { href: "/dashboard/gateway", label: "→ Set up fallback chain", desc: "Never go down again" },
          { href: "/dashboard/observe", label: "→ Watch live requests", desc: "Latency, cost, errors" },
          { href: "/dashboard/prompts", label: "→ Version your prompts", desc: "Diff, compare, rollback" },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "14px 16px", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: 13, color: "var(--accent2)", fontWeight: 600 }}>{l.label}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
