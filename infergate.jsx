import { useState, useEffect, useRef } from "react";

// ── Palette & tokens ──────────────────────────────────────────────────────────
// Industrial-terminal aesthetic: near-black bg, acid-green accents, mono type
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0a0b0d;
    --surface:   #111318;
    --surface2:  #181c24;
    --border:    #1e2430;
    --border2:   #2a3344;
    --accent:    #00ff88;
    --accent2:   #00c9ff;
    --accent3:   #ff6b35;
    --warn:      #ffb800;
    --danger:    #ff3b5c;
    --text:      #e8eaf0;
    --muted:     #6b7a96;
    --muted2:    #3d4a60;
    --font-mono: 'JetBrains Mono', monospace;
    --font-ui:   'Syne', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-mono); overflow-x: hidden; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* ── Sidebar ── */
  .sidebar {
    width: 220px; min-width: 220px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    padding: 0;
  }
  .logo {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border);
  }
  .logo-mark {
    font-family: var(--font-ui);
    font-weight: 800;
    font-size: 18px;
    letter-spacing: -0.5px;
    color: var(--accent);
  }
  .logo-sub { font-size: 9px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }

  .nav { flex: 1; padding: 12px 0; }
  .nav-section { padding: 16px 16px 6px; font-size: 9px; color: var(--muted2); letter-spacing: 2px; text-transform: uppercase; }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 20px;
    font-size: 12px; color: var(--muted);
    cursor: pointer; transition: all 0.15s;
    border-left: 2px solid transparent;
    position: relative;
  }
  .nav-item:hover { color: var(--text); background: var(--surface2); }
  .nav-item.active {
    color: var(--accent); background: rgba(0,255,136,0.06);
    border-left-color: var(--accent);
  }
  .nav-item .badge {
    margin-left: auto; background: var(--accent3);
    color: #fff; font-size: 9px; padding: 1px 5px;
    border-radius: 8px; font-weight: 700;
  }

  .sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    font-size: 10px; color: var(--muted);
  }
  .status-dot {
    display: inline-block; width: 6px; height: 6px;
    background: var(--accent); border-radius: 50%;
    margin-right: 6px; animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  /* ── Main ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .topbar {
    height: 52px; min-height: 52px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 24px; gap: 16px;
    background: var(--surface);
  }
  .topbar-title { font-family: var(--font-ui); font-weight: 700; font-size: 15px; }
  .topbar-sub { font-size: 11px; color: var(--muted); }
  .topbar-right { margin-left: auto; display: flex; gap: 10px; align-items: center; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 4px; font-size: 11px;
    font-family: var(--font-mono); font-weight: 500;
    cursor: pointer; transition: all 0.15s; border: none;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-primary:hover { background: #00ffaa; }
  .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border2); }
  .btn-ghost:hover { color: var(--text); border-color: var(--muted); }
  .btn-danger { background: transparent; color: var(--danger); border: 1px solid var(--danger); }
  .btn-danger:hover { background: rgba(255,59,92,0.1); }

  .content { flex: 1; overflow-y: auto; padding: 24px; }

  /* ── Cards ── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 20px;
  }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .card-title { font-family: var(--font-ui); font-weight: 700; font-size: 13px; }
  .card-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }

  /* ── Grid layouts ── */
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 20px; }
  .grid-2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }

  /* ── Stat cards ── */
  .stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 16px 20px;
    position: relative; overflow: hidden;
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 2px;
  }
  .stat-card.green::before { background: var(--accent); }
  .stat-card.blue::before { background: var(--accent2); }
  .stat-card.orange::before { background: var(--accent3); }
  .stat-card.yellow::before { background: var(--warn); }
  .stat-label { font-size: 9px; color: var(--muted); letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; }
  .stat-value { font-family: var(--font-ui); font-size: 26px; font-weight: 800; }
  .stat-value.green { color: var(--accent); }
  .stat-value.blue { color: var(--accent2); }
  .stat-value.orange { color: var(--accent3); }
  .stat-value.yellow { color: var(--warn); }
  .stat-delta { font-size: 10px; color: var(--muted); margin-top: 4px; }
  .stat-delta span { color: var(--accent); }

  /* ── Table ── */
  .table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .table th {
    text-align: left; padding: 8px 12px;
    font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--muted); border-bottom: 1px solid var(--border);
    font-weight: 500;
  }
  .table td { padding: 11px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .table tr:hover td { background: var(--surface2); }
  .table tr:last-child td { border-bottom: none; }

  /* ── Badges ── */
  .tag {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 500;
  }
  .tag-green { background: rgba(0,255,136,0.12); color: var(--accent); }
  .tag-blue { background: rgba(0,201,255,0.12); color: var(--accent2); }
  .tag-orange { background: rgba(255,107,53,0.12); color: var(--accent3); }
  .tag-yellow { background: rgba(255,184,0,0.12); color: var(--warn); }
  .tag-red { background: rgba(255,59,92,0.12); color: var(--danger); }
  .tag-gray { background: var(--surface2); color: var(--muted); }

  /* ── Code editor look ── */
  .code-area {
    background: #070809; border: 1px solid var(--border);
    border-radius: 4px; padding: 14px 16px;
    font-family: var(--font-mono); font-size: 12px;
    color: #c9d1e0; line-height: 1.7;
    white-space: pre-wrap; overflow-x: auto;
  }
  .code-area .kw { color: #c792ea; }
  .code-area .str { color: #c3e88d; }
  .code-area .num { color: #f78c6c; }
  .code-area .key { color: var(--accent2); }
  .code-area .cmt { color: var(--muted); font-style: italic; }

  textarea.code-input {
    width: 100%; background: #070809; border: 1px solid var(--border);
    border-radius: 4px; padding: 14px 16px;
    font-family: var(--font-mono); font-size: 12px;
    color: #c9d1e0; line-height: 1.7; resize: vertical;
    outline: none; min-height: 120px;
  }
  textarea.code-input:focus { border-color: var(--accent); }

  input.field, select.field {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px; padding: 8px 12px;
    font-family: var(--font-mono); font-size: 12px; color: var(--text);
    outline: none; width: 100%;
  }
  input.field:focus, select.field:focus { border-color: var(--accent); }
  select.field option { background: var(--surface2); }

  .form-row { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-end; }
  .form-col { flex: 1; }
  .form-label { font-size: 10px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; display: block; }

  /* ── Chart bar ── */
  .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 80px; }
  .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
  .bar { width: 100%; border-radius: 2px 2px 0 0; transition: height 0.6s ease; }
  .bar-label { font-size: 8px; color: var(--muted); }

  /* ── Sparkline SVG ── */
  .sparkline { overflow: visible; }

  /* ── Timeline / log ── */
  .log-entry {
    display: flex; gap: 12px; padding: 10px 0;
    border-bottom: 1px solid var(--border); font-size: 11px;
    align-items: flex-start;
  }
  .log-entry:last-child { border-bottom: none; }
  .log-time { color: var(--muted); min-width: 80px; font-size: 10px; margin-top: 1px; }
  .log-method { min-width: 36px; }
  .log-body { flex: 1; }
  .log-path { color: var(--text); }
  .log-meta { color: var(--muted); font-size: 10px; margin-top: 2px; }

  /* ── Diff view ── */
  .diff-line { padding: 2px 8px; font-size: 11px; font-family: var(--font-mono); }
  .diff-add { background: rgba(0,255,136,0.08); color: var(--accent); }
  .diff-remove { background: rgba(255,59,92,0.08); color: var(--danger); }
  .diff-ctx { color: var(--muted); }

  /* ── Modal ── */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; backdrop-filter: blur(2px);
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 8px; padding: 24px; width: 560px; max-width: 95vw;
    max-height: 85vh; overflow-y: auto;
  }
  .modal-title { font-family: var(--font-ui); font-weight: 700; font-size: 16px; margin-bottom: 4px; }
  .modal-sub { font-size: 11px; color: var(--muted); margin-bottom: 20px; }
  .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

  /* ── Tabs ── */
  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tab {
    padding: 10px 18px; font-size: 11px; color: var(--muted);
    cursor: pointer; border-bottom: 2px solid transparent;
    transition: all 0.15s; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  /* ── Progress bar ── */
  .progress-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }

  /* ── Animations ── */
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 0.3s ease forwards; }

  @keyframes slideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }

  /* ── Test runner ── */
  .test-row {
    display: flex; align-items: center; gap: 12px;
    padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 11px;
  }
  .test-indicator { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .test-pass { background: var(--accent); }
  .test-fail { background: var(--danger); }
  .test-skip { background: var(--muted2); }
  .test-run { background: var(--warn); animation: pulse 1s infinite; }

  /* ── Gateway route card ── */
  .route-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 5px; padding: 14px 16px; margin-bottom: 10px;
    display: flex; align-items: center; gap: 14px;
  }
  .route-method { font-size: 10px; font-weight: 700; padding: 3px 7px; border-radius: 3px; }
  .route-method.get { background: rgba(0,201,255,0.15); color: var(--accent2); }
  .route-method.post { background: rgba(0,255,136,0.15); color: var(--accent); }
  .route-path { flex: 1; font-size: 12px; }
  .route-target { font-size: 11px; color: var(--muted); }
`;

// ── Mock data ─────────────────────────────────────────────────────────────────

const PROMPTS = [
  { id: "p1", name: "Customer Support Bot", model: "gpt-4o", version: 4, status: "production", calls: 14820, tokens: 2140000, cost: 64.2, p95: 1240, errorRate: 0.3 },
  { id: "p2", name: "Document Summarizer", model: "claude-sonnet-4-6", version: 2, status: "staging", calls: 3210, tokens: 890000, cost: 18.7, p95: 980, errorRate: 0.1 },
  { id: "p3", name: "Code Review Assistant", model: "gpt-4o-mini", version: 7, status: "production", calls: 8440, tokens: 560000, cost: 8.4, p95: 640, errorRate: 0.8 },
  { id: "p4", name: "Lead Qualifier", model: "gpt-4o", version: 1, status: "draft", calls: 120, tokens: 14000, cost: 0.4, p95: 2100, errorRate: 2.1 },
];

const VERSIONS = {
  p1: [
    { v: 4, date: "2026-06-04", author: "robert", note: "Tightened tone instructions", active: true },
    { v: 3, date: "2026-05-28", author: "robert", note: "Added fallback handling", active: false },
    { v: 2, date: "2026-05-10", author: "robert", note: "Improved context window use", active: false },
    { v: 1, date: "2026-04-22", author: "robert", note: "Initial version", active: false },
  ],
};

const PROMPT_BODY = {
  v4: `You are a helpful, professional customer support agent for Infergate.

## Rules
- Always greet the user by name if provided
- Resolve issues in under 3 messages when possible  
- Escalate billing disputes to tier-2 without delay
- Never speculate about product roadmap

## Tone
Concise, warm, technically precise. Avoid filler phrases.

{{user_message}}`,
  v3: `You are a customer support agent for Infergate.

Rules:
- Greet the user
- Resolve issues efficiently
- Escalate billing disputes
- Do not speculate on roadmap
- If unclear, ask one clarifying question

{{user_message}}`,
};

const LOGS = [
  { time: "14:32:01", method: "POST", path: "/v1/chat/completions", model: "gpt-4o", status: 200, latency: 843, tokens: 1240, cost: 0.037 },
  { time: "14:31:58", method: "POST", path: "/v1/chat/completions", model: "claude-sonnet-4-6", status: 200, latency: 612, tokens: 890, cost: 0.018 },
  { time: "14:31:44", method: "POST", path: "/v1/chat/completions", model: "gpt-4o", status: 429, latency: 201, tokens: 0, cost: 0 },
  { time: "14:31:30", method: "POST", path: "/v1/chat/completions", model: "gpt-4o-mini", status: 200, latency: 390, tokens: 420, cost: 0.003 },
  { time: "14:31:18", method: "POST", path: "/v1/chat/completions", model: "gpt-4o", status: 200, latency: 1102, tokens: 2100, cost: 0.063 },
  { time: "14:31:01", method: "POST", path: "/v1/chat/completions", model: "claude-sonnet-4-6", status: 200, latency: 544, tokens: 780, cost: 0.016 },
  { time: "14:30:47", method: "POST", path: "/v1/completions", model: "gpt-4o-mini", status: 500, latency: 5001, tokens: 0, cost: 0 },
  { time: "14:30:31", method: "POST", path: "/v1/chat/completions", model: "gpt-4o", status: 200, latency: 920, tokens: 1560, cost: 0.047 },
];

const TESTS = [
  { id: "t1", name: "Returns greeting when user provides name", prompt: "p1", expected: "contains greeting", status: "pass", latency: 834 },
  { id: "t2", name: "Escalates billing disputes correctly", prompt: "p1", expected: "contains 'tier-2'", status: "pass", latency: 912 },
  { id: "t3", name: "Does not speculate on roadmap", prompt: "p1", expected: "no roadmap mention", status: "pass", latency: 768 },
  { id: "t4", name: "Handles empty input gracefully", prompt: "p1", expected: "asks clarifying question", status: "fail", latency: 1240 },
  { id: "t5", name: "Response under 150 tokens", prompt: "p3", expected: "tokens < 150", status: "pass", latency: 390 },
  { id: "t6", name: "Identifies security issues in code", prompt: "p3", expected: "contains 'vulnerability'", status: "pass", latency: 642 },
];

const ROUTES = [
  { method: "POST", path: "/v1/chat/completions", target: "gpt-4o → claude-sonnet-4-6 (fallback)", rps: 48, latency: 880 },
  { method: "POST", path: "/v1/completions", target: "gpt-4o-mini", rps: 12, latency: 410 },
  { method: "GET",  path: "/v1/models", target: "static response", rps: 2, latency: 4 },
];

const CHART_DATA = [42,58,71,65,88,94,78,102,89,115,108,131,124,98,142,138,156,149,163,171];
const COST_DATA =  [1.2,1.8,2.1,1.9,2.8,3.1,2.6,3.4,3.0,3.8,3.6,4.4,4.1,3.3,4.7,4.5,5.2,5.0,5.5,5.8];

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
const Icon = ({ name, size = 14 }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></>,
    prompt:    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    gateway:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    observe:   <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    test:      <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
    replay:    <><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></>,
    plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    chevron:   <><polyline points="9 18 15 12 9 6"/></>,
    copy:      <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    play:      <><polygon points="5 3 19 12 5 21 5 3"/></>,
    diff:      <><line x1="12" y1="5" x2="12" y2="19"/><path d="M5 12h14"/></>,
    key:       <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></>,
    zap:       <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#00ff88", height = 36, width = 120 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min + 1)) * height;
    return `${x},${y}`;
  }).join(" ");
  const area = `M0,${height} L${pts.split(" ").map(p => p).join(" L")} L${width},${height} Z`;
  return (
    <svg width={width} height={height} className="sparkline">
      <defs>
        <linearGradient id={`sg${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

// ── MiniBarChart ──────────────────────────────────────────────────────────────
function MiniBar({ data, color = "#00ff88" }) {
  const max = Math.max(...data);
  return (
    <div className="bar-chart">
      {data.map((v, i) => (
        <div key={i} className="bar-wrap">
          <div className="bar" style={{ height: `${(v / max) * 100}%`, background: color, opacity: i === data.length-1 ? 1 : 0.5 }}/>
        </div>
      ))}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard() {
  return (
    <div className="fade-in">
      <div className="grid-4">
        <div className="stat-card green">
          <div className="stat-label">Total API Calls (24h)</div>
          <div className="stat-value green">26,590</div>
          <div className="stat-delta"><span>↑ 12%</span> vs yesterday</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Tokens Used (24h)</div>
          <div className="stat-value blue">3.6M</div>
          <div className="stat-delta"><span>↑ 8%</span> vs yesterday</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Spend Today</div>
          <div className="stat-value orange">$91.30</div>
          <div className="stat-delta"><span>↑ 5%</span> vs yesterday</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">p95 Latency</div>
          <div className="stat-value yellow">1,024ms</div>
          <div className="stat-delta" style={{color:"var(--accent)"}}>↓ 80ms vs yesterday</div>
        </div>
      </div>

      <div className="grid-2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Request Volume</div>
              <div className="card-sub">Last 20 intervals</div>
            </div>
            <Sparkline data={CHART_DATA} color="#00ff88" width={100} height={40}/>
          </div>
          <MiniBar data={CHART_DATA} color="#00ff88"/>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Spend ($)</div>
              <div className="card-sub">Last 20 intervals</div>
            </div>
            <Sparkline data={COST_DATA} color="#ff6b35" width={100} height={40}/>
          </div>
          <MiniBar data={COST_DATA} color="#ff6b35"/>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Active Prompts</div>
          <div className="tag tag-green">4 prompts</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>Model</th><th>Version</th><th>Status</th>
              <th>Calls (24h)</th><th>Tokens</th><th>Cost</th><th>p95</th><th>Error %</th>
            </tr>
          </thead>
          <tbody>
            {PROMPTS.map(p => (
              <tr key={p.id}>
                <td style={{color:"var(--text)",fontWeight:500}}>{p.name}</td>
                <td><span className="tag tag-gray">{p.model}</span></td>
                <td style={{color:"var(--muted)"}}>v{p.version}</td>
                <td>
                  <span className={`tag tag-${p.status==="production"?"green":p.status==="staging"?"yellow":"gray"}`}>
                    {p.status}
                  </span>
                </td>
                <td>{p.calls.toLocaleString()}</td>
                <td>{(p.tokens/1000).toFixed(0)}K</td>
                <td style={{color:"var(--accent3)"}}>$  {p.cost.toFixed(2)}</td>
                <td>{p.p95}ms</td>
                <td style={{color: p.errorRate > 1 ? "var(--danger)" : "var(--muted)"}}>
                  {p.errorRate}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Prompt Versioning ─────────────────────────────────────────────────────────
function PromptVersioning() {
  const [selected, setSelected] = useState("p1");
  const [activeVersion, setActiveVersion] = useState(4);
  const [showDiff, setShowDiff] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newPromptText, setNewPromptText] = useState(PROMPT_BODY.v4);
  const [newNote, setNewNote] = useState("");
  const prompt = PROMPTS.find(p => p.id === selected);
  const versions = VERSIONS[selected] || [];

  const diffLines = [
    { type: "ctx", text: "You are a helpful, professional customer support agent for Infergate." },
    { type: "ctx", text: "" },
    { type: "ctx", text: "## Rules" },
    { type: "remove", text: "- Always greet the user" },
    { type: "add",    text: "- Always greet the user by name if provided" },
    { type: "ctx", text: "- Resolve issues in under 3 messages when possible" },
    { type: "add",    text: "- Escalate billing disputes to tier-2 without delay" },
    { type: "remove", text: "- Escalate billing disputes" },
    { type: "ctx", text: "- Never speculate about product roadmap" },
  ];

  return (
    <div className="fade-in">
      <div style={{display:"flex",gap:20}}>
        {/* Prompt list */}
        <div style={{width:240,flexShrink:0}}>
          <div style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px"}}>Prompts</span>
            <button className="btn btn-primary" style={{padding:"4px 10px",fontSize:10}} onClick={()=>setShowNew(true)}>
              <Icon name="plus" size={10}/> New
            </button>
          </div>
          {PROMPTS.map(p => (
            <div key={p.id}
              onClick={()=>setSelected(p.id)}
              style={{
                padding:"10px 14px", borderRadius:5, marginBottom:6, cursor:"pointer",
                background: selected===p.id ? "var(--surface2)" : "transparent",
                border: `1px solid ${selected===p.id ? "var(--border2)" : "transparent"}`,
                transition:"all 0.15s"
              }}>
              <div style={{fontSize:12,fontWeight:500,marginBottom:3}}>{p.name}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span className={`tag tag-${p.status==="production"?"green":p.status==="staging"?"yellow":"gray"}`} style={{fontSize:9}}>
                  {p.status}
                </span>
                <span style={{fontSize:10,color:"var(--muted)"}}>v{p.version}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Version detail */}
        <div style={{flex:1}}>
          <div className="card" style={{marginBottom:16}}>
            <div className="card-header">
              <div>
                <div className="card-title">{prompt?.name}</div>
                <div className="card-sub">Version history · {versions.length} versions</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setShowDiff(!showDiff)}>
                  <Icon name="diff" size={11}/> {showDiff ? "Hide" : "Show"} Diff
                </button>
              </div>
            </div>

            {/* Version list */}
            <div style={{marginBottom:16}}>
              {versions.map(v => (
                <div key={v.v}
                  onClick={()=>setActiveVersion(v.v)}
                  style={{
                    display:"flex", alignItems:"center", gap:12,
                    padding:"10px 12px", borderRadius:4, cursor:"pointer",
                    background: activeVersion===v.v ? "var(--surface2)" : "transparent",
                    marginBottom:4, transition:"all 0.12s"
                  }}>
                  <div style={{
                    width:28, height:28, borderRadius:4, display:"flex",
                    alignItems:"center", justifyContent:"center",
                    background: v.active ? "rgba(0,255,136,0.15)" : "var(--surface2)",
                    color: v.active ? "var(--accent)" : "var(--muted)",
                    fontSize:11, fontWeight:700
                  }}>v{v.v}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11}}>{v.note}</div>
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{v.date} · {v.author}</div>
                  </div>
                  {v.active && <span className="tag tag-green" style={{fontSize:9}}>LIVE</span>}
                </div>
              ))}
            </div>

            {/* Prompt body / diff */}
            {showDiff ? (
              <div>
                <div style={{fontSize:10,color:"var(--muted)",marginBottom:8,letterSpacing:"1px",textTransform:"uppercase"}}>
                  Diff: v3 → v4
                </div>
                <div style={{background:"#070809",border:"1px solid var(--border)",borderRadius:4,overflow:"hidden"}}>
                  {diffLines.map((line,i) => (
                    <div key={i} className={`diff-line diff-${line.type}`}>
                      <span style={{marginRight:8,opacity:0.5}}>
                        {line.type==="add"?"+":line.type==="remove"?"-":" "}
                      </span>
                      {line.text || <>&nbsp;</>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:10,color:"var(--muted)",marginBottom:8,letterSpacing:"1px",textTransform:"uppercase"}}>
                  Prompt body · v{activeVersion}
                </div>
                <div className="code-area" style={{fontSize:11}}>
                  {activeVersion===4 ? PROMPT_BODY.v4 : PROMPT_BODY.v3}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New prompt modal */}
      {showNew && (
        <div className="modal-backdrop" onClick={()=>setShowNew(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">New Prompt Version</div>
            <div className="modal-sub">Creating a new version of "{prompt?.name}"</div>
            <div style={{marginBottom:12}}>
              <label className="form-label">Prompt Body</label>
              <textarea className="code-input" value={newPromptText}
                onChange={e=>setNewPromptText(e.target.value)} rows={12}/>
            </div>
            <div>
              <label className="form-label">Change Note</label>
              <input className="field" placeholder="e.g. Improved tone instructions"
                value={newNote} onChange={e=>setNewNote(e.target.value)}/>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setShowNew(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>setShowNew(false)}>Save Version</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── API Gateway ───────────────────────────────────────────────────────────────
function Gateway() {
  const [tab, setTab] = useState("routes");
  const [copied, setCopied] = useState(false);

  const apiKey = "ig-sk-live_4xKj9mN2pQ8rT6vW1yZ5aB3cD7eF0hI";

  const copy = () => {
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div className="fade-in">
      {/* API Key */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-header">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Icon name="key" size={14}/>
            <div className="card-title">Your Infergate API Key</div>
          </div>
        </div>
        <div style={{
          background:"#070809", border:"1px solid var(--border)", borderRadius:4,
          padding:"12px 16px", display:"flex", alignItems:"center", gap:12
        }}>
          <code style={{flex:1,fontSize:12,color:"var(--accent)",letterSpacing:"0.5px"}}>
            {apiKey}
          </code>
          <button className="btn btn-ghost" onClick={copy} style={{flexShrink:0}}>
            <Icon name="copy" size={11}/> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div style={{marginTop:12,fontSize:11,color:"var(--muted)"}}>
          Replace your existing provider base URL with{" "}
          <code style={{color:"var(--accent2)"}}>https://api.infergate.io/v1</code>{" "}
          — all other code stays the same.
        </div>
        <div className="code-area" style={{marginTop:12,fontSize:11}}>
          <span className="cmt"># Before</span>{"\n"}
          client = OpenAI(<span className="key">api_key</span>=<span className="str">"sk-..."</span>, <span className="key">base_url</span>=<span className="str">"https://api.openai.com/v1"</span>){"\n\n"}
          <span className="cmt"># After — one line change</span>{"\n"}
          client = OpenAI(<span className="key">api_key</span>=<span className="str">"{apiKey}"</span>, <span className="key">base_url</span>=<span className="str">"https://api.infergate.io/v1"</span>)
        </div>
      </div>

      <div className="tabs">
        {["routes","models","fallback"].map(t=>(
          <div key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </div>
        ))}
      </div>

      {tab==="routes" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Active Routes</div>
            <span className="tag tag-green">3 routes</span>
          </div>
          {ROUTES.map((r,i) => (
            <div key={i} className="route-card">
              <span className={`route-method ${r.method.toLowerCase()}`}>{r.method}</span>
              <div style={{flex:1}}>
                <div className="route-path">{r.path}</div>
                <div className="route-target">→ {r.target}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:11,color:"var(--accent)"}}>{r.rps} req/s</div>
                <div style={{fontSize:10,color:"var(--muted)"}}>{r.latency}ms avg</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="models" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Model Registry</div>
          </div>
          <table className="table">
            <thead>
              <tr><th>Model ID</th><th>Provider</th><th>Context</th><th>Input $/1M</th><th>Output $/1M</th><th>Status</th></tr>
            </thead>
            <tbody>
              {[
                { id:"gpt-4o", prov:"OpenAI", ctx:"128K", inp:"$2.50", out:"$10.00", ok:true },
                { id:"gpt-4o-mini", prov:"OpenAI", ctx:"128K", inp:"$0.15", out:"$0.60", ok:true },
                { id:"claude-sonnet-4-6", prov:"Anthropic", ctx:"200K", inp:"$3.00", out:"$15.00", ok:true },
                { id:"claude-haiku-4-5", prov:"Anthropic", ctx:"200K", inp:"$0.25", out:"$1.25", ok:true },
                { id:"gemini-2.0-flash", prov:"Google", ctx:"1M", inp:"$0.10", out:"$0.40", ok:false },
              ].map(m=>(
                <tr key={m.id}>
                  <td><code style={{fontSize:11,color:"var(--accent2)"}}>{m.id}</code></td>
                  <td style={{color:"var(--muted)"}}>{m.prov}</td>
                  <td>{m.ctx}</td>
                  <td style={{color:"var(--accent3)"}}>{m.inp}</td>
                  <td style={{color:"var(--accent3)"}}>{m.out}</td>
                  <td><span className={`tag tag-${m.ok?"green":"gray"}`}>{m.ok?"active":"disabled"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==="fallback" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Fallback Chain</div>
            <div className="card-sub">Automatically retries down the chain on failure or rate-limit</div>
          </div>
          {[
            { order:1, model:"gpt-4o", trigger:"primary", color:"var(--accent)" },
            { order:2, model:"claude-sonnet-4-6", trigger:"on 429 / 500 from primary", color:"var(--accent2)" },
            { order:3, model:"gpt-4o-mini", trigger:"on 429 / 500 from #2", color:"var(--warn)" },
          ].map(f=>(
            <div key={f.order} style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"12px 0", borderBottom:"1px solid var(--border)"
            }}>
              <div style={{
                width:28, height:28, borderRadius:"50%", background:"var(--surface2)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,color:f.color,flexShrink:0
              }}>{f.order}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500}}>{f.model}</div>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{f.trigger}</div>
              </div>
              <div style={{width:60}}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${100-f.order*20}%`,background:f.color}}/>
                </div>
              </div>
            </div>
          ))}
          <div style={{marginTop:16,fontSize:11,color:"var(--muted)"}}>
            <Icon name="zap" size={11}/>{" "}
            Infergate automatically retries with exponential backoff (100ms → 200ms → 400ms) before falling back.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Observability ─────────────────────────────────────────────────────────────
function Observability() {
  const [tab, setTab] = useState("live");

  return (
    <div className="fade-in">
      <div className="grid-4" style={{marginBottom:20}}>
        {[
          { label:"Requests/min", value:"48", color:"green", delta:"↑ 12%" },
          { label:"Error Rate", value:"0.8%", color:"yellow", delta:"↓ 0.2%" },
          { label:"p50 Latency", value:"612ms", color:"blue", delta:"↓ 44ms" },
          { label:"p99 Latency", value:"2,840ms", color:"orange", delta:"↑ 120ms" },
        ].map(s=>(
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
            <div className="stat-delta"><span>{s.delta}</span></div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {["live","cost","errors"].map(t=>(
          <div key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </div>
        ))}
      </div>

      {tab==="live" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Live Request Log</div>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"var(--accent)"}}>
              <span className="status-dot"/> STREAMING
            </div>
          </div>
          {LOGS.map((l,i)=>(
            <div key={i} className="log-entry">
              <div className="log-time">{l.time}</div>
              <div className="log-method">
                <span className={`tag tag-${l.status===200?"green":l.status===429?"yellow":"red"}`} style={{fontSize:9}}>
                  {l.status}
                </span>
              </div>
              <div className="log-body">
                <div className="log-path">{l.path}</div>
                <div className="log-meta">
                  {l.model} · {l.latency}ms · {l.tokens} tokens · ${l.cost.toFixed(3)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==="cost" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cost Breakdown</div>
            <div className="card-sub">Today</div>
          </div>
          {[
            { model:"gpt-4o", spend:58.40, tokens:"1.8M", pct:64 },
            { model:"claude-sonnet-4-6", spend:21.20, tokens:"0.9M", pct:23 },
            { model:"gpt-4o-mini", spend:11.70, tokens:"0.9M", pct:13 },
          ].map(m=>(
            <div key={m.model} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}>
                <span>{m.model}</span>
                <span style={{color:"var(--accent3)"}}>${m.spend.toFixed(2)}</span>
              </div>
              <div className="progress-bar" style={{height:6}}>
                <div className="progress-fill" style={{width:`${m.pct}%`,background:"var(--accent3)"}}/>
              </div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>{m.tokens} tokens · {m.pct}% of budget</div>
            </div>
          ))}
          <div style={{borderTop:"1px solid var(--border)",paddingTop:14,display:"flex",justifyContent:"space-between",fontSize:12}}>
            <span style={{color:"var(--muted)"}}>Total today</span>
            <span style={{color:"var(--accent3)",fontWeight:700}}>$91.30 / $150.00 budget</span>
          </div>
        </div>
      )}

      {tab==="errors" && (
        <div className="card">
          <div className="card-header"><div className="card-title">Error Analysis</div></div>
          {[
            { code:"429", label:"Rate Limited", count:34, model:"gpt-4o", color:"warn" },
            { code:"500", label:"Internal Server Error", count:8, model:"gpt-4o-mini", color:"red" },
            { code:"400", label:"Bad Request", count:3, model:"claude-sonnet-4-6", color:"orange" },
          ].map(e=>(
            <div key={e.code} style={{
              display:"flex",alignItems:"center",gap:14,
              padding:"12px 0",borderBottom:"1px solid var(--border)"
            }}>
              <span className={`tag tag-${e.color}`} style={{fontSize:12,minWidth:40,justifyContent:"center"}}>
                {e.code}
              </span>
              <div style={{flex:1}}>
                <div style={{fontSize:12}}>{e.label}</div>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{e.model}</div>
              </div>
              <div style={{fontSize:12,fontWeight:700}}>{e.count}x</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Eval Testing ──────────────────────────────────────────────────────────────
function Testing() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(TESTS);
  const [progress, setProgress] = useState(100);

  const runTests = () => {
    setRunning(true);
    setProgress(0);
    setResults(TESTS.map(t=>({...t,status:"run"})));
    let p = 0;
    const iv = setInterval(()=>{
      p += 10;
      setProgress(p);
      if(p >= 100) {
        clearInterval(iv);
        setRunning(false);
        setResults(TESTS);
      }
    }, 200);
  };

  const pass = results.filter(t=>t.status==="pass").length;
  const fail = results.filter(t=>t.status==="fail").length;

  return (
    <div className="fade-in">
      <div className="grid-3" style={{marginBottom:20}}>
        <div className="stat-card green">
          <div className="stat-label">Passing</div>
          <div className="stat-value green">{pass}</div>
        </div>
        <div className="stat-card" style={{borderTop:"2px solid var(--danger)"}}>
          <div className="stat-label">Failing</div>
          <div className="stat-value" style={{color:"var(--danger)"}}>{fail}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Pass Rate</div>
          <div className="stat-value blue">{Math.round(pass/results.length*100)}%</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Eval Suite</div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost">+ Add Test</button>
            <button className="btn btn-primary" onClick={runTests} disabled={running}>
              <Icon name="play" size={11}/> {running ? "Running..." : "Run All"}
            </button>
          </div>
        </div>

        {running && (
          <div style={{marginBottom:16}}>
            <div className="progress-bar" style={{height:6}}>
              <div className="progress-fill" style={{width:`${progress}%`,background:"var(--accent)",transition:"width 0.2s"}}/>
            </div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:6}}>{progress}% complete</div>
          </div>
        )}

        {results.map(t=>(
          <div key={t.id} className="test-row">
            <div className={`test-indicator test-${t.status}`}/>
            <div style={{flex:1}}>
              <div style={{fontSize:12}}>{t.name}</div>
              <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>
                {PROMPTS.find(p=>p.id===t.prompt)?.name} · expects: {t.expected}
              </div>
            </div>
            <div style={{fontSize:10,color:"var(--muted)",marginRight:8}}>{t.latency}ms</div>
            <span className={`tag tag-${t.status==="pass"?"green":t.status==="fail"?"red":"yellow"}`}>
              {t.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Replay & Debug ────────────────────────────────────────────────────────────
function Replay() {
  const [selected, setSelected] = useState(null);

  const requests = LOGS.map((l,i)=>({...l, id:`req_${i}`, body:`{"model":"${l.model}","messages":[{"role":"user","content":"Hello, I need help with my account."}],"max_tokens":500}` }));

  const sel = selected !== null ? requests[selected] : null;

  return (
    <div className="fade-in" style={{display:"flex",gap:20}}>
      {/* List */}
      <div style={{width:300,flexShrink:0}}>
        <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
          Recent Requests
        </div>
        {requests.map((r,i)=>(
          <div key={i}
            onClick={()=>setSelected(i)}
            style={{
              padding:"10px 12px",borderRadius:5,marginBottom:6,cursor:"pointer",
              background: selected===i?"var(--surface2)":"var(--surface)",
              border:`1px solid ${selected===i?"var(--border2)":"var(--border)"}`,
              transition:"all 0.12s"
            }}>
            <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
              <span className={`tag tag-${r.status===200?"green":r.status===429?"yellow":"red"}`} style={{fontSize:9}}>
                {r.status}
              </span>
              <span style={{fontSize:11,color:"var(--muted)"}}>{r.time}</span>
              <span style={{marginLeft:"auto",fontSize:10,color:"var(--muted)"}}>{r.latency}ms</span>
            </div>
            <div style={{fontSize:11}}>{r.model}</div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{r.tokens} tokens · ${r.cost.toFixed(3)}</div>
          </div>
        ))}
      </div>

      {/* Detail */}
      <div style={{flex:1}}>
        {sel ? (
          <div>
            <div className="card" style={{marginBottom:16}}>
              <div className="card-header">
                <div>
                  <div className="card-title">Request Detail</div>
                  <div className="card-sub">{sel.time} · {sel.model}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost"><Icon name="replay" size={11}/> Replay</button>
                  <button className="btn btn-ghost"><Icon name="copy" size={11}/> Copy as cURL</button>
                </div>
              </div>
              <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16}}>
                {[
                  ["Status", sel.status, sel.status===200?"var(--accent)":"var(--danger)"],
                  ["Latency", `${sel.latency}ms`, "var(--text)"],
                  ["Tokens", sel.tokens || "—", "var(--text)"],
                  ["Cost", `$${sel.cost.toFixed(3)}`, "var(--accent3)"],
                ].map(([k,v,c])=>(
                  <div key={k} style={{background:"var(--surface2)",borderRadius:4,padding:"8px 14px"}}>
                    <div style={{fontSize:9,color:"var(--muted)",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px"}}>{k}</div>
                    <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,color:"var(--muted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Request Body</div>
                <div className="code-area" style={{fontSize:11}}>
                  {JSON.stringify(JSON.parse(sel.body), null, 2)}
                </div>
              </div>

              {sel.status===200 && (
                <div>
                  <div style={{fontSize:10,color:"var(--muted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Response</div>
                  <div className="code-area" style={{fontSize:11}}>
{`{
  "id": "chatcmpl-9xKj4mN2pQ8rT6vW",
  "object": "chat.completion",
  "model": "${sel.model}",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! I'd be happy to help you with your account. Could you please tell me what specific issue you're experiencing?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": ${Math.round(sel.tokens * 0.3)},
    "completion_tokens": ${Math.round(sel.tokens * 0.7)},
    "total_tokens": ${sel.tokens}
  }
}`}
                  </div>
                </div>
              )}
              {sel.status !== 200 && (
                <div>
                  <div style={{fontSize:10,color:"var(--muted)",marginBottom:6,textTransform:"uppercase",letterSpacing:"1px"}}>Error Response</div>
                  <div className="code-area" style={{fontSize:11,borderColor:"var(--danger)"}}>
{`{
  "error": {
    "message": "${sel.status===429?"Rate limit exceeded. Please retry after 60s.":"Internal server error from upstream provider."}",
    "type": "${sel.status===429?"rate_limit_error":"server_error"}",
    "code": ${sel.status}
  }
}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            height:"100%",display:"flex",alignItems:"center",justifyContent:"center",
            color:"var(--muted)",fontSize:12,flexDirection:"column",gap:8
          }}>
            <Icon name="replay" size={24}/>
            <span>Select a request to inspect & replay</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
const PAGES = {
  dashboard:  { label:"Dashboard",   icon:"dashboard",  comp: Dashboard },
  prompts:    { label:"Prompts",     icon:"prompt",     comp: PromptVersioning },
  gateway:    { label:"Gateway",     icon:"gateway",    comp: Gateway },
  observe:    { label:"Observability",icon:"observe",   comp: Observability },
  testing:    { label:"Eval Testing",icon:"test",       comp: Testing, badge:"1" },
  replay:     { label:"Replay",      icon:"replay",     comp: Replay },
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const Page = PAGES[page].comp;

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="logo">
            <div className="logo-mark">Infergate</div>
            <div className="logo-sub">AI Infrastructure</div>
          </div>
          <nav className="nav">
            <div className="nav-section">Platform</div>
            {Object.entries(PAGES).map(([key,{label,icon,badge}])=>(
              <div key={key}
                className={`nav-item ${page===key?"active":""}`}
                onClick={()=>setPage(key)}>
                <Icon name={icon} size={13}/>
                {label}
                {badge && <span className="badge">{badge}</span>}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div><span className="status-dot"/>All systems operational</div>
            <div style={{marginTop:6,color:"var(--muted2)"}}>robert@infergate.io</div>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div>
              <div className="topbar-title">{PAGES[page].label}</div>
              <div className="topbar-sub">infergate.io · production</div>
            </div>
            <div className="topbar-right">
              <span style={{fontSize:10,color:"var(--muted)"}}>3 prompts in production</span>
              <button className="btn btn-primary"><Icon name="plus" size={11}/> New Prompt</button>
            </div>
          </div>
          <div className="content">
            <Page key={page}/>
          </div>
        </div>
      </div>
    </>
  );
}
