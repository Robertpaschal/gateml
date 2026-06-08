"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  subscribeToSystemStatus,
  requestFcmToken,
  onForegroundMessage,
  signOut,
} from "@/lib/firebase";
import { billingApi } from "@/src/lib/api";
import type { BillingMe } from "@/src/lib/api";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/gateml_token=([^;]+)/);
  return match?.[1] ?? localStorage.getItem("gateml_token");
}

const NAV = [
  { href: "/dashboard",          label: "Dashboard",     icon: "dashboard" },
  { href: "/dashboard/gateway",  label: "Gateway",       icon: "gateway" },
  { href: "/dashboard/observe",  label: "Observability", icon: "observe" },
  { href: "/dashboard/prompts",  label: "Prompts",       icon: "prompt" },
  { href: "/dashboard/testing",  label: "Eval Testing",  icon: "test" },
  { href: "/dashboard/replay",   label: "Replay",        icon: "replay" },
  { href: "/dashboard/billing",  label: "Billing",       icon: "billing" },
  { href: "/dashboard/support",  label: "Support",       icon: "support" },
  { href: "/dashboard/account",  label: "Account",       icon: "account" },
];

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
  gateway:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  observe:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  prompt:    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  test:      <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  replay:    <><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></>,
  billing:   <><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  logout:    <><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  support:   <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  account:   <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

interface Toast { id: number; title: string; body: string }

function UsageMeter({ billing }: { billing: BillingMe }) {
  const { requests } = billing.usage;
  const limit = billing.limits.liveRequestsPerMonth;
  const pct   = Math.min((requests / limit) * 100, 100);
  const warn  = pct >= 80;
  const full  = pct >= 100;
  const color = full ? "var(--danger)" : warn ? "var(--warn)" : "var(--accent)";

  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: "var(--muted2)" }}>
          {billing.plan}
          {billing.payAsYouGo && (
            <span style={{ marginLeft: 4, color: "var(--accent2)", fontSize: 9 }}>·PAYG</span>
          )}
        </span>
        <Link href="/dashboard/billing" style={{ fontSize: 9, color: "var(--accent2)", textDecoration: "none" }}>
          {billing.plan === "FREE" ? "Upgrade" : "Manage"}
        </Link>
      </div>
      <div style={{ fontSize: 10, color: warn ? color : "var(--muted2)", marginBottom: 4 }}>
        {requests.toLocaleString()} / {limit.toLocaleString()} requests
        {full && !billing.payAsYouGo && " · quota reached"}
      </div>
      <div style={{ height: 3, background: "var(--border2)", borderRadius: 2 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [email,   setEmail]   = useState("");
  const [userId,  setUserId]  = useState("");
  const [checked, setChecked] = useState(false);
  const [billing, setBilling] = useState<BillingMe | null>(null);
  const [sysStatus, setSysStatus] = useState({ operational: true, message: "All systems operational" });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/auth"); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { email?: string; id?: string }) => {
        setEmail(d.email ?? "");
        setUserId(d.id ?? "");
        setChecked(true);
        // fetch billing info in background
        billingApi.me(token).then(setBilling).catch(() => undefined);
      })
      .catch(() => router.replace("/auth"));
  }, [router]);

  // ── Firestore: live system status ───────────────────────────────────────────
  useEffect(() => {
    return subscribeToSystemStatus(status => setSysStatus(status));
  }, []);

  // ── FCM: register token + handle foreground messages ───────────────────────
  useEffect(() => {
    if (!userId) return;
    const token = getToken();
    if (!token) return;

    // Request notification permission + register FCM token
    requestFcmToken().then(fcmToken => {
      if (!fcmToken) return;
      fetch("/api/notifications/token", {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ fcmToken }),
      }).catch(() => undefined);
    });

    // Handle in-app (foreground) notifications
    const unsub = onForegroundMessage(payload => {
      if (!payload.notification) return;
      const id = ++toastId.current;
      setToasts(prev => [...prev, { id, title: payload.notification!.title ?? "", body: payload.notification!.body ?? "" }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
    });

    return () => { if (typeof unsub === "function") unsub(); };
  }, [userId]);

  const logout = async () => {
    const token = getToken();
    if (token) {
      fetch("/api/notifications/token", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    }
    document.cookie = "gateml_token=; path=/; max-age=0";
    localStorage.removeItem("gateml_token");
    await signOut().catch(() => undefined);
    router.replace("/auth");
  };

  if (!checked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        Loading…
      </div>
    );
  }

  const pageTitle = NAV.find(n => n.href === pathname)?.label ?? "Dashboard";

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo">
          <Link href="/" style={{ textDecoration: "none" }}>
            <div className="logo-mark">GateML</div>
          </Link>
          <div className="logo-sub">AI Infrastructure</div>
        </div>
        <nav className="nav">
          <div className="nav-section">Platform</div>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}>
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          {/* Usage meter */}
          {billing && billing.limits.liveRequestsPerMonth > 0 && (
            <UsageMeter billing={billing} />
          )}

          {/* Live system status from Firestore */}
          <div style={{ marginTop: billing ? 10 : 0, marginBottom: 10, fontSize: 10, color: "var(--muted2)" }}>
            <span className="status-dot" style={{ background: sysStatus.operational ? "var(--accent)" : "var(--warn)" }} />
            {sysStatus.message}
          </div>

          {/* User row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 0",
            borderTop: "1px solid var(--border)",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
              background: "var(--surface2)", border: "1px solid var(--border2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-ui)", fontWeight: 700,
            }}>
              {email ? email[0].toUpperCase() : "?"}
            </div>
            <Link href="/dashboard/account" style={{
              flex: 1, minWidth: 0, textDecoration: "none",
            }}>
              <div style={{ fontSize: 10, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted2)", marginTop: 1 }}>Account settings</div>
            </Link>
            <button onClick={logout} title="Sign out"
              style={{ background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: 4, borderRadius: 4, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted2)")}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {ICONS.logout}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-sub">GateML · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
          <div className="topbar-right" style={{ gap: 12 }}>
            {billing && (
              <Link href="/dashboard/billing" style={{ textDecoration: "none" }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  background: billing.plan === "PRO" ? "rgba(0,255,136,0.1)" : billing.plan === "ENTERPRISE" ? "rgba(0,201,255,0.1)" : "rgba(107,122,150,0.12)",
                  color: billing.plan === "PRO" ? "var(--accent)" : billing.plan === "ENTERPRISE" ? "var(--accent2)" : "var(--muted)",
                  border: `1px solid ${billing.plan === "PRO" ? "rgba(0,255,136,0.3)" : billing.plan === "ENTERPRISE" ? "rgba(0,201,255,0.3)" : "var(--border2)"}`,
                  borderRadius: 5, padding: "3px 9px",
                  fontFamily: "var(--font-ui)", display: "inline-block",
                }}>
                  {billing.plan}
                </span>
              </Link>
            )}
            {billing && !billing.payAsYouGo && billing.plan !== "ENTERPRISE" && (() => {
              const pct = Math.min((billing.usage.requests / billing.limits.liveRequestsPerMonth) * 100, 100);
              if (pct < 80) return null;
              return (
                <Link href="/dashboard/billing" style={{ textDecoration: "none", fontSize: 10, color: pct >= 100 ? "var(--danger)" : "var(--warn)" }}>
                  {pct >= 100 ? "Quota reached" : `${pct.toFixed(0)}% quota used`}
                </Link>
              );
            })()}
          </div>
        </div>
        <div className="content">{children}</div>
      </div>

      {/* In-app toast notifications from FCM */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: "var(--surface2)", border: "1px solid var(--border2)",
            borderRadius: 8, padding: "14px 18px", maxWidth: 320,
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            animation: "fadeIn 0.3s ease",
          }}>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.title}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{t.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
