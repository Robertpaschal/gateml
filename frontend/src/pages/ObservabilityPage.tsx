"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { logsApi, statsApi }                from "../lib/api";
import { useToken }                         from "../hooks/useToken";
import { subscribeToUserPulse }             from "../../lib/firebase";
import type { LogRow, Stats }               from "../lib/api";

type Tab = "live" | "cost" | "errors";

// Decode userId from the JWT stored in the cookie / localStorage.
// We only need the `sub` claim (userId) to subscribe to the Firestore pulse.
function decodeUserId(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return (decoded.sub as string) || null;
  } catch {
    return null;
  }
}

export function ObservabilityPage() {
  const token = useToken();
  const [tab,  setTab]  = useState<Tab>("live");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pulseTs, setPulseTs] = useState(0); // incremented on each Firestore pulse
  const unsubRef = useRef<(() => void) | null>(null);

  // Fetch logs + stats whenever pulseTs changes (Firestore-driven) or on mount
  const refresh = useCallback(async () => {
    if (!token) return;
    const [l, s] = await Promise.all([logsApi.list(token, 50), statsApi.get(token)]);
    setLogs(l);
    setStats(s);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh, pulseTs]);

  // Subscribe to the Firestore pulse document — no polling needed
  useEffect(() => {
    if (!token) return;
    const userId = decodeUserId(token);
    if (!userId) return;

    unsubRef.current = subscribeToUserPulse(userId, () => {
      // Any write from the gateway triggers this → refresh data
      setPulseTs(t => t + 1);
    });

    return () => { unsubRef.current?.(); };
  }, [token]);

  const errors = logs.filter(l => l.status >= 400);

  return (
    <div className="fade-in">
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: "Requests (24h)", value: stats?.totalCalls.toLocaleString() ?? "—", color: "green" },
          { label: "Error Rate",     value: stats ? `${stats.errorRate}%` : "—",        color: "yellow" },
          { label: "p95 Latency",    value: stats ? `${stats.p95LatencyMs}ms` : "—",    color: "blue" },
          { label: "Total Cost",     value: stats ? `$${stats.totalCostUsd.toFixed(2)}` : "—", color: "orange" },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {(["live", "cost", "errors"] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "live" ? "Live Log" : t === "cost" ? "Cost" : `Errors (${errors.length})`}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Request Log</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--accent)" }}>
              <span className="status-dot" /> Real-time via Firestore
            </div>
          </div>
          {logs.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 12, padding: "16px 0" }}>No requests yet.</div>
          ) : logs.map(l => (
            <div key={l.id} className="log-entry">
              <div className="log-time">{new Date(l.createdAt).toLocaleTimeString()}</div>
              <div style={{ minWidth: 36 }}>
                <span className={`tag tag-${l.status < 400 ? "green" : l.status === 429 ? "yellow" : "red"}`} style={{ fontSize: 9 }}>
                  {l.status}
                </span>
              </div>
              <div className="log-body">
                <div className="log-path">{l.path}</div>
                <div className="log-meta">
                  {l.model} · {l.latencyMs}ms · {(l.promptTokens + l.completionTokens).toLocaleString()} tokens · ${l.costUsd.toFixed(4)}
                  {l.isTestMode && <span style={{ color: "var(--accent2)", marginLeft: 8 }}>test</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "cost" && stats && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cost Breakdown</div><div className="card-sub">Last 24 h</div>
          </div>
          {stats.byModel.length === 0 ? (
            <div style={{ color: "var(--muted)", fontSize: 12 }}>No data yet.</div>
          ) : <>
            {stats.byModel.map(m => {
              const pct = stats.totalCostUsd > 0 ? (m.cost / stats.totalCostUsd) * 100 : 0;
              return (
                <div key={m.model} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span>{m.model}</span><span style={{ color: "var(--accent3)" }}>${m.cost.toFixed(4)}</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--accent3)" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                    {m.calls.toLocaleString()} calls · {pct.toFixed(0)}% of spend
                  </div>
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Total (24 h)</span>
              <span style={{ color: "var(--accent3)", fontWeight: 700 }}>${stats.totalCostUsd.toFixed(4)}</span>
            </div>
          </>}
        </div>
      )}

      {tab === "errors" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Error Log</div></div>
          {errors.length === 0 ? (
            <div style={{ color: "var(--accent)", fontSize: 12 }}>No errors in the last 50 requests.</div>
          ) : errors.map(l => (
            <div key={l.id} className="log-entry">
              <div className="log-time">{new Date(l.createdAt).toLocaleTimeString()}</div>
              <span className="tag tag-red" style={{ fontSize: 9 }}>{l.status}</span>
              <div className="log-body">
                <div className="log-path">{l.model} — {l.path}</div>
                <div className="log-meta">{l.latencyMs}ms · {l.provider}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
