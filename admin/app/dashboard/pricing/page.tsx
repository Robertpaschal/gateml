"use client";
import { useEffect, useState } from "react";
import {
  billingConfigApi, billingProductsApi, customPlansApi,
  type BillingConfig, type AdminBillingProduct, type CustomPlanAssignment,
} from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

// ── Config section ─────────────────────────────────────────────────────────────

function ConfigSection({ token }: { token: string }) {
  const [cfg,     setCfg]     = useState<BillingConfig | null>(null);
  const [form,    setForm]    = useState({ trialDays: "7", paygRateProUsd: "0.001", paygRateFreeUsd: "0.002", managedMarkupPercent: "20" });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    billingConfigApi.get(token).then(c => {
      setCfg(c);
      setForm({
        trialDays:            String(c.trialDays),
        paygRateProUsd:       String(c.paygRateProUsd),
        paygRateFreeUsd:      String(c.paygRateFreeUsd),
        managedMarkupPercent: String(c.managedMarkupPercent),
      });
    }).catch(() => setError("Failed to load billing config"));
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const updated = await billingConfigApi.update(token, {
        trialDays:            parseInt(form.trialDays, 10),
        paygRateProUsd:       parseFloat(form.paygRateProUsd),
        paygRateFreeUsd:      parseFloat(form.paygRateFreeUsd),
        managedMarkupPercent: parseInt(form.managedMarkupPercent, 10),
      });
      setCfg(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return <div style={{ color: "var(--muted)", fontSize: 12 }}>{error || "Loading…"}</div>;

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Global Billing Configuration
      </div>
      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Field label="Trial Days (0 = no trial)" hint="Applied at checkout for all Pro plans">
            <input type="number" min="0" max="365" value={form.trialDays}
              onChange={e => setForm(p => ({ ...p, trialDays: e.target.value }))} style={{ width: "100%" }} />
          </Field>
          <Field label="PAYG Rate — Pro (USD/req)" hint="Per-request charge for Pro plan overages">
            <input type="number" min="0" step="0.0001" value={form.paygRateProUsd}
              onChange={e => setForm(p => ({ ...p, paygRateProUsd: e.target.value }))} style={{ width: "100%" }} />
          </Field>
          <Field label="PAYG Rate — Free (USD/req)" hint="Per-request charge for Free plan overages">
            <input type="number" min="0" step="0.0001" value={form.paygRateFreeUsd}
              onChange={e => setForm(p => ({ ...p, paygRateFreeUsd: e.target.value }))} style={{ width: "100%" }} />
          </Field>
          <Field label="Managed Key Markup %" hint="Markup applied on top of provider cost">
            <input type="number" min="0" max="100" value={form.managedMarkupPercent}
              onChange={e => setForm(p => ({ ...p, managedMarkupPercent: e.target.value }))} style={{ width: "100%" }} />
          </Field>
        </div>
        {error && <div style={{ color: "var(--red)", fontSize: 11, marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ fontSize: 11 }}>
            {saving ? "Saving…" : "Save configuration"}
          </button>
          {saved && <span style={{ fontSize: 11, color: "var(--accent)" }}>Saved · takes effect within 5 minutes</span>}
        </div>
      </form>
      <div style={{ marginTop: 12, fontSize: 10, color: "var(--muted2)" }}>
        Changes apply to new checkouts immediately. PAYG/managed rates take effect on the next invoice cycle.
        Config is cached for 5 minutes on the server.
      </div>
    </div>
  );
}

// ── Products section ───────────────────────────────────────────────────────────

function ProductsSection({ token }: { token: string }) {
  const [products,  setProducts]  = useState<AdminBillingProduct[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [creating,  setCreating]  = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", planType: "PRO", interval: "month",
    amountCents: "1900", isPublic: "true", trialDays: "", notes: "",
    stripePriceId: "", // optional — leave blank to auto-create in Stripe
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setProducts(await billingProductsApi.list(token));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally { setLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setError("");
    try {
      await billingProductsApi.create(token, {
        name:          form.name,
        description:   form.description || undefined,
        planType:      form.planType,
        interval:      form.interval as "month" | "year",
        amountCents:   parseInt(form.amountCents, 10),
        isPublic:      form.isPublic === "true",
        trialDays:     form.trialDays ? parseInt(form.trialDays, 10) : undefined,
        notes:         form.notes || undefined,
        stripePriceId: form.stripePriceId || undefined,
      });
      setForm({ name: "", description: "", planType: "PRO", interval: "month", amountCents: "1900", isPublic: "true", trialDays: "", notes: "", stripePriceId: "" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create product");
    } finally { setCreating(false); }
  }

  async function handleToggle(id: string, current: boolean) {
    try {
      await billingProductsApi.toggle(token, id, !current);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Create form */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Create Billing Product
          <span style={{ marginLeft: 8, fontWeight: 400, textTransform: "none" }}>
            · creates a Stripe Product + Price, stores price ID in catalog
          </span>
        </div>
        <form onSubmit={handleCreate}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Name">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Custom Enterprise — ACME Corp" required style={{ width: "100%" }} />
            </Field>
            <Field label="Plan Type">
              <select value={form.planType} onChange={e => setForm(p => ({ ...p, planType: e.target.value }))} style={{ width: "100%" }}>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </Field>
            <Field label="Interval">
              <select value={form.interval} onChange={e => setForm(p => ({ ...p, interval: e.target.value }))} style={{ width: "100%" }}>
                <option value="month">Monthly</option>
                <option value="year">Annual</option>
              </select>
            </Field>
            <Field label="Amount (cents)" hint="e.g. 1900 = $19.00">
              <input type="number" min="50" value={form.amountCents}
                onChange={e => setForm(p => ({ ...p, amountCents: e.target.value }))} required style={{ width: "100%" }} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr", gap: 12, marginBottom: 16 }}>
            <Field label="Visibility">
              <select value={form.isPublic} onChange={e => setForm(p => ({ ...p, isPublic: e.target.value }))} style={{ width: "100%" }}>
                <option value="true">Public (shown to all)</option>
                <option value="false">Private (custom assign only)</option>
              </select>
            </Field>
            <Field label="Trial Days override" hint="Blank = use global config">
              <input type="number" min="0" max="365" value={form.trialDays}
                onChange={e => setForm(p => ({ ...p, trialDays: e.target.value }))}
                placeholder="—" style={{ width: "100%" }} />
            </Field>
            <Field label="Internal notes">
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="ACME Corp deal — $200/mo" style={{ width: "100%" }} />
            </Field>
            <Field label="Existing Stripe Price ID" hint="Leave blank to auto-create in Stripe">
              <input value={form.stripePriceId} onChange={e => setForm(p => ({ ...p, stripePriceId: e.target.value }))}
                placeholder="price_… (optional)" style={{ width: "100%", fontFamily: "monospace", fontSize: 11 }} />
            </Field>
            <Field label="Description (shown in Stripe)">
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description" style={{ width: "100%" }} />
            </Field>
          </div>
          {error && <div style={{ color: "var(--red)", fontSize: 11, marginBottom: 8 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={creating} style={{ fontSize: 11 }}>
            {creating ? "Creating in Stripe…" : "Create product"}
          </button>
        </form>
      </div>

      {/* Products table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Product Catalog ({products.length})
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th>Price</th>
                <th>Interval</th>
                <th>Trial</th>
                <th>Visibility</th>
                <th>Stripe Price ID</th>
                <th>Assignments</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No products yet</td></tr>
              )}
              {products.map(p => (
                <tr key={p.id} style={{ opacity: p.isActive ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>
                    {p.name}
                    {p.notes && <div style={{ fontSize: 10, color: "var(--muted2)", fontWeight: 400 }}>{p.notes}</div>}
                  </td>
                  <td>
                    <span className={`badge ${p.planType === "ENTERPRISE" ? "badge-blue" : "badge-green"}`}>
                      {p.planType}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--accent)" }}>
                    ${(p.amountCents / 100).toFixed(2)}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 11 }}>{p.interval}</td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>{p.trialDays}d</td>
                  <td>
                    <span className={`badge ${p.isPublic ? "badge-green" : "badge-muted"}`}>
                      {p.isPublic ? "Public" : "Private"}
                    </span>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 10, color: "var(--muted2)" }}>
                    {p.stripePriceId}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
                    {p._count.customAssignments}
                  </td>
                  <td>
                    <span className={`badge ${p.isActive ? "badge-green" : "badge-muted"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn ${p.isActive ? "btn-ghost" : "btn-primary"}`}
                      style={{ fontSize: 10, padding: "4px 10px" }}
                      onClick={() => handleToggle(p.id, p.isActive)}
                    >
                      {p.isActive ? "Deactivate" : "Activate"}
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

// ── Custom assignments section ─────────────────────────────────────────────────

function AssignmentsSection({ token, products }: { token: string; products: AdminBillingProduct[] }) {
  const [assignments, setAssignments] = useState<CustomPlanAssignment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [form, setForm] = useState({ userId: "", productId: "", notes: "" });
  const [assigning,   setAssigning]   = useState(false);

  const privateProducts = products.filter(p => p.isActive);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setAssignments(await customPlansApi.list(token)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed to load assignments"); }
    finally { setLoading(false); }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssigning(true); setError("");
    try {
      await customPlansApi.assign(token, { userId: form.userId, productId: form.productId, notes: form.notes || undefined });
      setForm({ userId: "", productId: "", notes: "" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to assign");
    } finally { setAssigning(false); }
  }

  async function handleRemove(userId: string) {
    try {
      await customPlansApi.remove(token, userId);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Assign Custom Plan to User
        </div>
        <form onSubmit={handleAssign}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="User ID">
              <input value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))}
                placeholder="cuid2 user ID (from Users page)" required style={{ width: "100%", fontFamily: "monospace", fontSize: 11 }} />
            </Field>
            <Field label="Product">
              <select value={form.productId} onChange={e => setForm(p => ({ ...p, productId: e.target.value }))} required style={{ width: "100%" }}>
                <option value="">— select product —</option>
                {privateProducts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} · ${(p.amountCents / 100).toFixed(2)}/{p.interval}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes (optional)">
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="ACME Corp deal" style={{ width: "100%" }} />
            </Field>
          </div>
          {error && <div style={{ color: "var(--red)", fontSize: 11, marginBottom: 8 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={assigning} style={{ fontSize: 11 }}>
            {assigning ? "Assigning…" : "Assign plan"}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Active Custom Assignments ({assignments.length})
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "var(--muted)", fontSize: 12 }}>Loading…</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Product</th>
                <th>Price</th>
                <th>Assigned</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted2)", padding: 20 }}>No custom assignments</td></tr>
              )}
              {assignments.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{a.user.email}</div>
                    <div style={{ fontSize: 10, color: "var(--muted2)", fontFamily: "monospace" }}>{a.userId}</div>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 12 }}>{a.product.name}</td>
                  <td style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>
                    ${(a.product.amountCents / 100).toFixed(2)}/{a.product.interval}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted)" }}>
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ fontSize: 11, color: "var(--muted2)" }}>{a.notes ?? "—"}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ fontSize: 10, padding: "4px 10px", color: "var(--red)" }}
                      onClick={() => handleRemove(a.userId)}>
                      Remove
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

// ── Field helper ───────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: "var(--muted2)", fontSize: 10, marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const token    = getAdminToken()!;
  const [products, setProducts] = useState<AdminBillingProduct[]>([]);

  // Load products once so AssignmentsSection can use them for the dropdown
  useEffect(() => {
    billingProductsApi.list(token).then(setProducts).catch(() => {});
  }, [token]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pricing</h1>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>
          Configure trial periods, PAYG rates, managed markup, and custom pricing plans —
          all synced with Stripe, no redeploy needed.
        </span>
      </div>

      <ConfigSection token={token} />

      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        Product Catalog
      </div>
      <ProductsSection token={token} />

      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, marginTop: 8 }}>
        Custom Plan Assignments
      </div>
      <AssignmentsSection token={token} products={products} />
    </div>
  );
}
