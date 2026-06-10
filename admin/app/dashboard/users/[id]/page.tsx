"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminUsersApi, notesApi, adminEmailApi, adminBillingActionsApi, type AdminUserDetail, type AdminNote, type StripeInvoice } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

const PLANS = ["FREE", "PRO", "ENTERPRISE"];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 11, color: "var(--text)" }}>{value}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
      {children}
    </div>
  );
}

export default function UserDetailPage() {
  const { id }    = useParams<{ id: string }>();
  const router    = useRouter();
  const [data,    setData]    = useState<AdminUserDetail | null>(null);
  const [notes,   setNotes]   = useState<AdminNote[]>([]);
  const [plan,    setPlan]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState("");
  const [error,   setError]   = useState("");

  const [noteBody,  setNoteBody]  = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody,    setEmailBody]    = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg,     setEmailMsg]     = useState("");

  const [invoices,       setInvoices]       = useState<StripeInvoice[]>([]);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);
  const [resendingId,    setResendingId]    = useState<string | null>(null);
  const [refundCents,    setRefundCents]    = useState("");
  const [refundReason,   setRefundReason]   = useState("requested_by_customer");
  const [refunding,      setRefunding]      = useState(false);
  const [refundMsg,      setRefundMsg]      = useState("");
  const [cancelling,     setCancelling]     = useState(false);
  const [cancelMsg,      setCancelMsg]      = useState("");

  const token = getAdminToken()!;

  useEffect(() => {
    if (!token || !id) return;
    Promise.all([
      adminUsersApi.get(token, id),
      notesApi.list(token, id),
    ]).then(([d, n]) => {
      setData(d);
      setPlan(d.user.plan);
      setNotes(n);
    }).catch(e => setError(e.message));
  }, [id]);

  async function savePlan() {
    setSaving(true); setMessage("");
    try {
      await adminUsersApi.updatePlan(token, id, plan);
      setMessage(`Plan updated to ${plan}`);
      setData(prev => prev ? { ...prev, user: { ...prev.user, plan } } : prev);
    } catch (e: unknown) { setMessage(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setAddingNote(true);
    try {
      const n = await notesApi.add(token, id, noteBody.trim());
      setNotes(prev => [n, ...prev]);
      setNoteBody("");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to add note"); }
    finally { setAddingNote(false); }
  }

  async function deleteNote(noteId: string) {
    try {
      await notesApi.delete(token, id, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to delete note"); }
  }

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault();
    setSendingEmail(true); setEmailMsg("");
    try {
      const result = await adminEmailApi.send(token, id, emailSubject, emailBody);
      setEmailMsg(`Sent to ${result.to}`);
      setEmailSubject(""); setEmailBody("");
    } catch (e: unknown) { setEmailMsg(e instanceof Error ? e.message : "Failed"); }
    finally { setSendingEmail(false); }
  }

  async function loadInvoices() {
    if (invoicesLoaded) return;
    try {
      const { invoices: list } = await adminBillingActionsApi.listInvoices(token, id);
      setInvoices(list);
      setInvoicesLoaded(true);
    } catch { /* stripe not configured or no customer */ }
  }

  async function resendInvoice(invoiceId: string) {
    setResendingId(invoiceId);
    try {
      await adminBillingActionsApi.resendInvoice(token, id, invoiceId);
    } finally { setResendingId(null); }
  }

  async function issueRefund(e: React.FormEvent) {
    e.preventDefault();
    setRefunding(true); setRefundMsg("");
    try {
      const cents = refundCents ? parseInt(refundCents, 10) : undefined;
      const res = await adminBillingActionsApi.issueRefund(token, id, cents, refundReason || undefined);
      setRefundMsg(`Refund ${res.refundId} issued — $${(res.amountCents / 100).toFixed(2)}`);
      setRefundCents("");
    } catch (e: unknown) {
      setRefundMsg(e instanceof Error ? e.message : "Refund failed");
    } finally { setRefunding(false); }
  }

  async function cancelSubscription(immediately: boolean) {
    if (!confirm(immediately ? "Cancel immediately? The user loses access now." : "Cancel at period end?")) return;
    setCancelling(true); setCancelMsg("");
    try {
      await adminBillingActionsApi.cancelSubscription(token, id, immediately);
      setCancelMsg(immediately ? "Subscription cancelled immediately." : "Subscription set to cancel at period end.");
    } catch (e: unknown) {
      setCancelMsg(e instanceof Error ? e.message : "Failed");
    } finally { setCancelling(false); }
  }

  if (error) return <div style={{ color: "var(--red)" }}>{error}</div>;
  if (!data)  return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  const { user, logs, usageThisMonth } = data;
  const planLimits: Record<string, number> = { FREE: 1000, PRO: 100000, ENTERPRISE: -1 };
  const quotaLimit = planLimits[user.plan] ?? 1000;
  const quotaPct   = quotaLimit === -1 ? 0 : Math.min(100, Math.round((usageThisMonth / quotaLimit) * 100));

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => router.push("/dashboard/users")} style={{ fontSize: 11 }}>
            ← Users
          </button>
          <h1 className="page-title">{user.email}</h1>
          <span className={`badge ${user.plan === "PRO" ? "badge-purple" : user.plan === "ENTERPRISE" ? "badge-yellow" : "badge-muted"}`}>
            {user.plan}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Account */}
        <div className="card">
          <SectionTitle>Account</SectionTitle>
          <Row label="Email"    value={user.email} />
          <Row label="Name"     value={user.name ?? "—"} />
          <Row label="Provider" value={user.provider} />
          <Row label="Joined"   value={new Date(user.createdAt).toLocaleDateString()} />
          <Row label="Requests (all time)" value={user._count.requestLogs.toLocaleString()} />
          <Row label="Prompts"  value={user._count.prompts.toString()} />
          <Row label="Pay-as-you-go" value={user.payAsYouGo ? "enabled" : "disabled"} />
          <Row label="Stripe ID" value={user.stripeCustomerId ? user.stripeCustomerId.slice(0, 18) + "…" : "—"} />
        </div>

        {/* Subscription & Quota */}
        <div className="card">
          <SectionTitle>Subscription & Quota</SectionTitle>
          {user.subscription ? (
            <>
              <Row label="Status"   value={user.subscription.status} />
              <Row label="Renews"   value={new Date(user.subscription.currentPeriodEnd).toLocaleDateString()} />
            </>
          ) : (
            <Row label="Subscription" value="None" />
          )}
          <div style={{ marginTop: 12, marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Quota Used</span>
              <span style={{ fontSize: 11, color: "var(--text)" }}>
                {usageThisMonth.toLocaleString()} / {quotaLimit === -1 ? "∞" : quotaLimit.toLocaleString()}
              </span>
            </div>
            <div style={{ height: 6, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${quotaLimit === -1 ? 0 : quotaPct}%`,
                background: quotaPct > 80 ? "var(--red)" : quotaPct > 60 ? "var(--yellow, #eab308)" : "var(--accent)",
              }} />
            </div>
            {quotaLimit !== -1 && <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{quotaPct}% of monthly limit</div>}
          </div>
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>Usage History</div>
            {user.usageRecords.map(r => (
              <div key={r.month} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>{r.month}</span>
                <span style={{ fontSize: 11, color: "var(--text)", fontWeight: 500 }}>{r.requests.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Override */}
        <div className="card">
          <SectionTitle>Plan Override</SectionTitle>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <select value={plan} onChange={e => setPlan(e.target.value)} style={{ flex: 1 }}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn btn-primary" disabled={saving || plan === user.plan} onClick={savePlan}>
              {saving ? "…" : "Update"}
            </button>
          </div>
          {message && (
            <div style={{ fontSize: 11, color: message.startsWith("Plan updated") ? "var(--green)" : "var(--red)" }}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* API Keys */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            API Keys ({user.apiKeys.length})
          </span>
        </div>
        <table className="table">
          <thead><tr><th>Name</th><th>Type</th><th>Prefix</th><th>Created</th><th>Last Used</th></tr></thead>
          <tbody>
            {user.apiKeys.map(k => (
              <tr key={k.id}>
                <td>{k.name}</td>
                <td><span className={`badge ${k.type === "LIVE" ? "badge-purple" : "badge-muted"}`}>{k.type}</span></td>
                <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>{k.keyPrefix}…</td>
                <td style={{ color: "var(--muted)" }}>{new Date(k.createdAt).toLocaleDateString()}</td>
                <td style={{ color: "var(--muted)" }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {user.apiKeys.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted2)", padding: 16 }}>No API keys</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Send Custom Email */}
        <div className="card">
          <SectionTitle>Send Email to User</SectionTitle>
          <form onSubmit={sendEmail}>
            <div style={{ marginBottom: 10 }}>
              <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                placeholder="Subject" required style={{ width: "100%", marginBottom: 8 }} />
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                placeholder="Message body (HTML supported)…" required rows={5}
                style={{ width: "100%", fontFamily: "inherit", fontSize: 12 }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={sendingEmail}>
              {sendingEmail ? "Sending…" : "Send Email"}
            </button>
            {emailMsg && (
              <div style={{ fontSize: 11, marginTop: 8, color: emailMsg.startsWith("Sent") ? "var(--green)" : "var(--red)" }}>
                {emailMsg}
              </div>
            )}
          </form>
        </div>

        {/* CRM Notes */}
        <div className="card">
          <SectionTitle>CRM Notes ({notes.length})</SectionTitle>
          <form onSubmit={addNote} style={{ marginBottom: 12 }}>
            <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)}
              placeholder="Add internal note…" rows={3}
              style={{ width: "100%", fontFamily: "inherit", fontSize: 12, marginBottom: 8 }} />
            <button type="submit" className="btn btn-primary" disabled={addingNote || !noteBody.trim()}>
              {addingNote ? "Adding…" : "Add Note"}
            </button>
          </form>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {notes.map(n => (
              <div key={n.id} style={{
                padding: "10px 12px", background: "var(--surface2)", borderRadius: 6,
                marginBottom: 8, fontSize: 12, position: "relative",
              }}>
                <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>
                    {n.admin.name} · {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => deleteNote(n.id)}
                    style={{ fontSize: 10, color: "var(--red)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--muted2)", textAlign: "center", padding: 16 }}>No notes yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Billing actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Refund */}
        <div className="card">
          <SectionTitle>Issue Refund</SectionTitle>
          <form onSubmit={issueRefund}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                Amount (cents) — blank = full refund
              </label>
              <input type="number" min="50" value={refundCents}
                onChange={e => setRefundCents(e.target.value)}
                placeholder="e.g. 1900 for $19.00" style={{ width: "100%", marginBottom: 8 }} />
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Reason</label>
              <select value={refundReason} onChange={e => setRefundReason(e.target.value)} style={{ width: "100%" }}>
                <option value="requested_by_customer">Requested by customer</option>
                <option value="duplicate">Duplicate charge</option>
                <option value="fraudulent">Fraudulent</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={refunding} style={{ fontSize: 11 }}>
              {refunding ? "Issuing…" : "Issue Refund"}
            </button>
            {refundMsg && (
              <div style={{ fontSize: 11, marginTop: 8, color: refundMsg.startsWith("Refund") ? "var(--green)" : "var(--red)" }}>
                {refundMsg}
              </div>
            )}
          </form>
        </div>

        {/* Cancel subscription */}
        <div className="card">
          <SectionTitle>Cancel Subscription</SectionTitle>
          {user.subscription ? (
            <>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12 }}>
                Status: <strong>{user.subscription.status}</strong> · renews {new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-ghost" disabled={cancelling} style={{ fontSize: 11 }}
                  onClick={() => cancelSubscription(false)}>
                  Cancel at period end
                </button>
                <button className="btn btn-ghost" disabled={cancelling}
                  style={{ fontSize: 11, color: "var(--red)", borderColor: "var(--red)" }}
                  onClick={() => cancelSubscription(true)}>
                  Cancel immediately
                </button>
              </div>
              {cancelMsg && (
                <div style={{ fontSize: 11, marginTop: 8, color: cancelMsg.startsWith("Subscription") ? "var(--green)" : "var(--red)" }}>
                  {cancelMsg}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 11, color: "var(--muted2)" }}>No active subscription.</div>
          )}
        </div>
      </div>

      {/* Invoice history */}
      <div className="card" style={{ marginBottom: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Invoice History
          </span>
          {!invoicesLoaded && (
            <button className="btn btn-ghost" style={{ fontSize: 10, padding: "4px 10px" }} onClick={loadInvoices}>
              Load invoices
            </button>
          )}
        </div>
        {invoicesLoaded && (
          <table className="table">
            <thead>
              <tr><th>Invoice</th><th>Status</th><th>Amount</th><th>Period</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted2)", padding: 16 }}>No invoices</td></tr>
              )}
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted2)" }}>
                    {inv.number ?? inv.id.slice(0, 12)}
                  </td>
                  <td>
                    <span className={`badge ${inv.status === "paid" ? "badge-green" : inv.status === "open" ? "badge-yellow" : "badge-muted"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--accent)" }}>
                    ${(inv.amountPaid / 100).toFixed(2)}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(inv.periodStart).toLocaleDateString()} – {new Date(inv.periodEnd).toLocaleDateString()}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(inv.created).toLocaleDateString()}
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {inv.hostedUrl && (
                      <a href={inv.hostedUrl} target="_blank" rel="noreferrer"
                        className="btn btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }}>
                        View
                      </a>
                    )}
                    <button className="btn btn-ghost" style={{ fontSize: 10, padding: "3px 8px" }}
                      disabled={resendingId === inv.id}
                      onClick={() => resendInvoice(inv.id)}>
                      {resendingId === inv.id ? "…" : "Resend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent logs */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Recent Requests (last 20)
          </span>
        </div>
        <table className="table">
          <thead><tr><th>Model</th><th>Status</th><th>Latency</th><th>Cost</th><th>Test</th><th>When</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ fontSize: 11 }}>{l.model}</td>
                <td><span className={`badge ${l.status < 400 ? "badge-green" : "badge-red"}`}>{l.status}</span></td>
                <td style={{ color: "var(--muted)" }}>{l.latencyMs}ms</td>
                <td style={{ color: "var(--muted)" }}>${l.costUsd.toFixed(4)}</td>
                <td>{l.isTestMode ? <span className="badge badge-muted">test</span> : "—"}</td>
                <td style={{ color: "var(--muted)", fontSize: 11 }}>{new Date(l.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No requests yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
