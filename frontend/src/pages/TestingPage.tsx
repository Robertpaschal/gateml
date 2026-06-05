"use client";
import { useState } from "react";
import { Icon } from "../components/Icons";

interface EvalTest {
  id: string; name: string; prompt: string; expected: string;
  status: "pass" | "fail" | "run"; latency: number;
}

const INITIAL_TESTS: EvalTest[] = [
  { id: "t1", name: "Returns greeting when user provides name",  prompt: "Customer Support Bot", expected: "contains greeting",          status: "pass", latency: 834 },
  { id: "t2", name: "Escalates billing disputes correctly",      prompt: "Customer Support Bot", expected: "contains 'tier-2'",          status: "pass", latency: 912 },
  { id: "t3", name: "Does not speculate on roadmap",             prompt: "Customer Support Bot", expected: "no roadmap mention",         status: "pass", latency: 768 },
  { id: "t4", name: "Handles empty input gracefully",            prompt: "Customer Support Bot", expected: "asks clarifying question",   status: "fail", latency: 1240 },
  { id: "t5", name: "Response under 150 tokens",                 prompt: "Code Review Assistant", expected: "tokens < 150",             status: "pass", latency: 390 },
  { id: "t6", name: "Identifies security issues in code",        prompt: "Code Review Assistant", expected: "contains 'vulnerability'", status: "pass", latency: 642 },
];

export function TestingPage() {
  const [running, setRunning] = useState(false);
  const [tests, setTests] = useState<EvalTest[]>(INITIAL_TESTS);
  const [progress, setProgress] = useState(100);

  const runAll = () => {
    setRunning(true); setProgress(0);
    setTests(t => t.map(i => ({ ...i, status: "run" })));
    let p = 0;
    const iv = setInterval(() => {
      p += 10; setProgress(p);
      if (p >= 100) { clearInterval(iv); setRunning(false); setTests(INITIAL_TESTS); }
    }, 200);
  };

  const pass = tests.filter(t => t.status === "pass").length;
  const fail = tests.filter(t => t.status === "fail").length;

  return (
    <div className="fade-in">
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="stat-card green"><div className="stat-label">Passing</div><div className="stat-value green">{pass}</div></div>
        <div className="stat-card" style={{ borderTop: "2px solid var(--danger)" }}><div className="stat-label">Failing</div><div className="stat-value" style={{ color: "var(--danger)" }}>{fail}</div></div>
        <div className="stat-card blue"><div className="stat-label">Pass Rate</div><div className="stat-value blue">{tests.length > 0 ? Math.round((pass / tests.length) * 100) : 0}%</div></div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">Eval Suite</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost">+ Add Test</button>
            <button className="btn btn-primary" onClick={runAll} disabled={running}>
              <Icon name="play" size={11} /> {running ? "Running..." : "Run All"}
            </button>
          </div>
        </div>
        {running && (
          <div style={{ marginBottom: 16 }}>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${progress}%`, background: "var(--accent)" }} />
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>{progress}% complete</div>
          </div>
        )}
        {tests.map(t => (
          <div key={t.id} className="test-row">
            <div className={`test-indicator test-${t.status}`} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{t.prompt} · expects: {t.expected}</div>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginRight: 8 }}>{t.latency}ms</div>
            <span className={`tag tag-${t.status === "pass" ? "green" : t.status === "fail" ? "red" : "yellow"}`}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
