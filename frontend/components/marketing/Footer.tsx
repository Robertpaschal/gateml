import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">GateML</div>
          <p className="footer-tagline">
            AI infrastructure for developers. Route, observe, and control every LLM call from one place.
          </p>
          <div style={{ marginTop: 16, fontSize: 11, color: "var(--muted2)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block", marginRight: 6 }} />
            api.gateml.io operational
          </div>
        </div>

        <div className="footer-col">
          <div className="footer-col-title">Product</div>
          <Link href="/docs/quickstart">Quickstart</Link>
          <Link href="/docs/sdk">SDKs</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/changelog">Changelog</Link>
        </div>

        <div className="footer-col">
          <div className="footer-col-title">Developers</div>
          <Link href="/docs">Documentation</Link>
          <Link href="/docs/sdk">API Reference</Link>
          <a href="https://github.com/gateml" target="_blank" rel="noreferrer">GitHub</a>
          <Link href="/dashboard">Dashboard</Link>
        </div>

        <div className="footer-col">
          <div className="footer-col-title">Company</div>
          <a href="#">Blog</a>
          <a href="#">Twitter / X</a>
          <a href="#">Discord</a>
          <a href="mailto:hello@gateml.io">Contact</a>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 GateML. All rights reserved.</span>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="#" style={{ color: "var(--muted2)", textDecoration: "none" }}>Privacy</a>
          <a href="#" style={{ color: "var(--muted2)", textDecoration: "none" }}>Terms</a>
        </div>
      </div>
    </footer>
  );
}
