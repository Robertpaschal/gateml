import Link from "next/link";

const ENTRIES = [
  {
    date: "Jun 2026",
    version: "v0.3",
    tag: "new",
    title: "Go, Ruby, and PHP SDKs",
    desc: "Official SDKs now available for Go, Ruby, and PHP. Drop-in replacements for the OpenAI client in each language.",
  },
  {
    date: "May 2026",
    version: "v0.2",
    tag: "new",
    title: "Eval Testing + Prompt Versioning",
    desc: "Write assertions against your prompts, run them in CI, and version your prompts with full diffs and rollback.",
  },
  {
    date: "Apr 2026",
    version: "v0.1",
    tag: "launch",
    title: "Public Beta Launch",
    desc: "GateML is live. Test and live API keys, OpenAI-compatible gateway, automatic fallback chain, and real-time request logs.",
  },
];

export function ChangelogPreview() {
  return (
    <section className="section" style={{ borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div className="section-label">Changelog</div>
          <h2 className="section-title" style={{ marginBottom: 0 }}>What's new</h2>
        </div>
        <Link href="/changelog" className="btn btn-ghost">View all →</Link>
      </div>

      {ENTRIES.map(e => (
        <div key={e.version} className="changelog-entry">
          <div className="changelog-date">{e.date}</div>
          <div className="changelog-content">
            <div className="changelog-version">
              <span className="tag tag-gray" style={{ fontSize: 9 }}>{e.version}</span>
              <span className={`tag tag-${e.tag === "launch" ? "orange" : "green"}`} style={{ fontSize: 9 }}>
                {e.tag}
              </span>
            </div>
            <div className="changelog-title">{e.title}</div>
            <div className="changelog-desc">{e.desc}</div>
          </div>
        </div>
      ))}
    </section>
  );
}
