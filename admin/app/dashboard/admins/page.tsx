"use client";
import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth";

const BASE = "/api/admin/auth";

interface AdminRow {
  id: string; email: string; name: string; role: string;
  isActive: boolean; lastLoginAt: string | null; createdAt: string;
  invitedByAdmin: { email: string; name: string } | null;
}

async function api<T>(path: string, init: RequestInit = {}, fullPath = false): Promise<T> {
  const token = getAdminToken();
  const url   = fullPath ? `/api${path}` : `${BASE}${path}`;
  const res = await fetch(url, {
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

export default function AdminsPage() {
  const [admins,   setAdmins]   = useState<AdminRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "SUPPORT" });
  const [inviteMsg,  setInviteMsg]  = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api<AdminRow[]>("/admins");
      setAdmins(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setInviteMsg("");
    try {
      await api("/invite", {
        method: "POST",
        body: JSON.stringify(inviteForm),
      });
      setInviteMsg(`Invite sent to ${inviteForm.email}`);
      setInviteForm({ email: "", name: "", role: "SUPPORT" });
      await load();
    } catch (e: unknown) {
      setInviteMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setInviting(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    const action = isActive ? "deactivate" : "reactivate";
    if (!confirm(`${isActive ? "Deactivate" : "Reactivate"} this admin? ${isActive ? "Their existing sessions will be invalidated immediately." : ""}`)) return;
    try {
      await api(`/admins/${id}/${action}`, { method: "PATCH" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Users</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          All admins must use company email domains. Deactivating an admin immediately invalidates their sessions.
        </span>
      </div>

      {error && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 12 }}>{error}</div>}

      {/* Invite form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Invite Admin (SUPER_ADMIN only)
        </div>
        <form onSubmit={handleInvite}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Email</label>
              <input type="email" value={inviteForm.email}
                onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                placeholder="new-admin@company.com" required style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Name</label>
              <input value={inviteForm.name}
                onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Full Name" required style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Role</label>
              <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))} style={{ width: "100%" }}>
                <option value="SUPPORT">Support</option>
                <option value="ANALYST">Analyst</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={inviting}>
            {inviting ? "Sending invite…" : "Send Invite"}
          </button>
          {inviteMsg && (
            <span style={{ marginLeft: 12, fontSize: 11, color: inviteMsg.startsWith("Invite sent") ? "var(--green)" : "var(--red)" }}>
              {inviteMsg}
            </span>
          )}
        </form>
      </div>

      {/* Admin list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            All Admins ({admins.length})
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Invited By</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{a.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${a.role === "SUPER_ADMIN" ? "badge-yellow" : a.role === "ANALYST" ? "badge-purple" : "badge-green"}`}>
                      {a.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${a.isActive ? "badge-green" : "badge-red"}`}>
                      {a.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {a.invitedByAdmin?.name ?? "System"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className={`btn ${a.isActive ? "btn-ghost" : "btn-primary"}`}
                      style={{ fontSize: 10, padding: "4px 10px" }}
                      onClick={() => handleToggle(a.id, a.isActive)}
                    >
                      {a.isActive ? "Deactivate" : "Reactivate"}
                    </button>
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
