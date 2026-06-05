import { useEffect, useState, useCallback } from "react";
import { logsApi } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Icon } from "../components/Icons";
import type { RequestLog } from "../types";

export function ReplayPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const rows = await logsApi.list(user.token, 30);
    setLogs(rows);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const sel = selected !== null ? logs[selected] : null;

  const copyCurl = () => {
    if (!sel) return;
    const curl = `curl https://api.gateml.io/v1/chat/completions \\
  -H "Authorization: Bearer gml-sk-live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${sel.model}","messages":[{"role":"user","content":"..."}]}'`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fade-in" style={{ display: "flex", gap: 20 }}>
      {/* List */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
          Recent Requests ({logs.length})
        </div>
        {logs.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 12 }}>No requests logged yet.</div>
        )}
        {logs.map((r, i) => (
          <div
            key={r.id}
            onClick={() => setSelected(i)}
            style={{
              padding: "10px 12px", borderRadius: 5, marginBottom: 6, cursor: "pointer",
              background: selected === i ? "var(--surface2)" : "var(--surface)",
              border: `1px solid ${selected === i ? "var(--border2)" : "var(--border)"}`,
              transition: "all 0.12s",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span className={`tag tag-${r.status < 400 ? "green" : r.status === 429 ? "yellow" : "red"}`} style={{ fontSize: 9 }}>
                {r.status}
              </span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                {new Date(r.created_at * 1000).toLocaleTimeString()}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{r.latency_ms}ms</span>
            </div>
            <div style={{ fontSize: 11 }}>{r.model}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
              {(r.prompt_tokens + r.completion_tokens).toLocaleString()} tokens · ${r.cost_usd.toFixed(4)}
            </div>
          </div>
        ))}
      </div>

      {/* Detail */}
      <div style={{ flex: 1 }}>
        {sel ? (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Request Detail</div>
                <div className="card-sub">
                  {new Date(sel.created_at * 1000).toLocaleString()} · {sel.model}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={copyCurl}>
                  <Icon name="copy" size={11} /> {copied ? "Copied!" : "Copy as cURL"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                ["Status",  sel.status,                    sel.status < 400 ? "var(--accent)" : "var(--danger)"],
                ["Latency", `${sel.latency_ms}ms`,         "var(--text)"],
                ["Tokens",  (sel.prompt_tokens + sel.completion_tokens).toLocaleString(), "var(--text)"],
                ["Cost",    `$${sel.cost_usd.toFixed(4)}`, "var(--accent3)"],
                ["Provider",sel.provider,                  "var(--muted)"],
              ].map(([k, v, c]) => (
                <div key={k as string} style={{ background: "var(--surface2)", borderRadius: 4, padding: "8px 14px" }}>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "1px" }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c as string }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>
                Path
              </div>
              <div className="code-area" style={{ fontSize: 11 }}>POST {sel.path}</div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>
                Token Usage
              </div>
              <div style={{ display: "flex", gap: 24, fontSize: 12, padding: "10px 0" }}>
                <span>Prompt: <strong style={{ color: "var(--accent2)" }}>{sel.prompt_tokens.toLocaleString()}</strong></span>
                <span>Completion: <strong style={{ color: "var(--accent)" }}>{sel.completion_tokens.toLocaleString()}</strong></span>
                <span>Total: <strong>{(sel.prompt_tokens + sel.completion_tokens).toLocaleString()}</strong></span>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--surface2)", borderRadius: 4, fontSize: 11, color: "var(--muted)" }}>
              Full request/response bodies are not stored to protect your data privacy.
              Use the cURL button to replay this request manually.
            </div>
          </div>
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 12, flexDirection: "column", gap: 8 }}>
            <Icon name="replay" size={24} />
            <span>Select a request to inspect</span>
          </div>
        )}
      </div>
    </div>
  );
}
