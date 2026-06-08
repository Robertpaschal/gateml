"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { billingApi } from "../lib/api";
import { useToken }   from "../hooks/useToken";
import type { BillingMe } from "../lib/api";
import Link from "next/link";
import { Check, X } from "lucide-react";

const PRICE_IDS = {
  PRO_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ?? "",
  PRO_ANNUAL:  process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL  ?? "",
};

function pct(used: number, limit: number) {
  if (limit === -1) return 0;
  return Math.min((used / limit) * 100, 100);
}

function fmt(n: number) { return n === -1 ? "Unlimited" : n.toLocaleString(); }

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function BillingPage() {
  const token        = useToken();
  const searchParams = useSearchParams();
  const [data,    setData]    = useState<BillingMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [annual,  setAnnual]  = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [notice,  setNotice]  = useState<string | null>(null);

  useEffect(() => {
    if (searchParams?.get("success") === "1") setNotice("🎉 Your plan has been upgraded. Welcome to Pro!");
    if (searchParams?.get("canceled") === "1") setNotice("Checkout canceled — no changes made.");
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;
    billingApi.me(token).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  const upgrade = async (priceId: string) => {
    if (!token || !priceId || busy) return;
    setBusy(true);
    try {
      const { url } = await billingApi.checkout(token, priceId);
      if (url) window.location.href = url;
    } catch { setBusy(false); }
  };

  const manage = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const { url } = await billingApi.portal(token);
      if (url) window.location.href = url;
    } catch { setBusy(false); }
  };

  const togglePayg = async () => {
    if (!token || !data) return;
    try {
      const { payAsYouGo } = await billingApi.togglePayg(token, !data.payAsYouGo);
      setData(prev => prev ? { ...prev, payAsYouGo } : prev);
    } catch { /* noop */ }
  };

  if (loading) return (
    <div style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", padding: 32 }}>Loading…</div>
  );

  if (!data) return (
    <div style={{ color: "var(--danger)", padding: 32 }}>Failed to load billing info.</div>
  );

  const used  = data.usage.requests;
  const limit = data.limits.liveRequestsPerMonth;
  const bar   = pct(used, limit);
  const warn  = bar >= 80;
  const full  = bar >= 100;
  const barColor = full ? "var(--danger)" : warn ? "var(--warn)" : "var(--accent)";
  const isPro  = data.plan === "PRO";
  const isEnt  = data.plan === "ENTERPRISE";
  const nextReset = new Date(data.nextResetAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const hasManagedUsage = data.useManaged || (data.managedUsage?.tokensUsed ?? 0) > 0;

  return (
    <div className="fade-in" style={{ maxWidth: 720 }}>
      {notice && (
        <div style={{
          marginBottom: 20, padding: "12px 16px",
          background: notice.startsWith("🎉") ? "rgba(0,255,136,0.08)" : "rgba(255,184,0,0.08)",
          border: `1px solid ${notice.startsWith("🎉") ? "rgba(0,255,136,0.25)" : "rgba(255,184,0,0.25)"}`,
          borderRadius: 8, fontSize: 13, color: "var(--text)",
        }}>
          {notice}
        </div>
      )}

      {/* Current plan card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Current plan</div>
            <div className="card-sub">Resets on {nextReset}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {data.useManaged && (
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                background: "rgba(0,201,255,0.12)", color: "var(--accent2)",
                border: "1px solid rgba(0,201,255,0.25)", borderRadius: 4, padding: "2px 7px",
              }}>MANAGED</span>
            )}
            <PlanBadge plan={data.plan} />
          </div>
        </div>

        {/* Request usage meter */}
        {!isEnt && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: warn ? barColor : "var(--muted)" }}>
                {used.toLocaleString()} / {fmt(limit)} live requests this month
              </span>
              <span style={{ color: "var(--muted2)", fontSize: 11 }}>{bar.toFixed(0)}%</span>
            </div>
            <div style={{ height: 6, background: "var(--border2)", borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${bar}%`, background: barColor, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
            {full && !data.payAsYouGo && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--danger)" }}>
                Quota reached — requests will be blocked until you upgrade or enable pay-as-you-go.
              </div>
            )}
          </div>
        )}

        {/* PAYG toggle */}
        {!isEnt && (
          <div style={{
            marginTop: 16, padding: "12px 14px",
            background: "var(--surface2)", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>Pay-as-you-go</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Continue beyond your quota at ${data.limits.paygRateUsd.toFixed(3)}/request
              </div>
            </div>
            <Toggle enabled={data.payAsYouGo} onChange={togglePayg} />
          </div>
        )}

        {/* Subscription status */}
        {data.subscription && (
          <div style={{ marginTop: 12, fontSize: 11, color: "var(--muted)" }}>
            {data.subscription.cancelAtPeriodEnd
              ? `Plan cancels on ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}`
              : `Next billing: ${new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}`}
            {" · "}
            <button onClick={manage} disabled={busy} style={{ background: "none", border: "none", color: "var(--accent2)", cursor: "pointer", fontSize: 11, padding: 0 }}>
              Manage subscription
            </button>
          </div>
        )}
      </div>

      {/* Managed Keys usage card — shown when managed mode is on or there's usage this month */}
      {hasManagedUsage && (
        <div className="card" style={{
          marginBottom: 20,
          borderColor: "rgba(0,201,255,0.3)",
          background: "rgba(0,201,255,0.03)",
        }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                GateML Managed Keys
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  background: "rgba(0,201,255,0.12)", color: "var(--accent2)",
                  border: "1px solid rgba(0,201,255,0.25)", borderRadius: 4, padding: "1px 6px",
                }}>{data.useManaged ? "ACTIVE" : "INACTIVE"}</span>
              </div>
              <div className="card-sub">Token-based billing at provider cost + 20% markup</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 4 }}>Tokens used</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-ui)", color: "var(--accent2)" }}>
                {fmtTokens(data.managedUsage?.tokensUsed ?? 0)}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted2)" }}>this month</div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 4 }}>Accrued cost</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-ui)", color: "var(--text)" }}>
                ${(data.managedUsage?.costUsd ?? 0).toFixed(4)}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted2)" }}>this month</div>
            </div>
            <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: "var(--muted2)", marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: data.useManaged ? "var(--accent2)" : "var(--muted)" }}>
                {data.useManaged ? "Enabled" : "Disabled"}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted2)" }}>
                <Link href="/dashboard/gateway" style={{ color: "var(--accent2)", textDecoration: "none" }}>
                  {data.useManaged ? "Manage in Gateway" : "Enable in Gateway"}
                </Link>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, fontSize: 10, color: "var(--muted2)", lineHeight: 1.6 }}>
            Managed key usage is billed separately from your plan quota. BYOK keys always take priority — managed keys are used only when no provider key is configured for that provider.
          </div>
        </div>
      )}

      {/* Managed mode prompt — shown when managed is off and no usage yet */}
      {!hasManagedUsage && (
        <div style={{
          marginBottom: 20, padding: "14px 16px",
          background: "rgba(0,201,255,0.03)",
          border: "1px solid rgba(0,201,255,0.12)",
          borderRadius: 8, display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--accent2)", marginBottom: 3 }}>GateML Managed Keys</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Skip provider key setup entirely. Enable in Gateway → Provider Keys to route through GateML&apos;s keys at cost + 20% markup.
            </div>
          </div>
          <Link
            href="/dashboard/gateway"
            style={{
              padding: "7px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "rgba(0,201,255,0.1)", color: "var(--accent2)",
              border: "1px solid rgba(0,201,255,0.25)", textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            Enable now
          </Link>
        </div>
      )}

      {/* Upgrade section — hidden for Pro/Enterprise */}
      {!isPro && !isEnt && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">Upgrade to Pro</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
            <span style={{ fontSize: 12, color: annual ? "var(--muted)" : "var(--text)" }}>Monthly</span>
            <button
              onClick={() => setAnnual(v => !v)}
              style={{ width: 38, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: annual ? "var(--accent)" : "var(--surface2)", position: "relative", transition: "background 0.2s" }}
            >
              <span style={{ position: "absolute", top: 2, left: annual ? 19 : 2, width: 16, height: 16, borderRadius: "50%", background: "#000", transition: "left 0.2s" }} />
            </button>
            <span style={{ fontSize: 12, color: annual ? "var(--text)" : "var(--muted)" }}>
              Annual <span style={{ fontSize: 10, color: "var(--accent2)" }}>Save 33%</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 16 }}>
            <span style={{ fontFamily: "var(--font-ui)", fontSize: 32, fontWeight: 800, color: "var(--accent)" }}>
              {annual ? "$12.67" : "$19"}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              / mo{annual ? " · $152 billed annually" : ""}
            </span>
          </div>

          <FeatureList features={[
            ["30,000 live requests / month",        true],
            ["Full observability + cost tracking",   true],
            ["GateML Managed Keys (no setup)",       true],
            ["Prompt versioning",                    true],
            ["Eval testing suite",                   true],
            ["Fallback chain configuration",         true],
            ["Up to 5 API key pairs",                true],
            ["90-day log retention",                 true],
            ["Pay-as-you-go overages",               true],
            ["Email support",                        true],
          ]} />

          <button
            onClick={() => upgrade(annual ? PRICE_IDS.PRO_ANNUAL : PRICE_IDS.PRO_MONTHLY)}
            disabled={busy}
            style={{
              marginTop: 20, padding: "10px 24px", borderRadius: 6,
              background: "var(--accent)", color: "#000", border: "none",
              fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 13,
              cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Redirecting…" : "Upgrade to Pro"}
          </button>
          <p style={{ fontSize: 10, color: "var(--muted2)", marginTop: 8 }}>
            7-day free trial · cancel anytime · secured by Stripe
          </p>
        </div>
      )}

      {/* Plan comparison */}
      <div className="card">
        <div className="card-header"><div className="card-title">Plan comparison</div></div>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Starter</th>
              <th>Pro</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Live requests / month",       "1,000",      "30,000"],
              ["Test requests",               "Unlimited",  "Unlimited"],
              ["GateML Managed Keys",         "✓",          "✓"],
              ["API key pairs",               "1",          "5"],
              ["Log retention",               "7 days",     "90 days"],
              ["Prompts",                     "1",          "Unlimited"],
              ["Prompt versioning",           "✗",          "✓"],
              ["Fallback chain",              "✗",          "✓"],
              ["Eval testing",                "✗",          "✓"],
              ["Pay-as-you-go",               "$0.002/req", "$0.001/req"],
            ].map(([label, free, pro]) => (
              <tr key={label}>
                <td>{label}</td>
                <td>{planCell(free, "free")}</td>
                <td>{planCell(pro,  "pro")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, [string, string]> = {
    FREE:       ["rgba(107,122,150,0.15)", "var(--muted)"],
    PRO:        ["rgba(0,255,136,0.1)",    "var(--accent)"],
    ENTERPRISE: ["rgba(0,201,255,0.1)",    "var(--accent2)"],
  };
  const [bg, fg] = colors[plan] ?? colors.FREE;
  return (
    <span style={{
      background: bg, color: fg, border: `1px solid ${fg}`,
      borderRadius: 6, padding: "3px 10px",
      fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 11, letterSpacing: 0.5,
    }}>
      {plan}
    </span>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
        background: enabled ? "var(--accent)" : "var(--border2)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: enabled ? 20 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#000",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

function planCell(value: string, col: "free" | "pro") {
  if (value === "✓") return <Check size={13} color={col === "pro" ? "var(--accent)" : "var(--accent2)"} strokeWidth={2.5} />;
  if (value === "✗") return <X size={13} color="var(--muted2)" strokeWidth={2} />;
  return <span style={{ color: col === "pro" ? "var(--accent)" : "var(--text)" }}>{value}</span>;
}

function FeatureList({ features }: { features: [string, boolean][] }) {
  return (
    <ul style={{ listStyle: "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
      {features.map(([label, included]) => (
        <li key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: included ? "var(--muted)" : "var(--muted2)" }}>
          {included
            ? <Check size={12} color="var(--accent)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
            : <X size={12} color="var(--muted2)" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
          {label}
        </li>
      ))}
    </ul>
  );
}
