"use client";
import { useEffect, useState, useCallback } from "react";
import { logsApi } from "../lib/api";
import { useToken } from "../hooks/useToken";
import { Icon } from "../components/Icons";
import type { RequestLog } from "../types";

export function ReplayPage() {
  const token = useToken();
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLogs(await logsApi.list(token, 30));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const sel = selected !== null ? logs[selected] : null;

  const copyCurl = () => {
    if (!sel) return;
    const curl = `curl https://api.gateml.io/v1/chat/completions \\\n  -H "Authorization: Bearer gml-sk-live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"${sel.model}","messages":[{"role":"user","content":"..."}]}'`;
    navigator.clipboard.writeText(curl);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fade-in" style={{ display: "flex", gap: 20 }}>
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>
          Recent Requests ({logs.length})
        </div>
        {logs.length === 0 && <div style={{ color: "var(--muted)", fontSize: 12 }}>No requests logged yet.</div>}
        {logs.map((r, i) => (
          <div key={r.id} onClick={() => setSelected(i)} style={{
            padding: "10px 12px", borderRadius: 5, marginBottom: 6, cursor: "pointer",
            background: selected === i ? "var(--surface2)" : "var(--surface)",
            border: `1px solid ${selected === i ? "var(--border2)" : "var(--border)"}`,
            transition: "all 0.12s",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span className={`tag tag-${r.status < 400 ? "green" : r.status === 429 ? "yellow" : "red"}`} style={{ fontSize: 9 }}>{r.status}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(r.createdAt).toLocaleTimeString()}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{r.latencyMs}ms</span>
            </div>
            <div style={{ fontSize: 11 }}>{r.model}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
              {(r.promptTokens + r.completionTokens).toLocaleString()} tokens · ${r.costUsd.toFixed(4)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {sel ? (
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Request Detail</div>
                <div className="card-sub">{new Date(sel.createdAt).toLocaleString()} · {sel.model}</div>
              </div>
              <button className="btn btn-ghost" onClick={copyCurl}>
                <Icon name="copy" size={11} /> {copied ? "Copied!" : "Copy as cURL"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              {[
                ["Status", sel.status, sel.status < 400 ? "var(--accent)" : "var(--danger)"],
                ["Latency", `${sel.latencyMs}ms`, "var(--text)"],
                ["Tokens", (sel.promptTokens + sel.completionTokens).toLocaleString(), "var(--text)"],
                ["Cost", `$${sel.costUsd.toFixed(4)}`, "var(--accent3)"],
                ["Provider", sel.provider, "var(--muted)"],
              ].map(([k, v, c]) => (
                <div key={k as string} style={{ background: "var(--surface2)", borderRadius: 4, padding: "8px 14px" }}>
                  <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "1px" }}>{k}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c as string }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Token Usage</div>
            <div style={{ display: "flex", gap: 24, fontSize: 12, padding: "10px 0", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
              <span>Prompt: <strong style={{ color: "var(--accent2)" }}>{sel.promptTokens.toLocaleString()}</strong></span>
              <span>Completion: <strong style={{ color: "var(--accent)" }}>{sel.completionTokens.toLocaleString()}</strong></span>
            </div>
            <div style={{ padding: "10px 14px", background: "var(--surface2)", borderRadius: 4, fontSize: 11, color: "var(--muted)" }}>
              Full request/response bodies are not stored to protect your privacy. Use cURL to replay.
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

export default ReplayPage;
