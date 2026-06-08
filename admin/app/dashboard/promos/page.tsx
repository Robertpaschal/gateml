"use client";
import { useEffect, useState } from "react";
import { promosApi, type PromoCode } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

export default function PromosPage() {
  const [codes,    setCodes]    = useState<PromoCode[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", discountPercent: "20", maxUses: "", validUntil: "",
  });

  const token = getAdminToken()!;

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await promosApi.list(token);
      setCodes(data.codes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await promosApi.create(token, {
        code:            form.code,
        description:     form.description || undefined,
        discountPercent: parseInt(form.discountPercent, 10),
        maxUses:         form.maxUses ? parseInt(form.maxUses, 10) : undefined,
        validUntil:      form.validUntil || undefined,
      });
      setForm({ code: "", description: "", discountPercent: "20", maxUses: "", validUntil: "" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create promo code");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await promosApi.toggle(token, id, !current);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update promo code");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Promo Codes</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Codes sync to Stripe coupons automatically — use at checkout via{" "}
          <code style={{ fontSize: 10, background: "var(--surface2)", padding: "2px 6px", borderRadius: 4 }}>allow_promotion_codes</code>
        </span>
      </div>

      {error && <div style={{ color: "var(--red)", marginBottom: 16, fontSize: 12 }}>{error}</div>}

      {/* Create form */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Create Promo Code
        </div>
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Code</label>
              <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="LAUNCH20" required pattern="[A-Z0-9_\-]+" style={{ width: "100%", textTransform: "uppercase", fontFamily: "monospace" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Discount %</label>
              <input type="number" min="1" max="100" value={form.discountPercent}
                onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))}
                required style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Max Uses (blank = unlimited)</label>
              <input type="number" min="1" value={form.maxUses}
                onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
                placeholder="—" style={{ width: "100%" }} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Description (internal)</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Summer launch discount" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Valid Until (optional)</label>
              <input type="datetime-local" value={form.validUntil}
                onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                style={{ width: "100%" }} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Creating…" : "Create Code"}
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            All Codes ({codes.length})
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Uses</th>
                <th>Valid Until</th>
                <th>Stripe Coupon</th>
                <th>Status</th>
                <th>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No promo codes yet</td></tr>
              )}
              {codes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.05em" }}>{c.code}</td>
                  <td style={{ color: "var(--accent)", fontWeight: 600 }}>{c.discountPercent}% off</td>
                  <td style={{ color: "var(--muted)", fontSize: 11 }}>
                    {c.usedCount}{c.maxUses !== null ? ` / ${c.maxUses}` : " / ∞"}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 11 }}>
                    {c.validUntil ? new Date(c.validUntil).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ fontSize: 10, fontFamily: "monospace", color: "var(--muted)" }}>
                    {c.stripeCouponId ?? "—"}
                  </td>
                  <td>
                    <span className={`badge ${c.isActive ? "badge-green" : "badge-muted"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn ${c.isActive ? "btn-ghost" : "btn-primary"}`}
                      style={{ fontSize: 10, padding: "4px 10px" }}
                      onClick={() => handleToggle(c.id, c.isActive)}
                    >
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
