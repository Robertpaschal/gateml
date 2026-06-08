"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useToken } from "../hooks/useToken";
import { billingApi } from "../lib/api";
import type { BillingMe } from "../lib/api";

interface Me {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  provider: string;
  emailVerified: boolean;
  createdAt: string;
  plan: string;
}

function providerLabel(p: string): string {
  if (p === "google")   return "Google";
  if (p === "github")   return "GitHub";
  if (p === "apple")    return "Apple";
  if (p === "local")    return "Email / password";
  return p;
}

export function AccountPage() {
  const token = useToken();
  const [me,      setMe]      = useState<Me | null>(null);
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json() as Promise<Me>),
      billingApi.me(token),
    ]).then(([m, b]) => {
      setMe(m);
      setBilling(b);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const copyId = () => {
    if (!me) return;
    navigator.clipboard.writeText(me.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div style={{ color: "var(--muted)", padding: 32 }}>Loading…</div>
  );

  if (!me) return (
    <div style={{ color: "var(--danger)", padding: 32 }}>Failed to load account info.</div>
  );

  const joinDate = new Date(me.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const initials = (me.name ?? me.email).slice(0, 2).toUpperCase();

  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>

      {/* Profile card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ marginBottom: 20 }}>
          <div className="card-title">Profile</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          {me.avatarUrl ? (
            <img src={me.avatarUrl} alt="Avatar" style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid var(--border2)" }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "var(--surface2)", border: "2px solid var(--border2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 18, color: "var(--accent)",
            }}>
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
              {me.name ?? me.email.split("@")[0]}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{me.email}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email" value={me.email} />
          <Field label="Sign-in method" value={providerLabel(me.provider)} />
          <Field label="Member since" value={joinDate} />
          <Field label="Email verified" value={me.emailVerified ? "Yes" : "No"} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="form-label" style={{ marginBottom: 6 }}>User ID</div>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#070809", borderRadius: 4, padding: "9px 12px",
            border: "1px solid var(--border)",
          }}>
            <code style={{ flex: 1, fontSize: 10, color: "var(--muted)", wordBreak: "break-all" }}>{me.id}</code>
            <button
              onClick={copyId}
              className="btn btn-ghost"
              style={{ padding: "3px 8px", fontSize: 10, flexShrink: 0 }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted2)", marginTop: 4 }}>
            Used to scope Firestore rules and API ownership.
          </div>
        </div>
      </div>

      {/* Plan summary */}
      {billing && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Plan &amp; Usage</div>
            <Link href="/dashboard/billing" className="btn btn-ghost" style={{ fontSize: 10 }}>
              Manage →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <MiniStat label="Current plan" value={billing.plan} color={billing.plan === "PRO" ? "var(--accent)" : billing.plan === "ENTERPRISE" ? "var(--accent2)" : "var(--muted)"} />
            <MiniStat label="Requests this month" value={billing.usage.requests.toLocaleString()} />
            <MiniStat label="Monthly limit" value={billing.limits.liveRequestsPerMonth === -1 ? "Unlimited" : billing.limits.liveRequestsPerMonth.toLocaleString()} />
          </div>
          {billing.plan === "FREE" && (
            <div style={{ marginTop: 14 }}>
              <Link href="/dashboard/billing" className="btn btn-primary" style={{ fontSize: 11 }}>
                Upgrade to Pro →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><div className="card-title">Quick access</div></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
          {[
            { href: "/dashboard/gateway",  label: "API Keys & Gateway",       sub: "Create keys, set up providers and routing" },
            { href: "/dashboard/billing",  label: "Billing & Subscription",   sub: "Manage your plan, PAYG, and Managed Keys" },
            { href: "/dashboard/support",  label: "Support",                  sub: "Get help or report an issue" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: "flex", flexDirection: "column", textDecoration: "none",
              padding: "10px 12px", borderRadius: 6,
              border: "1px solid var(--border)", marginBottom: 4,
              transition: "background 0.15s, border-color 0.15s",
            }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{item.sub}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ borderColor: "rgba(255,59,92,0.2)" }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ color: "var(--danger)" }}>Danger zone</div>
            <div className="card-sub">These actions are permanent and cannot be undone.</div>
          </div>
        </div>
        <div style={{
          marginTop: 12, padding: "12px 14px", borderRadius: 6,
          background: "rgba(255,59,92,0.04)", border: "1px solid rgba(255,59,92,0.15)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Delete account</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Permanently removes your account, all API keys, logs, and data. Contact support to initiate.
            </div>
          </div>
          <Link href="/dashboard/support" className="btn btn-danger" style={{ flexShrink: 0 }}>
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text)" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: "var(--muted2)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 18, fontWeight: 700, color: color ?? "var(--text)" }}>{value}</div>
    </div>
  );
}

export default AccountPage;
