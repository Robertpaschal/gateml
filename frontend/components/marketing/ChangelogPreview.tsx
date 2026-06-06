"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { subscribeToChangelog, type ChangelogEntry } from "@/lib/firebase";

export function ChangelogPreview() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    // entries arrive sorted by order asc (newest first); take 3 for the preview
    const unsub = subscribeToChangelog(data => setEntries(data.slice(0, 3)));
    return unsub;
  }, []);

  return (
    <section className="section" style={{ borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
        <div>
          <div className="section-label">Changelog</div>
          <h2 className="section-title" style={{ marginBottom: 0 }}>What&apos;s new</h2>
        </div>
        <Link href="/changelog" className="btn btn-ghost">View all →</Link>
      </div>

      {entries.length === 0 && (
        <div style={{ color: "var(--muted2)", fontSize: 13 }}>Loading…</div>
      )}

      {entries.map(e => (
        <div key={e.id ?? e.version} className="changelog-entry">
          <div className="changelog-date">{e.date}</div>
          <div className="changelog-content">
            <div className="changelog-version">
              <span className="tag tag-gray" style={{ fontSize: 9 }}>{e.version}</span>
              <span className={`tag tag-${e.tag === "launch" ? "orange" : e.tag === "fix" ? "gray" : "green"}`} style={{ fontSize: 9 }}>
                {e.tag}
              </span>
            </div>
            <div className="changelog-title">{e.title}</div>
            <div className="changelog-desc">{e.changes[0]}</div>
            {e.changes[1] && (
              <div className="changelog-desc" style={{ opacity: 0.7 }}>{e.changes[1]}</div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
