import type { Metadata } from "next";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Changelog — GateML",
  description: "What's new in GateML — release notes, new features, and improvements.",
  openGraph: {
    title: "GateML Changelog",
    description: "What's new in GateML — release notes, new features, and improvements.",
  },
};

const ENTRIES = [
  {
    date: "June 5, 2026", version: "v0.3.0", tag: "new",
    title: "Go, Ruby, and PHP SDKs",
    changes: [
      "Official Go SDK — wraps openai-go with the GateML base URL",
      "Official Ruby SDK — wraps ruby-openai",
      "Official PHP SDK — wraps openai-php/client",
      "New /docs/sdk page with tabs for every language",
      "curl examples added to quickstart",
    ],
  },
  {
    date: "May 10, 2026", version: "v0.2.0", tag: "new",
    title: "Eval Testing & Prompt Versioning",
    changes: [
      "Eval Testing: write assertions against your prompts, run in CI",
      "Prompt Versioning: full diff view between versions, one-click rollback",
      "Request Replay: inspect and copy-as-cURL any historical request",
      "Cost breakdown by model in the Observability tab",
    ],
  },
  {
    date: "April 22, 2026", version: "v0.1.0", tag: "launch",
    title: "Public Beta Launch",
    changes: [
      "OpenAI-compatible gateway — /v1/chat/completions, /v1/models",
      "Test keys return synthetic responses — no LLM calls, no cost",
      "Live keys forward to your stored provider keys (OpenAI, Anthropic, Google)",
      "Automatic fallback chain with exponential backoff",
      "Real-time request log with latency, token count, and cost",
      "Python and TypeScript SDKs",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 48px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Changelog</div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 48 }}>
          New features, improvements, and fixes — in order of newest first.
        </p>

        {ENTRIES.map(entry => (
          <div key={entry.version} style={{ marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 800 }}>{entry.title}</span>
              <span className={`tag tag-${entry.tag === "launch" ? "orange" : "green"}`} style={{ fontSize: 10 }}>{entry.tag}</span>
              <span className="tag tag-gray" style={{ fontSize: 9 }}>{entry.version}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 16 }}>{entry.date}</div>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {entry.changes.map((c, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--muted)", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0 }}>+</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Footer />
    </>
  );
}
