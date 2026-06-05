import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Icon } from "../components/Icons";

interface KeyReveal {
  testKey: string;
  liveKey: string;
}

export function AuthPage() {
  const { login, signup } = useAuth();
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
        const result = await signup(email, password);
        setKeys(result);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (keys) {
    return (
      <div className="auth-shell">
        <div className="auth-card" style={{ width: 500 }}>
          <div className="auth-logo">GateML</div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "var(--accent)", fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
              Account created!
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Save these keys now — the full value is shown only once.
            </div>
          </div>

          {/* Test key */}
          <div className="key-reveal">
            <div className="key-reveal-label">Test Key (safe for development)</div>
            <div className="key-reveal-value">{keys.testKey}</div>
            <div className="key-copy-row">
              <button className="btn btn-ghost" style={{ fontSize: 10 }} onClick={() => copy(keys.testKey, "test")}>
                <Icon name="copy" size={10} />
                {copied === "test" ? "Copied!" : "Copy"}
              </button>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>
                Returns synthetic responses. Free, no LLM calls.
              </span>
            </div>
          </div>

          {/* Live key */}
          <div className="key-reveal" style={{ borderColor: "var(--accent3)" }}>
            <div className="key-reveal-label">Live Key (real LLM calls)</div>
            <div className="key-reveal-value" style={{ color: "var(--accent3)" }}>{keys.liveKey}</div>
            <div className="key-copy-row">
              <button className="btn btn-ghost" style={{ fontSize: 10 }} onClick={() => copy(keys.liveKey, "live")}>
                <Icon name="copy" size={10} />
                {copied === "live" ? "Copied!" : "Copy"}
              </button>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>
                Requires your OpenAI / Anthropic keys in the Gateway tab.
              </span>
            </div>
          </div>

          {/* Quick start snippet */}
          <div style={{ marginBottom: 20 }}>
            <div className="form-label">Quick start (Python)</div>
            <div className="code-area" style={{ fontSize: 11 }}>
              <span style={{ color: "#c792ea" }}>from</span> openai <span style={{ color: "#c792ea" }}>import</span> OpenAI{"\n\n"}
              client = OpenAI({"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>api_key</span>=<span style={{ color: "#c3e88d" }}>"{keys.testKey}"</span>,{"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>base_url</span>=<span style={{ color: "#c3e88d" }}>"https://api.gateml.io/v1"</span>,{"\n"}
              ){"\n\n"}
              <span style={{ color: "var(--muted)", fontStyle: "italic" }}># Swap to your live key when ready</span>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
            Or install the SDK: <code style={{ color: "var(--accent2)" }}>npm install gateml</code>
          </div>

          <button className="auth-btn" onClick={() => { /* useAuth already set user → App will re-render */ }}>
            Open Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">GateML</div>
        <div className="auth-tagline">
          Route, observe, and control your LLM traffic. One key, all providers.
        </div>

        <form onSubmit={submit}>
          {error && <div className="auth-error">{error}</div>}

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
          />

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "..." : mode === "signup" ? "Create account" : "Sign in"}
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
          <strong style={{ color: "var(--text)" }}>Live keys</strong> proxy to OpenAI / Anthropic using your provider keys.
        </div>
      </div>
    </div>
  );
}
