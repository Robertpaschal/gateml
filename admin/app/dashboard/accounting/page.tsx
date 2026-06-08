"use client";
import { useEffect, useState } from "react";
import { accountingApi, type AccountingData } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

export default function AccountingPage() {
  const [data,    setData]    = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const token = getAdminToken()!;

  useEffect(() => {
    accountingApi.get(token)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "var(--muted)", padding: 20 }}>Loading…</div>;
  if (error)   return <div style={{ color: "var(--red)",   padding: 20 }}>{error}</div>;
  if (!data)   return null;

  const managedGrowth = data.managedRevenue.previous > 0
    ? ((data.managedRevenue.current - data.managedRevenue.previous) / data.managedRevenue.previous * 100).toFixed(1)
    : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Accounting</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Revenue, subscriptions, and managed API usage</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Stat label="MRR (subscriptions)" value={`$${data.mrrUsd.toLocaleString()}`} sub="Active Pro subscriptions × $19" />
        <Stat label="Active Subscriptions" value={data.activeSubscriptions.toLocaleString()} sub={`${data.canceledThisMonth} canceled this month`} />
        <Stat label="New Users This Month" value={data.newUsersThisMonth.toLocaleString()} />
        <Stat
          label="Managed Revenue (current)"
          value={`$${data.managedRevenue.current.toFixed(2)}`}
          sub={managedGrowth !== null ? `${managedGrowth}% vs last month ($${data.managedRevenue.previous.toFixed(2)})` : "No prior month data"}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Stat label="Managed Tokens (month)" value={data.managedTokensThisMonth.toLocaleString()} sub="Across all managed-key users" />
        <Stat label="Total Requests (month)" value={data.totalRequestsThisMonth.toLocaleString()} sub="Live requests via gateway" />
      </div>

      {/* Recent subscriptions */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Active Subscriptions (recent 20)
          </span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Subscribed</th>
              <th>Renews</th>
              <th>Member Since</th>
            </tr>
          </thead>
          <tbody>
            {data.recentSubscriptions.map(s => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{s.user.email}</div>
                  {s.user.name && <div style={{ fontSize: 10, color: "var(--muted)" }}>{s.user.name}</div>}
                </td>
                <td><span className="badge badge-purple">{s.user.plan}</span></td>
                <td><span className={`badge ${s.status === "active" ? "badge-green" : "badge-yellow"}`}>{s.status}</span></td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(s.currentPeriodEnd).toLocaleDateString()}</td>
                <td style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(s.user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {data.recentSubscriptions.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No active subscriptions</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
