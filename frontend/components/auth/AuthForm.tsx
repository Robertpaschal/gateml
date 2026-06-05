"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API = "/api";

async function callApi<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json() as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data;
}

function setAuthCookie(token: string) {
  document.cookie = `gateml_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
  localStorage.setItem("gateml_token", token);
}

interface KeyReveal { testKey: string; liveKey: string }

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keys, setKeys] = useState<KeyReveal | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const res = await callApi<{ token: string; testKey: string; liveKey: string }>(
          "/auth/signup",
          { email, password }
        );
        setAuthCookie(res.token);
        setKeys({ testKey: res.testKey, liveKey: res.liveKey });
      } else {
        const res = await callApi<{ token: string }>("/auth/login", { email, password });
        setAuthCookie(res.token);
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copy = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (keys) {
    return (
      <div className="auth-shell">
        <div className="auth-card" style={{ width: 500 }}>
          <Link href="/" className="auth-logo" style={{ textDecoration: "none", display: "block" }}>GateML</Link>
          <div style={{ marginBottom: 20, marginTop: 12 }}>
            <div style={{ color: "var(--accent)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              Account created!
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Save these keys now — the full value is shown only once.
            </div>
          </div>

          <div className="key-reveal">
            <div className="key-reveal-label">Test Key (synthetic responses — free)</div>
            <div className="key-reveal-value">{keys.testKey}</div>
            <div className="key-copy-row">
              <button className="btn btn-ghost" style={{ fontSize: 10 }} onClick={() => copy(keys.testKey, "test")}>
                {copied === "test" ? "Copied!" : "Copy"}
              </button>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>No real LLM calls, no cost.</span>
            </div>
          </div>

          <div className="key-reveal" style={{ borderColor: "var(--accent3)" }}>
            <div className="key-reveal-label">Live Key (real LLM calls)</div>
            <div className="key-reveal-value" style={{ color: "var(--accent3)" }}>{keys.liveKey}</div>
            <div className="key-copy-row">
              <button className="btn btn-ghost" style={{ fontSize: 10 }} onClick={() => copy(keys.liveKey, "live")}>
                {copied === "live" ? "Copied!" : "Copy"}
              </button>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>Add provider keys in the dashboard first.</span>
            </div>
          </div>

          <div className="code-area" style={{ marginBottom: 16, fontSize: 11 }}>
            <span style={{ color: "#c792ea" }}>from</span> openai{" "}
            <span style={{ color: "#c792ea" }}>import</span> OpenAI{"\n\n"}
            {"client = OpenAI("}{"\n"}
            {"  "}<span style={{ color: "var(--accent2)" }}>api_key</span>
            {"="}<span style={{ color: "#c3e88d" }}>"{keys.testKey}"</span>{",\n"}
            {"  "}<span style={{ color: "var(--accent2)" }}>base_url</span>
            {"="}<span style={{ color: "#c3e88d" }}>"https://api.gateml.io/v1"</span>{",\n"}
            {")"}
          </div>

          <button className="auth-btn" onClick={() => router.push("/dashboard")}>
            Open Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link href="/" style={{ textDecoration: "none" }}>
          <div className="auth-logo">GateML</div>
        </Link>
        <div className="auth-tagline">One key. All LLMs. Automatic fallback.</div>

        <form onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}
          <input
            className="auth-input" type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)} required autoFocus
          />
          <input
            className="auth-input" type="password" placeholder="Password (min 8 chars)"
            value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
          />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "..." : mode === "signup" ? "Create account free" : "Sign in"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "signup" ? (
            <>Already have an account? <span onClick={() => setMode("login")}>Sign in</span></>
          ) : (
            <>No account? <span onClick={() => setMode("signup")}>Create one free</span></>
          )}
        </div>

        <div style={{ marginTop: 24, padding: "12px", background: "var(--surface2)", borderRadius: 4, fontSize: 10, color: "var(--muted)" }}>
          <strong style={{ color: "var(--text)" }}>Test keys</strong> return synthetic responses — no LLM calls, no cost.{" "}
          <strong style={{ color: "var(--text)" }}>Live keys</strong> forward to your provider keys with automatic fallback.
        </div>
      </div>
    </div>
  );
}
