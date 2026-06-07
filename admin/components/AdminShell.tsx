"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { clearAdminSession } from "@/lib/auth";

const NAV = [
  { href: "/dashboard",           label: "Overview",   icon: "◈" },
  { href: "/dashboard/users",     label: "Users",      icon: "⊞" },
  { href: "/dashboard/messages",  label: "Messages",   icon: "◻" },
  { href: "/dashboard/changelog", label: "Changelog",  icon: "◷" },
  { href: "/dashboard/system",    label: "Status",     icon: "◉" },
];

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
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href} href={href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 4, marginBottom: 2,
                  color:      active ? "var(--text)"   : "var(--muted)",
                  background: active ? "var(--surface2)" : "transparent",
                  fontSize: 12, textDecoration: "none", transition: "all 0.1s",
                }}
              >
                <span style={{ fontSize: 14, opacity: active ? 1 : 0.6 }}>{icon}</span>
                {label}
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
