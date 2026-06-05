"use client";
import { useEffect, useState, useCallback } from "react";
import { keysApi, providerKeysApi, routingApi } from "../lib/api";
import { useToken } from "../hooks/useToken";
import { Icon } from "../components/Icons";
import type { ApiKey, ProviderKey, RoutingConfig } from "../types";

type Tab = "keys" | "providers" | "routing" | "setup";

const MODELS = [
  "gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo",
  "claude-opus-4-8","claude-sonnet-4-6","claude-haiku-4-5",
  "gemini-2.0-flash","gemini-1.5-pro",
];

const PROVIDER_LABELS: Record<string, { name: string; placeholder: string }> = {
  openai:    { name: "OpenAI",    placeholder: "sk-..." },
  anthropic: { name: "Anthropic", placeholder: "sk-ant-..." },
  google:    { name: "Google AI", placeholder: "AIza..." },
};

export function GatewayPage() {
  const token = useToken();
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
    if (!token) return;
    const [k, pk, r] = await Promise.all([keysApi.list(token), providerKeysApi.list(token), routingApi.get(token)]);
    setApiKeys(k); setProviderKeys(pk); setRouting(r);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const createKey = async () => {
    if (!token || !newKeyName.trim()) return;
    const result = await keysApi.create(token, newKeyName.trim(), newKeyType);
    setNewKeyResult(result); setNewKeyName(""); load();
  };

  const revokeKey = async (id: string) => {
    if (!token || !confirm("Revoke this key?")) return;
    await keysApi.revoke(token, id); load();
  };

  const saveProviderKey = async (provider: string) => {
    if (!token || !providerInputs[provider]) return;
    setSaving(true);
    try { await providerKeysApi.upsert(token, provider, providerInputs[provider]); setProviderInputs(p => ({ ...p, [provider]: "" })); load(); }
    finally { setSaving(false); }
  };

  const removeProviderKey = async (provider: string) => {
    if (!token) return;
    await providerKeysApi.remove(token, provider); load();
  };

  const saveRouting = async () => {
    if (!token) return;
    setSaving(true);
    try { await routingApi.update(token, routing); } finally { setSaving(false); }
  };

  const copy = (val: string, id: string) => {
    navigator.clipboard.writeText(val); setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isConnected = (p: string) => providerKeys.some(k => k.provider === p);

  return (
    <div className="fade-in">
      <div className="tabs">
        {(["keys","providers","routing","setup"] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t === "keys" ? "API Keys" : t === "providers" ? "Provider Keys" : t === "routing" ? "Routing" : "Setup"}
          </button>
        ))}
      </div>

      {/* ── API Keys ── */}
      {tab === "keys" && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 14 }}>Create New Key</div>
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Name</label>
                <input className="field" placeholder="e.g. Production App" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
              </div>
              <div className="form-col" style={{ maxWidth: 140 }}>
                <label className="form-label">Type</label>
                <select className="field" value={newKeyType} onChange={e => setNewKeyType(e.target.value as "test"|"live")}>
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={createKey} disabled={!newKeyName.trim()}>
                <Icon name="plus" size={11} /> Create
              </button>
            </div>
          </div>

          {newKeyResult && (
            <div className="card" style={{ marginBottom: 16, borderColor: "var(--accent)" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>Copy now — shown once.</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#070809", borderRadius: 4, padding: "10px 14px" }}>
                <code style={{ flex: 1, color: "var(--accent)", fontSize: 12, wordBreak: "break-all" }}>{newKeyResult.key}</code>
                <button className="btn btn-ghost" onClick={() => copy(newKeyResult.key, "new")}>
                  <Icon name="copy" size={11} /> {copied === "new" ? "Copied!" : "Copy"}
                </button>
              </div>
              <button className="btn btn-ghost" style={{ marginTop: 10, fontSize: 10 }} onClick={() => setNewKeyResult(null)}>Dismiss</button>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title">Your Keys</div>
              <span className="tag tag-blue">{apiKeys.length} active</span>
            </div>
            {apiKeys.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: 12 }}>No keys yet.</div>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Type</th><th>Key</th><th>Last Used</th><th></th></tr></thead>
                <tbody>
                  {apiKeys.map(k => (
                    <tr key={k.id}>
                      <td style={{ fontWeight: 500 }}>{k.name}</td>
                      <td><span className={`tag tag-${k.type === "live" ? "orange" : "blue"}`}>{k.type}</span></td>
                      <td><code style={{ fontSize: 11, color: "var(--muted)" }}>{k.key}</code></td>
                      <td style={{ color: "var(--muted)", fontSize: 10 }}>{k.last_used_at ? new Date(k.last_used_at * 1000).toLocaleDateString() : "Never"}</td>
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
            GateML routes through your own provider API keys. Stored encrypted with AES-256.
          </div>
          {["openai","anthropic","google"].map(p => {
            const label = PROVIDER_LABELS[p];
            const connected = isConnected(p);
            return (
              <div className="card" style={{ marginBottom: 12 }} key={p}>
                <div className="card-header">
                  <div>
                    <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {label.name}
                      <span className={`tag tag-${connected ? "green" : "gray"}`} style={{ fontSize: 9 }}>{connected ? "connected" : "not set"}</span>
                    </div>
                    <div className="card-sub">{connected ? "Enter a new value to replace." : `Paste your ${label.name} API key`}</div>
                  </div>
                  {connected && <button className="btn btn-danger" style={{ fontSize: 10 }} onClick={() => removeProviderKey(p)}><Icon name="trash" size={10} /> Remove</button>}
                </div>
                <div className="form-row">
                  <div className="form-col">
                    <input className="field" type="password" placeholder={label.placeholder}
                      value={providerInputs[p] ?? ""} onChange={e => setProviderInputs(prev => ({ ...prev, [p]: e.target.value }))} />
                  </div>
                  <button className="btn btn-primary" disabled={!providerInputs[p] || saving} onClick={() => saveProviderKey(p)}>
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
            <select className="field" value={routing.primaryModel} onChange={e => setRouting(r => ({ ...r, primaryModel: e.target.value }))}>
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label className="form-label" style={{ margin: 0 }}>Fallback Chain</label>
              <button className="btn btn-ghost" style={{ fontSize: 10 }}
                onClick={() => setRouting(r => ({ ...r, fallbackChain: [...r.fallbackChain, { model: "gpt-4o-mini", on: [429,500,502,503] }] }))}>
                <Icon name="plus" size={10} /> Add
              </button>
            </div>
            {routing.fallbackChain.length === 0 && <div style={{ fontSize: 11, color: "var(--muted)" }}>No fallbacks. Add one to enable automatic failover.</div>}
            {routing.fallbackChain.map((entry, i) => (
              <div key={i} className="route-card" style={{ marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--accent2)", flexShrink: 0 }}>{i+1}</div>
                <div style={{ flex: 1 }}>
                  <select className="field" style={{ marginBottom: 6 }} value={entry.model}
                    onChange={e => setRouting(r => ({ ...r, fallbackChain: r.fallbackChain.map((fb, j) => j === i ? { ...fb, model: e.target.value } : fb) }))}>
                    {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div style={{ fontSize: 10, color: "var(--muted)" }}>Triggers on: {entry.on.join(", ")}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: "4px 8px" }}
                  onClick={() => setRouting(r => ({ ...r, fallbackChain: r.fallbackChain.filter((_, j) => j !== i) }))}>
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
          {[
            { title: "Python (OpenAI SDK)", code: `from openai import OpenAI\n\nclient = OpenAI(\n  api_key="gml-sk-live_...",\n  base_url="https://api.gateml.io/v1",\n)` },
            { title: "TypeScript / Node.js", code: `// npm install gateml\nimport { createGateMLClient } from 'gateml';\nconst client = await createGateMLClient({ apiKey: 'gml-sk-live_...' });` },
            { title: "LangChain (Python)", code: `from langchain_openai import ChatOpenAI\n\nllm = ChatOpenAI(\n  model="gpt-4o",\n  api_key="gml-sk-live_...",\n  base_url="https://api.gateml.io/v1",\n)` },
            { title: "Go", code: `import "github.com/gateml/gateml-go"\n\nclient := gateml.NewClient("gml-sk-live_...")` },
          ].map(s => (
            <div className="card" style={{ marginBottom: 16 }} key={s.title}>
              <div className="card-title" style={{ marginBottom: 12 }}>{s.title}</div>
              <div className="code-area" style={{ fontSize: 11 }}>{s.code}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
