"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { adminUsersApi, type AdminUserRow } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

const PLANS = ["", "FREE", "PRO", "ENTERPRISE"];

function planBadge(plan: string) {
  const cls = plan === "PRO" ? "badge-purple" : plan === "ENTERPRISE" ? "badge-green" : "badge-muted";
  return <span className={`badge ${cls}`}>{plan}</span>;
}

function subBadge(status?: string) {
  if (!status) return <span className="badge badge-muted">–</span>;
  const cls = status === "active" ? "badge-green" : status === "past_due" ? "badge-yellow" : "badge-red";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function UsersPage() {
  const router = useRouter();
  const [data,    setData]    = useState<{ users: AdminUserRow[]; total: number; pages: number } | null>(null);
  const [search,  setSearch]  = useState("");
  const [page,    setPage]    = useState(1);
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback((q: string, p: number) => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    adminUsersApi.list(token, q || undefined, p)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(query, page); }, [query, page, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
    setPage(1);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Users{data ? ` (${data.total})` : ""}</h1>
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search email or name…" style={{ maxWidth: 320 }}
        />
        <button type="submit" className="btn btn-ghost">Search</button>
        {query && (
          <button type="button" className="btn btn-ghost" onClick={() => { setSearch(""); setQuery(""); setPage(1); }}>
            Clear
          </button>
        )}
      </form>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Plan</th>
              <th>Subscription</th>
              <th>Requests</th>
              <th>Usage / Mo</th>
              <th>Provider</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Loading…</td></tr>
            )}
            {!loading && data?.users.map(u => (
              <tr key={u.id} onClick={() => router.push(`/dashboard/users/${u.id}`)}>
                <td>
                  <div style={{ fontWeight: 500 }}>{u.email}</div>
                  {u.name && <div style={{ fontSize: 10, color: "var(--muted)" }}>{u.name}</div>}
                </td>
                <td>{planBadge(u.plan)}</td>
                <td>{subBadge(u.subscription?.status)}</td>
                <td style={{ color: "var(--muted)" }}>{u._count.requestLogs.toLocaleString()}</td>
                <td style={{ color: "var(--accent-h)", fontWeight: 600 }}>{u.usageThisMonth.toLocaleString()}</td>
                <td style={{ color: "var(--muted)", textTransform: "capitalize" }}>{u.provider}</td>
                <td style={{ color: "var(--muted)" }}>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && data?.users.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted2)", padding: 24 }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: "8px 12px", fontSize: 11, color: "var(--muted)" }}>{page} / {data.pages}</span>
          <button className="btn btn-ghost" disabled={page === data.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
