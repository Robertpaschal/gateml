"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter }    from "next/navigation";
import { setAdminSession }               from "@/lib/auth";

const BASE = "/api/admin/auth";

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(b.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface InviteInfo { email: string; name: string; role: string }

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Admin",
  SUPPORT:     "Support",
  ANALYST:     "Analyst",
};

function AcceptInviteForm() {
  const params  = useSearchParams();
  const router  = useRouter();
  const token   = params.get("token") ?? "";

  const [info,     setInfo]     = useState<InviteInfo | null>(null);
  const [loadErr,  setLoadErr]  = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!token) { setLoadErr("No invitation token found in the URL."); return; }
    apiFetch<InviteInfo>(`/invite/${token}`)
      .then(setInfo)
      .catch(e => setLoadErr(e instanceof Error ? e.message : "Invalid invitation link."));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 12) { setError("Password must be at least 12 characters."); return; }

    setLoading(true);
    try {
      const { token: jwt } = await apiFetch<{ token: string }>(
        "/accept-invite",
        { method: "POST", body: JSON.stringify({ token, password }) },
      );
      setAdminSession(jwt);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        width: 400, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: 32,
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>GateML Admin</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Activate your account</div>
        </div>

        {loadErr ? (
          <div style={{ padding: "14px 16px", borderRadius: "var(--radius)", background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)", color: "var(--red)", fontSize: 13 }}>
            {loadErr}
            <div style={{ marginTop: 12 }}><a href="/login" style={{ color: "var(--accent)", fontSize: 12 }}>Go to login</a></div>
          </div>
        ) : !info ? (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Loading invitation…</div>
        ) : (
          <>
            <div style={{ padding: "12px 14px", borderRadius: "var(--radius)", background: "var(--surface2)", marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Invited as</div>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{info.name}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{info.email}</div>
              <div style={{ marginTop: 6, display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "rgba(124,58,237,.2)", color: "#a78bfa" }}>
                {ROLE_LABELS[info.role] ?? info.role}
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 12px", marginBottom: 14, borderRadius: "var(--radius)", background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.3)", color: "var(--red)", fontSize: 12 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 12 characters" required autoFocus />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? "Activating…" : "Activate Account"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", color: "var(--muted)", fontSize: 13 }}>
        Loading…
      </div>
    }>
      <AcceptInviteForm />
    </Suspense>
  );
}
