"use client";
import { useEffect, useState } from "react";
import { campaignsApi, type Campaign } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

const TARGETS = ["ALL", "FREE", "PRO", "ENTERPRISE"];
const STATUS_BADGE: Record<string, string> = {
  DRAFT:     "badge-muted",
  SCHEDULED: "badge-yellow",
  SENDING:   "badge-purple",
  SENT:      "badge-green",
  FAILED:    "badge-red",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [creating,  setCreating]  = useState(false);
  const [sending,   setSending]   = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", subject: "", body: "", target: "ALL",
  });

  const token = getAdminToken()!;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await campaignsApi.list(token);
      setCampaigns(data.campaigns);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await campaignsApi.create(token, { ...form });
      setForm({ title: "", subject: "", body: "", target: "ALL" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  }

  async function handleSend(id: string) {
    if (!confirm("Send this campaign now to all matching users?")) return;
    setSending(id);
    try {
      const result = await campaignsApi.send(token, id);
      alert(`Queued ${result.queued} emails.`);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send campaign");
    } finally {
      setSending(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this campaign?")) return;
    try {
      await campaignsApi.delete(token, id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete campaign");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Campaigns</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Newsletter & marketing email campaigns</span>
      </div>

      {error && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 12 }}>{error}</div>}

      {/* Create form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          New Campaign
        </div>
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Title (internal)</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Q3 Feature Announcement" required style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Audience</label>
              <select value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))} style={{ width: "100%" }}>
                {TARGETS.map(t => <option key={t} value={t}>{t === "ALL" ? "All users" : `${t} plan only`}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Email Subject</label>
            <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="Exciting news from GateML" required style={{ width: "100%" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Body (HTML supported)</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              placeholder="<p>Hello there,</p><p>We have exciting news...</p>" required
              rows={6} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Creating…" : "Create Campaign"}
          </button>
        </form>
      </div>

      {/* Campaign list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            All Campaigns ({campaigns.length})
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Subject</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Sent</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No campaigns yet</td></tr>
              )}
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.title}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</td>
                  <td><span className="badge badge-purple">{c.target}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[c.status] ?? "badge-muted"}`}>{c.status}</span></td>
                  <td style={{ color: "var(--muted)", fontSize: 11 }}>
                    {c.sentCount > 0 ? `${c.sentCount.toLocaleString()}${c.failedCount > 0 ? ` (${c.failedCount} failed)` : ""}` : "—"}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 11 }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {(c.status === "DRAFT" || c.status === "SCHEDULED") && (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 10, padding: "4px 10px" }}
                          onClick={() => handleSend(c.id)}
                          disabled={sending === c.id}
                        >
                          {sending === c.id ? "Sending…" : "Send Now"}
                        </button>
                      )}
                      {c.status !== "SENDING" && (
                        <button className="btn btn-ghost" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleDelete(c.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
