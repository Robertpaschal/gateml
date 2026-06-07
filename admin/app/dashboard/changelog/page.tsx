"use client";
import { useState } from "react";
import { systemApi } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

const TAGS = ["new", "fix", "launch", "deprecation", "security"];

interface ChangelogForm {
  id: string; version: string; date: string; title: string;
  tag: string; changes: string; order: number;
}

function emptyForm(): ChangelogForm {
  return {
    id: "", version: "", date: new Date().toISOString().slice(0, 10),
    title: "", tag: "new", changes: "", order: 1,
  };
}

export default function ChangelogPage() {
  const [form,    setForm]    = useState<ChangelogForm>(emptyForm());
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState("");

  function update(field: keyof ChangelogForm, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = getAdminToken();
    if (!token) return;
    setSaving(true);
    setMessage("");
    try {
      const changes = form.changes
        .split("\n")
        .map(l => l.trim())
        .filter(Boolean);

      await systemApi.upsertChangelog(token, {
        id:      form.id || form.version,
        version: form.version,
        date:    form.date,
        title:   form.title,
        tag:     form.tag,
        changes,
        order:   Number(form.order),
      });
      setMessage("Changelog entry published to Firestore.");
      setForm(emptyForm());
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1 className="page-title">Publish Changelog</h1>
      </div>

      <div className="card">
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Version" hint="e.g. v0.5.0">
              <input value={form.version} onChange={e => update("version", e.target.value)} placeholder="v0.5.0" required />
            </Field>
            <Field label="Doc ID" hint="Firestore key (defaults to version)">
              <input value={form.id} onChange={e => update("id", e.target.value)} placeholder="v0.5.0" />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12 }}>
            <Field label="Title">
              <input value={form.title} onChange={e => update("title", e.target.value)} placeholder="Billing & Admin panel" required />
            </Field>
            <Field label="Date">
              <input type="date" value={form.date} onChange={e => update("date", e.target.value)} required />
            </Field>
            <Field label="Order" hint="1 = latest">
              <input type="number" value={form.order} min={1} onChange={e => update("order", Number(e.target.value))} required />
            </Field>
          </div>

          <Field label="Tag">
            <select value={form.tag} onChange={e => update("tag", e.target.value)}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Changes" hint="One per line">
            <textarea
              value={form.changes}
              onChange={e => update("changes", e.target.value)}
              rows={6}
              placeholder={"Admin control panel\nEmail notifications\nSupport contact form"}
              required
              style={{ resize: "vertical" }}
            />
          </Field>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Publishing…" : "Publish Entry"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(emptyForm())}>
              Reset
            </button>
            {message && (
              <span style={{ fontSize: 11, color: message.includes("published") ? "var(--green)" : "var(--red)" }}>
                {message}
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16, fontSize: 11, color: "var(--muted)" }}>
        <strong style={{ color: "var(--text)" }}>Tip:</strong> Entries write directly to Firestore and appear on the consumer
        changelog page without a redeploy. Use <code style={{ color: "var(--accent-h)" }}>order: 1</code> for the newest entry —
        lower numbers appear first.
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}{hint && <span style={{ textTransform: "none", letterSpacing: 0, marginLeft: 6, opacity: 0.6 }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}
