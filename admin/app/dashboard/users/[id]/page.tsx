"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminUsersApi, type AdminUserDetail } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

const PLANS = ["FREE", "PRO", "ENTERPRISE"];

export default function UserDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [data,    setData]    = useState<AdminUserDetail | null>(null);
  const [plan,    setPlan]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token || !id) return;
    adminUsersApi.get(token, id)
      .then(d => { setData(d); setPlan(d.user.plan); })
      .catch(e => setError(e.message));
  }, [id]);

  async function savePlan() {
    const token = getAdminToken();
    if (!token || !data) return;
    setSaving(true);
    setMessage("");
    try {
      await adminUsersApi.updatePlan(token, id, plan);
      setMessage(`Plan updated to ${plan}`);
      setData(prev => prev ? { ...prev, user: { ...prev.user, plan } } : prev);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div style={{ color: "var(--red)" }}>{error}</div>;
  if (!data)  return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  const { user, logs, usageThisMonth } = data;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => router.push("/dashboard/users")} style={{ fontSize: 11 }}>
            ← Users
          </button>
          <h1 className="page-title">{user.email}</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* User info */}
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>Account</div>
          <Row label="Email"    value={user.email} />
          <Row label="Name"     value={user.name ?? "—"} />
          <Row label="Provider" value={user.provider} />
          <Row label="Joined"   value={new Date(user.createdAt).toLocaleDateString()} />
          <Row label="Requests" value={`${user._count.requestLogs.toLocaleString()} total`} />
          <Row label="Prompts"  value={user._count.prompts.toString()} />
          <Row label="Pay-as-you-go" value={user.payAsYouGo ? "enabled" : "disabled"} />
        </div>

        {/* Usage */}
        <div className="card">
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>Usage</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{usageThisMonth.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>requests this month</div>
          {user.usageRecords.map(r => (
            <div key={r.month} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{r.month}</span>
              <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 600 }}>{r.requests.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan override */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>Plan Override</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select value={plan} onChange={e => setPlan(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary" disabled={saving || plan === user.plan} onClick={savePlan}>
            {saving ? "Saving…" : "Update Plan"}
          </button>
          {message && <span style={{ fontSize: 11, color: message.startsWith("Plan updated") ? "var(--green)" : "var(--red)" }}>{message}</span>}
        </div>
        {user.subscription && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
            Stripe subscription: <strong style={{ color: "var(--text)" }}>{user.subscription.status}</strong>
            {" "}— expires {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* API keys */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            API Keys ({user.apiKeys.length})
          </span>
        </div>
        <table className="table">
          <thead><tr><th>Name</th><th>Type</th><th>Prefix</th><th>Created</th><th>Last Used</th></tr></thead>
          <tbody>
            {user.apiKeys.map(k => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td><span className={`badge ${k.type === "LIVE" ? "badge-purple" : "badge-muted"}`}>{k.type}</span></td>
                <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>{k.keyPrefix}…</td>
                <td style={{ color: "var(--muted)" }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td style={{ color: "var(--muted)" }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent logs */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Recent Requests (last 20)
          </span>
        </div>
        <table className="table">
          <thead><tr><th>Model</th><th>Status</th><th>Latency</th><th>Cost</th><th>Test</th><th>When</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ fontSize: 11 }}>{l.model}</td>
                <td>
                  <span className={`badge ${l.status < 400 ? "badge-green" : "badge-red"}`}>{l.status}</span>
                </td>
                <td style={{ color: "var(--muted)" }}>{l.latencyMs}ms</td>
                <td style={{ color: "var(--muted)" }}>${l.costUsd.toFixed(4)}</td>
                <td>{l.isTestMode ? <span className="badge badge-muted">test</span> : "—"}</td>
                <td style={{ color: "var(--muted)", fontSize: 11 }}>{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No requests yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text)" }}>{value}</span>
    </div>
  );
}
