import { NAV } from "./Sidebar";
import type { PageKey } from "./Sidebar";

interface TopbarProps {
  page: PageKey;
  subtitle?: string;
}

export function Topbar({ page, subtitle = "gateml.io · production" }: TopbarProps) {
  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{NAV[page].label}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>
    </div>
  );
}
