"use client";
import { useEffect, useState } from "react";
import { getAdminToken }        from "@/lib/auth";

const BASE = "/api/admin/auth";

interface DbDomain  { id: string; domain: string; createdAt: string; source: "db" }
interface EnvDomain { domain: string; source: "env" }
interface DomainsResponse { env: EnvDomain[]; db: DbDomain[] }

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res   = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export default function DomainsPage() {
  const [data,    setData]    = useState<DomainsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [adding,  setAdding]  = useState(false);
  const [addMsg,  setAddMsg]  = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await apiFetch<DomainsResponse>("/domains");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setAddMsg("");
    try {
      await apiFetch("/domains", { method: "POST", body: JSON.stringify({ domain: newDomain }) });
      setAddMsg(`Domain "${newDomain}" added.`);
      setNewDomain("");
      await load();
    } catch (err) {
      setAddMsg(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(domain: string) {
    if (!confirm(`Remove "${domain}" from the allowlist? Existing admins with this domain will keep access until deactivated, but no new accounts can be added.`)) return;
    try {
      await apiFetch(`/domains/${encodeURIComponent(domain)}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Email Domain Allowlist</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Only email addresses from these domains can be invited as admins. Domains are verified via MX records.
        </span>
      </div>

      {error && (
        <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 12, padding: "10px 14px", background: "rgba(248,113,113,.08)", borderRadius: "var(--radius)" }}>
          {error}
        </div>
      )}

      {/* Add domain */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Add Domain (SUPER_ADMIN only)
        </div>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Domain</label>
            <input
              value={newDomain}
              onChange={e => setNewDomain(e.target.value.toLowerCase().trim())}
              placeholder="company.com"
              required pattern="[a-z0-9.-]+"
              style={{ width: "100%" }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding} style={{ whiteSpace: "nowrap" }}>
            {adding ? "Verifying…" : "Add Domain"}
          </button>
        </form>
        {addMsg && (
          <div style={{ marginTop: 10, fontSize: 11, color: addMsg.includes("added") ? "var(--green)" : "var(--red)" }}>
            {addMsg}
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 10, color: "var(--muted)" }}>
          The domain must have valid MX records. After adding, any company member with an email address on this domain can be invited.
        </div>
      </div>

      {/* Env-configured domains */}
      {data?.env && data.env.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Environment-Configured Domains
            </span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(251,191,36,.1)", color: "#fbbf24" }}>
              ADMIN_ALLOWED_DOMAINS
            </span>
          </div>
          {data.env.map(d => (
            <div key={d.domain} style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{d.domain}</span>
                <span style={{ marginLeft: 10, fontSize: 10, color: "var(--muted)" }}>from environment variable</span>
              </div>
              <span style={{ fontSize: 10, color: "var(--muted)", fontStyle: "italic" }}>Remove from .env to disable</span>
            </div>
          ))}
        </div>
      )}

      {/* DB-managed domains */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Admin-Managed Domains ({loading ? "…" : (data?.db.length ?? 0)})
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : data?.db.length === 0 ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>
            No domains added yet. Add your company domain above to allow team members to be invited.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Added</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.db.map(d => (
                <tr key={d.id}>
                  <td>
                    <span style={{ fontWeight: 500, color: "var(--text)" }}>{d.domain}</span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 10, padding: "4px 10px", color: "var(--red)" }}
                      onClick={() => handleRemove(d.domain)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 11, color: "var(--muted)" }}>
        <strong style={{ color: "var(--text)" }}>Security note:</strong> Removing a domain prevents new invitations to that domain but does not automatically revoke access for existing admins. To revoke access for a specific person, deactivate their account from the Admins page.
      </div>
    </div>
  );
}
