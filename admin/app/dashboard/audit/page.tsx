"use client";
import { useEffect, useState, useCallback } from "react";
import { auditApi, type AuditEntry } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

const RESOURCES = ["", "user", "contactMessage", "campaign", "promoCode", "admin", "apiKey"];

export default function AuditPage() {
  const [logs,     setLogs]     = useState<AuditEntry[]>([]);
  const [total,    setTotal]    = useState(0);
  const [pages,    setPages]    = useState(1);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [resource, setResource] = useState("");
  const [action,   setAction]   = useState("");
  const [from,     setFrom]     = useState("");
  const [to,       setTo]       = useState("");

  const token = getAdminToken()!;

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError("");
    try {
      const data = await auditApi.list(token, { resource: resource || undefined, action: action || undefined, page: p, from: from || undefined, to: to || undefined });
      setLogs(data.logs);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [token, resource, action, page, from, to]);

  useEffect(() => { load(1); setPage(1); }, [resource, action, from, to]);
  useEffect(() => { load(page); }, [page]);

  function metaStr(m: unknown): string {
    if (!m) return "—";
    try { return JSON.stringify(m); } catch { return String(m); }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Audit Log</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>{total.toLocaleString()} entries</span>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Resource</label>
            <select value={resource} onChange={e => setResource(e.target.value)} style={{ width: "100%" }}>
              {RESOURCES.map(r => <option key={r} value={r}>{r || "All resources"}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Action (contains)</label>
            <input value={action} onChange={e => setAction(e.target.value)} placeholder="e.g. plan_changed" style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      {error && <div style={{ color: "var(--red)", marginBottom: 12, fontSize: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Resource ID</th>
                <th>Metadata</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No audit entries found</td></tr>
              )}
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td style={{ fontSize: 11 }}>{l.admin?.name ?? l.adminId ?? "system"}</td>
                  <td>
                    <span style={{ fontSize: 10, fontFamily: "monospace", background: "var(--surface2)", padding: "2px 6px", borderRadius: 4, color: "var(--accent)" }}>
                      {l.action}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{l.resource}</td>
                  <td style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted2)" }}>
                    {l.resourceId ? l.resourceId.slice(0, 12) + "…" : "—"}
                  </td>
                  <td style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {metaStr(l.metadata)}
                  </td>
                  <td style={{ fontSize: 10, color: "var(--muted2)" }}>{l.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: 11, color: "var(--muted)", padding: "6px 8px" }}>Page {page} of {pages}</span>
          <button className="btn btn-ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
