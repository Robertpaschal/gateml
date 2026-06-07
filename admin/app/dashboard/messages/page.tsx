"use client";
import { useEffect, useState, useCallback } from "react";
import { messagesApi, type SupportMessage } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

const STATUS_FILTERS   = ["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const CATEGORY_FILTERS = ["", "ENTERPRISE_LEAD", "SUPPORT", "GENERAL"];

const STATUS_CLASS: Record<string, string> = {
  OPEN:        "badge-red",
  IN_PROGRESS: "badge-yellow",
  RESOLVED:    "badge-green",
  CLOSED:      "badge-muted",
};

const CAT_CLASS: Record<string, string> = {
  ENTERPRISE_LEAD: "badge-purple",
  SUPPORT:         "badge-muted",
  GENERAL:         "badge-muted",
};

const CAT_LABEL: Record<string, string> = {
  ENTERPRISE_LEAD: "Lead",
  SUPPORT:         "Support",
  GENERAL:         "General",
};

function statusBadge(s: string) {
  return <span className={`badge ${STATUS_CLASS[s] ?? "badge-muted"}`}>{s.replace("_", " ")}</span>;
}

function categoryBadge(c: string) {
  return <span className={`badge ${CAT_CLASS[c] ?? "badge-muted"}`}>{CAT_LABEL[c] ?? c}</span>;
}

export default function MessagesPage() {
  const [data,      setData]      = useState<{ messages: SupportMessage[]; total: number } | null>(null);
  const [status,    setStatus]    = useState("");
  const [category,  setCategory]  = useState("");
  const [selected,  setSelected]  = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending,   setSending]   = useState(false);
  const [sendMsg,   setSendMsg]   = useState("");

  const load = useCallback((st: string, cat: string) => {
    const token = getAdminToken();
    if (!token) return;
    messagesApi.list(token, st || undefined, cat || undefined)
      .then(setData)
      .catch(console.error);
  }, []);

  useEffect(() => { load(status, category); }, [status, category, load]);

  function selectMessage(m: SupportMessage) {
    setSelected(m);
    setReplyText("");
    setSendMsg("");
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    const token = getAdminToken();
    if (!token) return;
    setSending(true);
    try {
      await messagesApi.reply(token, selected.id, replyText.trim());
      setSendMsg("Reply sent.");
      setReplyText("");
      setSelected(prev => prev ? { ...prev, status: "RESOLVED" } : prev);
      load(status, category);
    } catch (e: unknown) {
      setSendMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!selected) return;
    const token = getAdminToken();
    if (!token) return;
    await messagesApi.updateStatus(token, selected.id, newStatus);
    setSelected(prev => prev ? { ...prev, status: newStatus } : prev);
    load(status, category);
  }

  const isLead = selected?.category === "ENTERPRISE_LEAD";

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 56px)" }}>
      {/* List pane */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">
            Contacts{data ? <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>({data.total})</span> : ""}
          </h1>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6 }}>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ flex: 1, fontSize: 11, padding: "5px 8px" }}>
            {CATEGORY_FILTERS.map(c => <option key={c} value={c}>{c ? CAT_LABEL[c] : "All types"}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: 1, fontSize: 11, padding: "5px 8px" }}>
            {STATUS_FILTERS.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
        </div>

        {/* Message list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
          {data?.messages.map(m => (
            <div
              key={m.id}
              onClick={() => selectMessage(m)}
              className="card"
              style={{
                cursor: "pointer",
                padding: "11px 13px",
                borderColor: selected?.id === m.id
                  ? (m.category === "ENTERPRISE_LEAD" ? "var(--accent)" : "var(--accent)")
                  : m.category === "ENTERPRISE_LEAD" ? "rgba(124,92,191,.4)" : "var(--border)",
                transition: "border-color 0.1s",
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {m.category !== "SUPPORT" && categoryBadge(m.category ?? "SUPPORT")}
                  {statusBadge(m.status)}
                </div>
                <span style={{ fontSize: 9, color: "var(--muted2)" }}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </span>
              </div>
              {/* Name + company */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                {m.name}
                {m.company && <span style={{ color: "var(--muted)", fontWeight: 400, marginLeft: 5 }}>· {m.company}</span>}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.subject}
              </div>
            </div>
          ))}
          {data?.messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--muted2)", padding: 24, fontSize: 11 }}>
              No contacts match this filter
            </div>
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {selected ? (
          <div className="card">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
              <div>
                <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
                  {categoryBadge(selected.category ?? "SUPPORT")}
                  {statusBadge(selected.status)}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{selected.subject}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>
                  <strong style={{ color: "var(--text)" }}>{selected.name}</strong>
                  {" "}·{" "}
                  <a href={`mailto:${selected.email}`} style={{ color: "var(--accent2)" }}>{selected.email}</a>
                  {selected.company && (
                    <span> · <strong style={{ color: "var(--text)" }}>{selected.company}</strong></span>
                  )}
                  {selected.user && (
                    <span> · <a href={`/dashboard/users/${selected.user.id}`} style={{ color: "var(--accent)" }}>
                      view account ({selected.user.plan})
                    </a></span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted2)", marginTop: 4 }}>
                  {new Date(selected.createdAt).toLocaleString()}
                </div>
              </div>

              {/* Status control */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 16 }}>
                {["OPEN","IN_PROGRESS","RESOLVED","CLOSED"].map(s => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className="btn btn-ghost"
                    style={{
                      fontSize: 9, padding: "4px 8px",
                      ...(selected.status === s ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}),
                    }}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Enterprise lead callout */}
            {isLead && (
              <div style={{
                padding: "10px 14px", marginBottom: 16, borderRadius: 4,
                background: "rgba(124,92,191,.08)", border: "1px solid rgba(124,92,191,.25)",
                fontSize: 11, color: "var(--muted)", lineHeight: 1.7,
              }}>
                <strong style={{ color: "var(--accent-h, #9d7de8)" }}>Enterprise lead</strong>
                {selected.company && ` from ${selected.company}`}
                {selected.user
                  ? " — existing GateML user"
                  : " — not yet a GateML user"
                }
                . Follow up within 1 business day.
              </div>
            )}

            {/* Message body */}
            <div style={{
              padding: 16, background: "var(--surface2)", borderRadius: 4,
              marginBottom: 18, fontSize: 12, lineHeight: 1.8,
              color: "var(--text)", whiteSpace: "pre-wrap",
              border: "1px solid var(--border)",
            }}>
              {selected.body}
            </div>

            {/* Previous reply */}
            {selected.replyBody && (
              <div style={{
                padding: "12px 14px", marginBottom: 16, borderRadius: 4,
                background: "rgba(0,255,136,.05)", border: "1px solid rgba(0,255,136,.15)",
                fontSize: 11,
              }}>
                <div style={{ color: "var(--muted)", marginBottom: 5, fontSize: 10 }}>
                  Reply sent · {selected.repliedAt ? new Date(selected.repliedAt).toLocaleString() : ""}
                </div>
                <div style={{ color: "var(--text)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{selected.replyBody}</div>
              </div>
            )}

            {/* Reply form */}
            {selected.status !== "RESOLVED" && selected.status !== "CLOSED" && (
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: 6 }}>
                  Reply — email sent to <span style={{ color: "var(--accent2)" }}>{selected.email}</span>
                </label>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  rows={5}
                  placeholder={isLead
                    ? "Hi, thanks for reaching out about Enterprise! I'd love to learn more about your use case…"
                    : "Hi, thanks for contacting GateML support…"
                  }
                  style={{
                    width: "100%", background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 4, padding: "12px 14px", fontFamily: "var(--font-mono)",
                    fontSize: 12, color: "var(--text)", outline: "none", resize: "vertical",
                    lineHeight: 1.7, marginBottom: 10,
                  }}
                />
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    className="btn btn-primary"
                    disabled={sending || !replyText.trim()}
                    onClick={sendReply}
                  >
                    {sending ? "Sending…" : "Send reply"}
                  </button>
                  {sendMsg && (
                    <span style={{ fontSize: 11, color: sendMsg === "Reply sent." ? "var(--green)" : "var(--red)" }}>
                      {sendMsg}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            color: "var(--muted2)", fontSize: 12, gap: 8,
          }}>
            <div style={{ fontSize: 28, opacity: 0.3 }}>◻</div>
            Select a contact to view
          </div>
        )}
      </div>
    </div>
  );
}
