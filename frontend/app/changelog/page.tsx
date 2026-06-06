"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { subscribeToChangelog, type ChangelogEntry } from "@/lib/firebase";

export default function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToChangelog(data => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 48px" }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Changelog</div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 48 }}>
          New features, improvements, and fixes — in order of newest first.
        </p>

        {loading && (
          <div style={{ color: "var(--muted2)", fontSize: 13 }}>Loading…</div>
        )}

        {entries.map(entry => (
          <div key={entry.id ?? entry.version} style={{ marginBottom: 56 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 800 }}>{entry.title}</span>
              <span className={`tag tag-${entry.tag === "launch" ? "orange" : entry.tag === "fix" ? "gray" : "green"}`} style={{ fontSize: 10 }}>{entry.tag}</span>
              <span className="tag tag-gray" style={{ fontSize: 9 }}>{entry.version}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 16 }}>{entry.date}</div>
            <ul style={{ listStyle: "none", paddingLeft: 0 }}>
              {entry.changes.map((c, i) => (
                <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--muted)", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0 }}>+</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Footer />
    </>
  );
}
