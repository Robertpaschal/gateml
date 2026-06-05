import { useState } from "react";
import { Icon } from "../components/Icons";

interface PromptVersion {
  v: number;
  date: string;
  note: string;
  isActive: boolean;
}

interface Prompt {
  id: string;
  name: string;
  status: "production" | "staging" | "draft";
  version: number;
  model: string;
}

// Seeded UI data — connects to real backend prompts API in a future iteration
const DEMO_PROMPTS: Prompt[] = [
  { id: "p1", name: "Customer Support Bot", status: "production", version: 4, model: "gpt-4o" },
  { id: "p2", name: "Document Summarizer", status: "staging", version: 2, model: "claude-sonnet-4-6" },
  { id: "p3", name: "Code Review Assistant", status: "production", version: 7, model: "gpt-4o-mini" },
];

const DEMO_VERSIONS: PromptVersion[] = [
  { v: 4, date: "2026-06-04", note: "Tightened tone instructions", isActive: true },
  { v: 3, date: "2026-05-28", note: "Added fallback handling", isActive: false },
  { v: 2, date: "2026-05-10", note: "Improved context window use", isActive: false },
  { v: 1, date: "2026-04-22", note: "Initial version", isActive: false },
];

const BODY_V4 = `You are a helpful, professional customer support agent for GateML.

## Rules
- Always greet the user by name if provided
- Resolve issues in under 3 messages when possible
- Escalate billing disputes to tier-2 without delay
- Never speculate about product roadmap

## Tone
Concise, warm, technically precise. Avoid filler phrases.

{{user_message}}`;

const BODY_V3 = `You are a customer support agent for GateML.

Rules:
- Greet the user
- Resolve issues efficiently
- Escalate billing disputes
- Do not speculate on roadmap
- If unclear, ask one clarifying question

{{user_message}}`;

const DIFF_LINES = [
  { type: "ctx", text: "You are a helpful, professional customer support agent for GateML." },
  { type: "ctx", text: "" },
  { type: "ctx", text: "## Rules" },
  { type: "remove", text: "- Always greet the user" },
  { type: "add",    text: "- Always greet the user by name if provided" },
  { type: "ctx", text: "- Resolve issues in under 3 messages when possible" },
  { type: "add",    text: "- Escalate billing disputes to tier-2 without delay" },
  { type: "remove", text: "- Escalate billing disputes" },
  { type: "ctx", text: "- Never speculate about product roadmap" },
];

export function PromptsPage() {
  const [selected, setSelected] = useState("p1");
  const [activeV, setActiveV] = useState(4);
  const [showDiff, setShowDiff] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newBody, setNewBody] = useState(BODY_V4);
  const [newNote, setNewNote] = useState("");

  const prompt = DEMO_PROMPTS.find(p => p.id === selected);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", gap: 20 }}>
        {/* Prompt list */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Prompts</span>
            <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: 10 }} onClick={() => setShowNew(true)}>
              <Icon name="plus" size={10} /> New
            </button>
          </div>
          {DEMO_PROMPTS.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                padding: "10px 14px", borderRadius: 5, marginBottom: 6, cursor: "pointer",
                background: selected === p.id ? "var(--surface2)" : "transparent",
                border: `1px solid ${selected === p.id ? "var(--border2)" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{p.name}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className={`tag tag-${p.status === "production" ? "green" : p.status === "staging" ? "yellow" : "gray"}`} style={{ fontSize: 9 }}>
                  {p.status}
                </span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>v{p.version} · {p.model}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div style={{ flex: 1 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title">{prompt?.name}</div>
                <div className="card-sub">Version history · {DEMO_VERSIONS.length} versions</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowDiff(!showDiff)}>
                  <Icon name="diff" size={11} /> {showDiff ? "Hide" : "Show"} Diff
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              {DEMO_VERSIONS.map(v => (
                <div
                  key={v.v}
                  onClick={() => setActiveV(v.v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 4, cursor: "pointer",
                    background: activeV === v.v ? "var(--surface2)" : "transparent",
                    marginBottom: 4, transition: "all 0.12s",
                  }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 4, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: v.isActive ? "rgba(0,255,136,0.15)" : "var(--surface2)",
                    color: v.isActive ? "var(--accent)" : "var(--muted)",
                    fontSize: 11, fontWeight: 700,
                  }}>v{v.v}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11 }}>{v.note}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{v.date}</div>
                  </div>
                  {v.isActive && <span className="tag tag-green" style={{ fontSize: 9 }}>LIVE</span>}
                </div>
              ))}
            </div>

            {showDiff ? (
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>
                  Diff: v3 → v4
                </div>
                <div style={{ background: "#070809", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
                  {DIFF_LINES.map((line, i) => (
                    <div key={i} className={`diff-line diff-${line.type}`}>
                      <span style={{ marginRight: 8, opacity: 0.5 }}>
                        {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                      </span>
                      {line.text || " "}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>
                  Prompt body · v{activeV}
                </div>
                <div className="code-area" style={{ fontSize: 11 }}>
                  {activeV === 4 ? BODY_V4 : BODY_V3}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">New Prompt Version</div>
            <div className="modal-sub">Creating a new version of "{prompt?.name}"</div>
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">Prompt Body</label>
              <textarea className="code-input" rows={12} value={newBody} onChange={e => setNewBody(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Change Note</label>
              <input className="field" placeholder="e.g. Improved tone instructions" value={newNote} onChange={e => setNewNote(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setShowNew(false)}>Save Version</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
