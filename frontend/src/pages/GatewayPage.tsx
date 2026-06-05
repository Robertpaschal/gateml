import { useEffect, useState, useCallback } from "react";
import { keysApi, providerKeysApi, routingApi } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { Icon } from "../components/Icons";
import type { ApiKey, ProviderKey, RoutingConfig } from "../types";

type Tab = "keys" | "providers" | "routing" | "setup";

const MODELS = [
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo",
  "claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5",
  "gemini-2.0-flash", "gemini-1.5-pro",
];

const PROVIDER_LABELS: Record<string, { name: string; placeholder: string }> = {
  openai:    { name: "OpenAI",    placeholder: "sk-..." },
  anthropic: { name: "Anthropic", placeholder: "sk-ant-..." },
  google:    { name: "Google AI", placeholder: "AIza..." },
};

export function GatewayPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("keys");
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [providerKeys, setProviderKeys] = useState<ProviderKey[]>([]);
  const [routing, setRouting] = useState<RoutingConfig>({ primaryModel: "gpt-4o", fallbackChain: [] });
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"test" | "live">("test");
  const [newKeyResult, setNewKeyResult] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [providerInputs, setProviderInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [k, pk, r] = await Promise.all([
      keysApi.list(user.token),
      providerKeysApi.list(user.token),
      routingApi.get(user.token),
    ]);
    setApiKeys(k);
    setProviderKeys(pk);
    setRouting(r);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createKey = async () => {
    if (!user || !newKeyName.trim()) return;
    const result = await keysApi.create(user.token, newKeyName.trim(), newKeyType);
    setNewKeyResult(result);
    setNewKeyName("");
    load();
  };

  const revokeKey = async (id: string) => {
    if (!user || !confirm("Revoke this key? It will stop working immediately.")) return;
    await keysApi.revoke(user.token, id);
    load();
  };

  const saveProviderKey = async (provider: string) => {
    if (!user || !providerInputs[provider]) return;
    setSaving(true);
    try {
      await providerKeysApi.upsert(user.token, provider, providerInputs[provider]);
      setProviderInputs(prev => ({ ...prev, [provider]: "" }));
      load();
    } finally { setSaving(false); }
  };

  const removeProviderKey = async (provider: string) => {
    if (!user) return;
    await providerKeysApi.remove(user.token, provider);
    load();
  };

  const saveRouting = async () => {
    if (!user) return;
    setSaving(true);
    try { await routingApi.update(user.token, routing); }
    finally { setSaving(false); }
  };

  const copy = (val: string, id: string) => {
    navigator.clipboard.writeText(val);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isProviderConnected = (p: string) => providerKeys.some(k => k.provider === p);

  return (
    <div className="fade-in">
      <div className="tabs">
        {(["keys", "providers", "routing", "setup"] as Tab[]).map(t => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "keys" ? "API Keys" : t === "providers" ? "Provider Keys" : t === "routing" ? "Routing" : "Setup"}
          </div>
        ))}
      </div>

      {/* ── API Keys ── */}
      {tab === "keys" && (
        <div>
          {/* Create */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>Create New Key</div>
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Name</label>
                <input className="field" placeholder="e.g. Production App" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
              </div>
              <div className="form-col" style={{ maxWidth: 140 }}>
                <label className="form-label">Type</label>
                <select className="field" value={newKeyType} onChange={e => setNewKeyType(e.target.value as "test" | "live")}>
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={createKey} disabled={!newKeyName.trim()}>
                <Icon name="plus" size={11} /> Create
              </button>
            </div>
          </div>

          {/* New key reveal (shown once) */}
          {newKeyResult && (
            <div className="card" style={{ marginBottom: 16, borderColor: "var(--accent)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>
                Copy this key now — it won't be shown again.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#070809", borderRadius: 4, padding: "10px 14px" }}>
                <code style={{ flex: 1, color: "var(--accent)", fontSize: 12, wordBreak: "break-all" }}>
                  {newKeyResult.key}
                </code>
                <button className="btn btn-ghost" onClick={() => copy(newKeyResult.key, "new")}>
                  <Icon name="copy" size={11} />
                  {copied === "new" ? "Copied!" : "Copy"}
                </button>
              </div>
              <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 10 }} onClick={() => setNewKeyResult(null)}>
                I've saved it — dismiss
              </button>
            </div>
          )}

          {/* Key list */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Your Keys</div>
              <span className="tag tag-blue">{apiKeys.length} active</span>
            </div>
            {apiKeys.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>No keys yet.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr><th>Name</th><th>Type</th><th>Key</th><th>Last Used</th><th></th></tr>
                </thead>
                <tbody>
                  {apiKeys.map(k => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 500 }}>{k.name}</td>
                      <td>
                        <span className={`tag tag-${k.type === "live" ? "orange" : "blue"}`}>
                          {k.type}
                        </span>
                      </td>
                      <td><code style={{ fontSize: 11, color: "var(--muted)" }}>{k.key}</code></td>
                      <td style={{ color: "var(--muted)", fontSize: 10 }}>
                        {k.last_used_at ? new Date(k.last_used_at * 1000).toLocaleDateString() : "Never"}
                      </td>
                      <td>
                        <button className="btn btn-danger" style={{ padding: "3px 8px" }} onClick={() => revokeKey(k.id)}>
                          <Icon name="trash" size={10} /> Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Provider Keys ── */}
      {tab === "providers" && (
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 16 }}>
            GateML routes your requests through your own provider API keys. Keys are stored encrypted (AES-256).
          </div>
          {["openai", "anthropic", "google"].map(p => {
            const connected = isProviderConnected(p);
            const label = PROVIDER_LABELS[p];
            return (
              <div className="card" style={{ marginBottom: 12 }} key={p}>
                <div className="card-header">
                  <div>
                    <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {label.name}
                      <span className={`tag tag-${connected ? "green" : "gray"}`} style={{ fontSize: 9 }}>
                        {connected ? "connected" : "not set"}
                      </span>
                    </div>
                    <div className="card-sub">
                      {connected ? "Key stored. Enter a new value to replace." : `Paste your ${label.name} API key`}
                    </div>
                  </div>
                  {connected && (
                    <button className="btn btn-danger" style={{ fontSize: 10 }} onClick={() => removeProviderKey(p)}>
                      <Icon name="trash" size={10} /> Remove
                    </button>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-col">
                    <input
                      className="field"
                      type="password"
                      placeholder={label.placeholder}
                      value={providerInputs[p] ?? ""}
                      onChange={e => setProviderInputs(prev => ({ ...prev, [p]: e.target.value }))}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={!providerInputs[p] || saving}
                    onClick={() => saveProviderKey(p)}
                  >
                    <Icon name="check" size={11} /> Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Routing ── */}
      {tab === "routing" && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Fallback Chain</div>
              <div className="card-sub">GateML retries down this chain on 429 / 5xx with exponential backoff</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Primary Model</label>
            <select className="field" value={routing.primaryModel}
              onChange={e => setRouting(r => ({ ...r, primaryModel: e.target.value }))}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Fallback Chain (in order)</label>
              <button className="btn btn-ghost" style={{ fontSize: 10 }}
                onClick={() => setRouting(r => ({
                  ...r,
                  fallbackChain: [...r.fallbackChain, { model: "gpt-4o-mini", on: [429, 500, 502, 503] }],
                }))}>
                <Icon name="plus" size={10} /> Add fallback
              </button>
            </div>

            {routing.fallbackChain.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                No fallbacks configured. Add one to enable automatic failover.
              </div>
            )}

            {routing.fallbackChain.map((entry, i) => (
              <div key={i} className="route-card" style={{ marginBottom: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "var(--surface2)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "var(--accent2)", flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <select className="field" style={{ marginBottom: 6 }} value={entry.model}
                    onChange={e => setRouting(r => ({
                      ...r,
                      fallbackChain: r.fallbackChain.map((fb, j) => j === i ? { ...fb, model: e.target.value } : fb),
                    }))}>
                    {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>
                    Triggers on: {entry.on.join(", ")}
                  </div>
                </div>
                <button className="btn btn-ghost" style={{ padding: "4px 8px" }}
                  onClick={() => setRouting(r => ({
                    ...r,
                    fallbackChain: r.fallbackChain.filter((_, j) => j !== i),
                  }))}>
                  <Icon name="x" size={11} />
                </button>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={saveRouting} disabled={saving}>
            <Icon name="check" size={11} /> {saving ? "Saving..." : "Save Routing Config"}
          </button>
        </div>
      )}

      {/* ── Setup ── */}
      {tab === "setup" && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>One-line setup</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
              Change only the <code style={{ color: "var(--accent2)" }}>base_url</code> — your existing code stays the same.
            </div>
            <div className="code-area">
              <span style={{ color: "var(--muted)", fontStyle: "italic" }}># Python (OpenAI SDK)</span>{"\n"}
              <span style={{ color: "#c792ea" }}>from</span> openai <span style={{ color: "#c792ea" }}>import</span> OpenAI{"\n\n"}
              client = OpenAI({"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>api_key</span>=<span style={{ color: "#c3e88d" }}>"gml-sk-live_..."</span>,{"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>base_url</span>=<span style={{ color: "#c3e88d" }}>"https://api.gateml.io/v1"</span>,{"\n"}
              )
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>TypeScript / Node.js</div>
            <div className="code-area">
              <span style={{ color: "var(--muted)", fontStyle: "italic" }}>// npm install gateml openai</span>{"\n"}
              <span style={{ color: "#c792ea" }}>import</span> {`{ createGateMLClient }`} <span style={{ color: "#c792ea" }}>from</span> <span style={{ color: "#c3e88d" }}>'gateml'</span>;{"\n\n"}
              <span style={{ color: "#c792ea" }}>const</span> client = createGateMLClient({`{`}{"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>apiKey</span>: <span style={{ color: "#c3e88d" }}>'gml-sk-live_...'</span>,{"\n"}
              {`}`});{"\n\n"}
              <span style={{ color: "var(--muted)", fontStyle: "italic" }}>// Works exactly like the OpenAI SDK</span>{"\n"}
              <span style={{ color: "#c792ea" }}>const</span> res = <span style={{ color: "#c792ea" }}>await</span> client.chat.completions.create({`{`}{"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>model</span>: <span style={{ color: "#c3e88d" }}>'gpt-4o'</span>,{"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>messages</span>: [{`{ role: 'user', content: 'Hello' }`}],{"\n"}
              {`}`});
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>LangChain</div>
            <div className="code-area">
              <span style={{ color: "#c792ea" }}>from</span> langchain_openai <span style={{ color: "#c792ea" }}>import</span> ChatOpenAI{"\n\n"}
              llm = ChatOpenAI({"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>model</span>=<span style={{ color: "#c3e88d" }}>"gpt-4o"</span>,{"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>api_key</span>=<span style={{ color: "#c3e88d" }}>"gml-sk-live_..."</span>,{"\n"}
              {"  "}<span style={{ color: "var(--accent2)" }}>base_url</span>=<span style={{ color: "#c3e88d" }}>"https://api.gateml.io/v1"</span>,{"\n"}
              )
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
