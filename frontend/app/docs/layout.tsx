import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: { default: "Docs — GateML", template: "%s — GateML Docs" },
};

const LINKS = [
  { section: "Getting started", items: [
    { href: "/docs", label: "Overview" },
    { href: "/docs/quickstart", label: "Quickstart" },
  ]},
  { section: "SDKs", items: [
    { href: "/docs/sdk", label: "All SDKs" },
    { href: "/docs/sdk#python", label: "Python" },
    { href: "/docs/sdk#typescript", label: "TypeScript" },
    { href: "/docs/sdk#go", label: "Go" },
    { href: "/docs/sdk#ruby", label: "Ruby" },
    { href: "/docs/sdk#php", label: "PHP" },
  ]},
  { section: "Reference", items: [
    { href: "/docs/sdk#curl", label: "REST API" },
    { href: "/changelog", label: "Changelog" },
  ]},
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="docs-shell">
        <aside className="docs-sidebar">
          {LINKS.map(group => (
            <div key={group.section}>
              <div className="docs-sidebar-section">{group.section}</div>
              {group.items.map(item => (
                <Link key={item.href} href={item.href} className="docs-sidebar-link">
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </aside>
        <main>{children}</main>
      </div>
      <Footer />
    </>
  );
}
