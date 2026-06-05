import Link from "next/link";

export function Navbar() {
  return (
    <header className="site-nav">
      <Link href="/" className="site-nav-logo">GateML</Link>

      <nav className="site-nav-links">
        <Link href="/docs">Docs</Link>
        <Link href="/docs/sdk">SDKs</Link>
        <Link href="/changelog">Changelog</Link>
        <Link href="/#pricing">Pricing</Link>
      </nav>

      <div className="site-nav-right">
        <Link href="/auth" className="btn btn-ghost" style={{ fontSize: 12 }}>Sign in</Link>
        <Link href="/auth" className="btn btn-primary" style={{ fontSize: 12 }}>
          Get started free
        </Link>
      </div>
    </header>
  );
}
