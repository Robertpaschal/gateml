"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { clearAdminSession } from "@/lib/auth";

const NAV = [
  { group: "Overview" },
  { href: "/dashboard",              label: "Dashboard",    icon: "◈" },
  { href: "/dashboard/accounting",   label: "Accounting",   icon: "◐" },
  { group: "CRM" },
  { href: "/dashboard/users",        label: "Users",        icon: "⊞" },
  { href: "/dashboard/messages",     label: "Support",      icon: "◻" },
  { href: "/dashboard/audit",        label: "Audit Log",    icon: "◫" },
  { group: "Marketing" },
  { href: "/dashboard/campaigns",    label: "Campaigns",    icon: "◧" },
  { href: "/dashboard/promos",       label: "Promo Codes",  icon: "◩" },
  { group: "System" },
  { href: "/dashboard/changelog",    label: "Changelog",    icon: "◷" },
  { href: "/dashboard/system",       label: "Status",       icon: "◉" },
  { href: "/dashboard/admins",       label: "Admins",       icon: "◑" },
] as const;

type NavItem = { group: string } | { href: string; label: string; icon: string };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();

  function logout() {
    clearAdminSession();
    router.push("/login");
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: 200, flexShrink: 0, background: "var(--surface)",
        borderRight: "1px solid var(--border)", display: "flex",
        flexDirection: "column", padding: "20px 0",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>GateML</div>
          <div style={{ fontSize: 9, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>
            Admin Console
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {(NAV as readonly NavItem[]).map((item, i) => {
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
