"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { clearAdminSession, getAdminRole, getAdminPayload, type AdminRole } from "@/lib/auth";

type NavEntry =
  | { group: string }
  | { href: string; label: string; icon: string; minRole?: AdminRole };

const ROLE_RANK: Record<AdminRole, number> = {
  ANALYST:     0,
  SUPPORT:     1,
  ADMIN:       2,
  SUPER_ADMIN: 3,
};

function canSee(minRole: AdminRole | undefined, currentRole: AdminRole | null): boolean {
  if (!minRole) return true;
  if (!currentRole) return false;
  return ROLE_RANK[currentRole] >= ROLE_RANK[minRole];
}

const NAV: NavEntry[] = [
  { group: "Overview" },
  { href: "/dashboard",              label: "Dashboard",   icon: "◈" },
  { href: "/dashboard/accounting",   label: "Accounting",  icon: "◐", minRole: "ANALYST" },
  { group: "CRM" },
  { href: "/dashboard/users",        label: "Users",       icon: "⊞" },
  { href: "/dashboard/messages",     label: "Support",     icon: "◻", minRole: "SUPPORT" },
  { href: "/dashboard/audit",        label: "Audit Log",   icon: "◫", minRole: "ANALYST" },
  { group: "Billing" },
  { href: "/dashboard/pricing",      label: "Pricing",     icon: "◈", minRole: "ADMIN" },
  { group: "Marketing" },
  { href: "/dashboard/campaigns",    label: "Campaigns",   icon: "◧", minRole: "ADMIN" },
  { href: "/dashboard/promos",       label: "Promo Codes", icon: "◩", minRole: "ADMIN" },
  { group: "System" },
  { href: "/dashboard/changelog",    label: "Changelog",   icon: "◷" },
  { href: "/dashboard/system",       label: "Status",      icon: "◉" },
  { href: "/dashboard/admins",       label: "Admins",      icon: "◑", minRole: "ADMIN" },
  { href: "/dashboard/domains",      label: "Domains",     icon: "◌", minRole: "SUPER_ADMIN" },
];

const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN:       "Admin",
  SUPPORT:     "Support",
  ANALYST:     "Analyst",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const router      = useRouter();
  const currentRole = getAdminRole();
  const payload     = getAdminPayload();

  function logout() {
    clearAdminSession();
    router.push("/login");
  }

  // Filter nav: hide group headings that have no visible children
  const visibleNav = NAV.filter((item, i) => {
    if (!("group" in item)) return canSee(item.minRole, currentRole);
    // Show group if at least one following link is visible
    const children = NAV.slice(i + 1).filter(x => !("group" in x)) as Extract<NavEntry, { href: string }>[];
    const nextGroupIdx = NAV.slice(i + 1).findIndex(x => "group" in x);
    const groupItems   = nextGroupIdx === -1 ? children : children.slice(0, nextGroupIdx);
    return groupItems.some(x => canSee(x.minRole, currentRole));
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: 204, flexShrink: 0, background: "var(--surface)",
        borderRight: "1px solid var(--border)", display: "flex",
        flexDirection: "column", padding: "20px 0",
      }}>
        {/* Logo + identity */}
        <div style={{ padding: "0 16px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>GateML</div>
          <div style={{ fontSize: 9, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
            Admin Console
          </div>
          {payload && (
            <div style={{ marginTop: 10, padding: "6px 8px", background: "var(--surface2)", borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: "var(--text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {payload.email}
              </div>
              <div style={{
                display: "inline-block", marginTop: 3, fontSize: 9,
                color: currentRole === "SUPER_ADMIN" ? "#f59e0b" : currentRole === "ADMIN" ? "#a78bfa" : "#6ee7b7",
                textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
              }}>
                {currentRole ? ROLE_LABEL[currentRole] : ""}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {visibleNav.map((item, i) => {
            if ("group" in item) {
              return (
                <div key={`g-${i}`} style={{
                  fontSize: 9, color: "var(--muted2, #555)", textTransform: "uppercase",
                  letterSpacing: "0.1em", padding: "10px 10px 4px", marginTop: i === 0 ? 0 : 6,
                }}>
                  {item.group}
                </div>
              );
            }
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href} href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "7px 10px", borderRadius: 4, marginBottom: 1,
                  color:      active ? "var(--text)"     : "var(--muted)",
                  background: active ? "var(--surface2)" : "transparent",
                  fontSize: 12, textDecoration: "none", transition: "all 0.1s",
                }}
              >
                <span style={{ fontSize: 13, opacity: active ? 1 : 0.5 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          <button
            onClick={logout} className="btn btn-ghost"
            style={{ width: "100%", fontSize: 11 }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {children}
      </main>
    </div>
  );
}
