"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminAuthApi } from "@/lib/api";
import { setAdminSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await adminAuthApi.login(email, password);
      setAdminSession(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
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
        width: 360, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: 32,
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
            GateML Admin
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Internal control panel</div>
        </div>

        {error && (
          <div style={{
            padding: "10px 12px", marginBottom: 16, borderRadius: "var(--radius)",
            background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.3)",
            color: "var(--red)", fontSize: 12,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@gateml.com" required autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>

          <button
            type="submit" className="btn btn-primary"
            disabled={loading} style={{ marginTop: 8 }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: "10px 12px", background: "var(--surface2)", borderRadius: "var(--radius)", fontSize: 10, color: "var(--muted2)" }}>
          This panel is for internal team use only. Access is logged.
        </div>
      </div>
    </div>
  );
}
