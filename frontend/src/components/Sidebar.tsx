import { Icon } from "./Icons";
import { useAuth } from "../hooks/useAuth";

export type PageKey =
  | "dashboard"
  | "gateway"
  | "observe"
  | "prompts"
  | "testing"
  | "replay";

interface NavItem {
  label: string;
  icon: Parameters<typeof Icon>[0]["name"];
  badge?: string;
}

const NAV: Record<PageKey, NavItem> = {
  dashboard: { label: "Dashboard",     icon: "dashboard" },
  gateway:   { label: "Gateway",       icon: "gateway" },
  observe:   { label: "Observability", icon: "observe" },
  prompts:   { label: "Prompts",       icon: "prompt" },
  testing:   { label: "Eval Testing",  icon: "test", badge: "" },
  replay:    { label: "Replay",        icon: "replay" },
};

interface SidebarProps {
  page: PageKey;
  onNavigate: (p: PageKey) => void;
}

export function Sidebar({ page, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-mark">GateML</div>
        <div className="logo-sub">AI Infrastructure</div>
      </div>

      <nav className="nav">
        <div className="nav-section">Platform</div>
        {(Object.entries(NAV) as [PageKey, NavItem][]).map(([key, item]) => (
          <div
            key={key}
            className={`nav-item ${page === key ? "active" : ""}`}
            onClick={() => onNavigate(key)}
          >
            <Icon name={item.icon} size={13} />
            {item.label}
            {item.badge !== undefined && item.badge && (
              <span className="badge">{item.badge}</span>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>
          <span className="status-dot" />
          All systems operational
        </div>
        <div style={{ marginTop: 6, color: "var(--muted2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email}
          </span>
          <button
            onClick={logout}
            style={{ background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: "2px" }}
            title="Sign out"
          >
            <Icon name="logout" size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export { NAV };
