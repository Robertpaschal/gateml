"use client";
import { useEffect, useState } from "react";
import { statsApi, logsApi } from "../lib/api";
import { useToken } from "../hooks/useToken";
import { Sparkline } from "../components/Sparkline";
import { MiniBar } from "../components/MiniBar";
import type { Stats, RequestLog } from "../types";

export function DashboardPage() {
  const token = useToken();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<RequestLog[]>([]);

  useEffect(() => {
    if (!token) return;
    statsApi.get(token).then(setStats).catch(console.error);
    logsApi.list(token, 6).then(setLogs).catch(console.error);
  }, [token]);

  const hourlyData = stats?.hourly.map(h => h.calls) ?? [];
  const costData = stats?.byModel.map(m => m.cost) ?? [];

  return (
    <div className="fade-in">
      <div className="grid-4">
        <StatCard label="Total API Calls (24h)" value={stats ? stats.totalCalls.toLocaleString() : "—"} color="green" />
        <StatCard label="Tokens Used (24h)"     value={stats ? fmt(stats.totalTokens) : "—"}           color="blue" />
        <StatCard label="Spend Today"           value={stats ? `$${stats.totalCostUsd.toFixed(2)}` : "—"} color="orange" />
        <StatCard label="p95 Latency"           value={stats ? `${stats.p95LatencyMs.toLocaleString()}ms` : "—"} color="yellow" />
      </div>

      {hourlyData.length > 0 && (
        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Request Volume</div><div className="card-sub">Hourly, last 24 h</div></div>
              <Sparkline data={hourlyData} color="#00ff88" width={100} height={40} />
            </div>
            <MiniBar data={hourlyData} color="#00ff88" />
          </div>
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Spend by Model ($)</div><div className="card-sub">Last 24 h</div></div>
              <Sparkline data={costData.length > 1 ? costData : [0, 0]} color="#ff6b35" width={100} height={40} />
            </div>
            <MiniBar data={costData.length > 0 ? costData : [0]} color="#ff6b35" />
          </div>
        </div>
      )}

      {stats && stats.byModel.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Model Breakdown</div>
            <span className="tag tag-green">{stats.byModel.length} models</span>
          </div>
          <table className="table">
            <thead><tr><th>Model</th><th>Calls</th><th>Tokens</th><th>Cost</th></tr></thead>
            <tbody>
              {stats.byModel.map(m => (
                <tr key={m.model}>
                  <td><span className="tag tag-gray">{m.model}</span></td>
                  <td>{m.calls.toLocaleString()}</td>
                  <td>{fmt(m.tokens)}</td>
                  <td style={{ color: "var(--accent3)" }}>${m.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Requests</div>
          <span className="tag tag-blue">{logs.length} shown</span>
        </div>
        {logs.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 12, padding: "20px 0" }}>
            No requests yet. Make your first call through the gateway and it will appear here.
          </div>
        ) : logs.map(l => (
          <div key={l.id} className="log-entry">
            <div className="log-time">{new Date(l.created_at * 1000).toLocaleTimeString()}</div>
            <div style={{ minWidth: 36 }}>
              <span className={`tag tag-${l.status < 400 ? "green" : l.status === 429 ? "yellow" : "red"}`} style={{ fontSize: 9 }}>
                {l.status}
              </span>
            </div>
            <div className="log-body">
              <div className="log-path">{l.path}</div>
              <div className="log-meta">
                {l.model} · {l.latency_ms}ms · {(l.prompt_tokens + l.completion_tokens).toLocaleString()} tokens · ${l.cost_usd.toFixed(4)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color}`}>{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default DashboardPage;
