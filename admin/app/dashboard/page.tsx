"use client";
import { useEffect, useState } from "react";
import { analyticsApi, type Analytics } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

function fmt(n: number) { return n.toLocaleString(); }

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{typeof value === "number" ? fmt(value) : value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function OverviewPage() {
  const [data, setData]   = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    analyticsApi.get(token)
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div style={{ color: "var(--red)" }}>{error}</div>;
  if (!data)  return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  const planOrder = ["FREE", "PRO", "ENTERPRISE"];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatCard label="MRR" value={`$${fmt(data.mrrUsd)}`} sub={`${data.activeSubscriptions} active subs`} />
        <StatCard label="Total Users"   value={data.totalUsers}          sub={`+${data.newSignupsThisWeek} this week`} />
        <StatCard label="Requests Today" value={data.requestsToday}      sub="live only" />
        <StatCard label="Requests / Mo"  value={data.requestsThisMonth}  sub="current month" />
      </div>

      {/* Plan breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>Users by Plan</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {planOrder.map(plan => {
              const count = data.planCounts[plan] ?? 0;
              const pct   = data.totalUsers ? Math.round((count / data.totalUsers) * 100) : 0;
              const color = plan === "PRO" ? "var(--accent)" : plan === "ENTERPRISE" ? "var(--green)" : "var(--muted)";
              return (
                <div key={plan}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color }}>{plan}</span>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 4, background: "var(--surface2)", borderRadius: 2 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top users */}
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>Top Users This Month</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.topUsersByUsage.slice(0, 6).map((u, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 11, color: "var(--text)" }}>{u.user.email}</span>
                  <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 8 }}>{u.user.plan}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--accent-h)", fontWeight: 600 }}>{fmt(u.requests)}</span>
              </div>
            ))}
            {data.topUsersByUsage.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--muted2)" }}>No usage data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
