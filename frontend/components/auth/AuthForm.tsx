"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithGoogle, signInWithGithub, signInWithApple } from "@/lib/firebase";

const API = "/api";

async function exchangeFirebaseToken(idToken: string): Promise<{ token: string; user: { id: string; email: string } }> {
  const res  = await fetch(`${API}/auth/firebase`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ idToken }),
  });
  const data = await res.json() as { token?: string; message?: string };
  if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
  return data as { token: string; user: { id: string; email: string } };
}

function setSession(token: string) {
  document.cookie = `gateml_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
  localStorage.setItem("gateml_token", token);
}

// ── Social sign-in button ─────────────────────────────────────────────────────

function SocialButton({
  icon, label, onClick, loading,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", marginBottom: 10,
        background: "var(--surface2)", border: "1px solid var(--border)",
        borderRadius: 4, cursor: loading ? "not-allowed" : "pointer",
        color: "var(--text)", fontSize: 13, fontFamily: "var(--font-mono)",
        opacity: loading ? 0.5 : 1, transition: "border-color 0.15s",
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--muted)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
    >
      {icon}
      <span>Continue with {label}</span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuthForm() {
  const router  = useRouter();
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const handleProvider = async (
    provider: "google" | "github" | "apple",
    signIn: () => Promise<string>,
  ) => {
    setError("");
    setLoading(provider);
    try {
      const idToken  = await signIn();
      const { token } = await exchangeFirebaseToken(idToken);
      setSession(token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link href="/" style={{ textDecoration: "none" }}>
          <div className="auth-logo">GateML</div>
        </Link>
        <div className="auth-tagline">
          One key. All LLMs. Automatic fallback.
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div style={{ marginBottom: 24 }}>
          <SocialButton
            icon={<GoogleIcon />} label="Google"
            loading={loading === "google"}
            onClick={() => handleProvider("google", signInWithGoogle)}
          />
          <SocialButton
            icon={<GithubIcon />} label="GitHub"
            loading={loading === "github"}
            onClick={() => handleProvider("github", signInWithGithub)}
          />
          <SocialButton
            icon={<AppleIcon />} label="Apple"
            loading={loading === "apple"}
            onClick={() => handleProvider("apple", signInWithApple)}
          />
        </div>

        <div style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center", lineHeight: 1.6 }}>
          By signing in you agree to our{" "}
          <a href="#" style={{ color: "var(--muted)" }}>Terms</a> and{" "}
          <a href="#" style={{ color: "var(--muted)" }}>Privacy Policy</a>.
        </div>

        <div style={{ marginTop: 24, padding: 12, background: "var(--surface2)", borderRadius: 4, fontSize: 10, color: "var(--muted)" }}>
          <strong style={{ color: "var(--text)" }}>New accounts</strong> receive a test key and a live key automatically.
          Test keys return synthetic responses — no LLM calls, no cost.
        </div>
      </div>
    </div>
  );
}

// ── Provider icons (inline SVG — no external deps) ────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
      <path d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2c-7.9 0-14.7 4.4-18.7 10.7l1 2z" fill="#FF3D00"/>
      <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.5C29.5 36.9 26.9 38 24 38c-6 0-11.1-4-12.9-9.5L4 34c3.9 6.5 11.1 12 20 12z" fill="#4CAF50"/>
      <path d="M44.5 20H24v8.5h11.8c-.7 2.3-2.1 4.3-4 5.7l6.6 5.5C42.8 36.2 46 30.5 46 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013.01-.4c1.02.005 2.05.138 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-155.5-127.4C46.7 790.7 0 663 0 541.8c0-207.3 134.4-316.7 266.5-316.7 100.9 0 184.4 66.2 245.8 66.2 59.2 0 152-69.7 272.1-69.7 43.4 0 176.7 4 265.7 192.2zm-166.6-200.1C567.2 90.4 540.6 0 510.6 0c-2.5 0-5.1.2-7.6.5-3 48.3 17.7 97.7 45.7 132.8 26 33.1 71.6 58.6 111.3 61 2.5 0 5.1.2 7.6.2 2.9 0 5.9-.1 8.8-.5-1.5-49.3-16.1-96-44.9-133.2z"/>
    </svg>
  );
}
