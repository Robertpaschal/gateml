import { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GatewayPage } from "./pages/GatewayPage";
import { ObservabilityPage } from "./pages/ObservabilityPage";
import { PromptsPage } from "./pages/PromptsPage";
import { TestingPage } from "./pages/TestingPage";
import { ReplayPage } from "./pages/ReplayPage";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import type { PageKey } from "./components/Sidebar";

const PAGE_COMPONENTS: Record<PageKey, React.ComponentType> = {
  dashboard: DashboardPage,
  gateway:   GatewayPage,
  observe:   ObservabilityPage,
  prompts:   PromptsPage,
  testing:   TestingPage,
  replay:    ReplayPage,
};

function Shell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<PageKey>("dashboard");

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
        Loading…
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const Page = PAGE_COMPONENTS[page];

  return (
    <div className="app">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="main">
        <Topbar page={page} />
        <div className="content">
          <Page key={page} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
