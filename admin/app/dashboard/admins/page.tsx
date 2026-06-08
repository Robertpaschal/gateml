"use client";
import { useEffect, useState }    from "react";
import { getAdminToken, hasRole } from "@/lib/auth";

const BASE = "/api/admin/auth";

interface AdminRow {
  id:             string;
  email:          string;
  name:           string;
  role:           string;
  isActive:       boolean;
  lastLoginAt:    string | null;
  createdAt:      string;
  passwordHash?:  string | null;
  invitedByAdmin: { email: string; name: string } | null;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
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

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Admin",
  SUPPORT:     "Support",
  ANALYST:     "Analyst",
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: "badge-yellow",
  ADMIN:       "badge-purple",
  SUPPORT:     "badge-green",
  ANALYST:     "badge-blue",
};

export default function AdminsPage() {
  const [admins,     setAdmins]     = useState<AdminRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [inviting,   setInviting]   = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "SUPPORT" });
  const [inviteMsg,  setInviteMsg]  = useState("");

  const isSuperAdmin = hasRole("SUPER_ADMIN");
  const isAdmin      = hasRole("SUPER_ADMIN", "ADMIN");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await api<AdminRow[]>("/admins");
      setAdmins(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admins");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true); setInviteMsg("");
    try {
      await api("/invite", { method: "POST", body: JSON.stringify(inviteForm) });
      setInviteMsg(`Invite sent to ${inviteForm.email}`);
      setInviteForm({ email: "", name: "", role: "SUPPORT" });
      await load();
    } catch (e) {
      setInviteMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setInviting(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    const label = isActive ? "Deactivate" : "Reactivate";
    if (!confirm(`${label} this admin?${isActive ? " All active sessions will be invalidated immediately." : ""}`)) return;
    try {
      await api(`/admins/${id}/${isActive ? "deactivate" : "reactivate"}`, { method: "PATCH" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  async function handleChangeRole(id: string, currentRole: string) {
    const newRole = prompt(
      `Change role.\nCurrent: ${currentRole}\nEnter new role (SUPER_ADMIN, ADMIN, SUPPORT, ANALYST):`,
      currentRole,
    )?.trim().toUpperCase();
    if (!newRole || newRole === currentRole) return;
    if (!["SUPER_ADMIN", "ADMIN", "SUPPORT", "ANALYST"].includes(newRole)) {
      setError(`Invalid role: ${newRole}`);
      return;
    }
    try {
      await api(`/admins/${id}/role`, { method: "PATCH", body: JSON.stringify({ role: newRole }) });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to change role"); }
  }

  async function handleResendInvite(id: string) {
    if (!confirm("Resend invite email?")) return;
    try {
      await api(`/admins/${id}/resend-invite`, { method: "POST" });
    } catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
  }

  const pending = admins.filter(a => !a.passwordHash);
  const active  = admins.filter(a =>  a.passwordHash);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Admin Users</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          All admins must use an approved company email domain. Deactivating an admin immediately invalidates their sessions.
        </span>
      </div>

      {error && (
        <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 12, padding: "10px 14px", background: "rgba(248,113,113,.08)", borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button style={{ fontSize: 10, cursor: "pointer", background: "none", border: "none", color: "var(--muted)" }} onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* Invite form */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Invite Team Member
          </div>
          <form onSubmit={handleInvite}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Company Email</label>
                <input type="email" value={inviteForm.email}
                  onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="colleague@company.com" required style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Full Name</label>
                <input value={inviteForm.name}
                  onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Full Name" required style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Role</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))} style={{ width: "100%" }}>
                  <option value="SUPPORT">Support</option>
                  <option value="ANALYST">Analyst</option>
                  {isSuperAdmin && <option value="ADMIN">Admin</option>}
                  {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" className="btn btn-primary" disabled={inviting}>
                {inviting ? "Sending invite…" : "Send Invite"}
              </button>
              {inviteMsg && (
                <span style={{ fontSize: 11, color: inviteMsg.includes("sent") ? "var(--green)" : "var(--red)" }}>
                  {inviteMsg}
                </span>
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--muted)" }}>
              Email domain must be on the {isSuperAdmin
                ? <a href="/dashboard/domains" style={{ color: "var(--accent)" }}>domain allowlist</a>
                : "domain allowlist (managed by Super Admin)"}.
            </div>
          </form>
        </div>
      )}

      {/* Pending invites */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Pending Invites ({pending.length})
            </span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(251,191,36,.1)", color: "#fbbf24" }}>
              Not yet accepted
            </span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Name / Email</th><th>Role</th><th>Invited By</th><th>Sent</th>
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {pending.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{a.email}</div>
                  </td>
                  <td><span className={`badge ${ROLE_BADGE[a.role] ?? "badge-green"}`}>{ROLE_LABELS[a.role] ?? a.role}</span></td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{a.invitedByAdmin?.name ?? "System"}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: "4px 10px" }}
                        onClick={() => handleResendInvite(a.id)}>
                        Resend Invite
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Active admins */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Team Members ({active.length})
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name / Email</th><th>Role</th><th>Status</th>
                <th>Last Login</th><th>Invited By</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{a.email}</div>
                  </td>
                  <td><span className={`badge ${ROLE_BADGE[a.role] ?? "badge-green"}`}>{ROLE_LABELS[a.role] ?? a.role}</span></td>
                  <td><span className={`badge ${a.isActive ? "badge-green" : "badge-red"}`}>{a.isActive ? "Active" : "Deactivated"}</span></td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleDateString() : "Never"}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{a.invitedByAdmin?.name ?? "System"}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {isAdmin && (
                        <button
                          className={`btn ${a.isActive ? "btn-ghost" : "btn-primary"}`}
                          style={{ fontSize: 10, padding: "4px 10px" }}
                          onClick={() => handleToggle(a.id, a.isActive)}>
                          {a.isActive ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                      {isSuperAdmin && (
                        <button className="btn btn-ghost" style={{ fontSize: 10, padding: "4px 10px" }}
                          onClick={() => handleChangeRole(a.id, a.role)}>
                          Change Role
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

      <div style={{ marginTop: 16, fontSize: 10, color: "var(--muted)", lineHeight: 1.7 }}>
        <strong style={{ color: "var(--text)" }}>Role permissions — </strong>
        <strong>Super Admin:</strong> full control, manage domains, change roles &nbsp;|&nbsp;
        <strong>Admin:</strong> invite/manage Support & Analyst, run campaigns & promos &nbsp;|&nbsp;
        <strong>Support:</strong> users, messages, CRM notes, send emails &nbsp;|&nbsp;
        <strong>Analyst:</strong> read-only access to analytics, accounting, audit
      </div>
    </div>
  );
}
