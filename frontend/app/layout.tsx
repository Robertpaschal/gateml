import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gateml.io"),
  title: { default: "GateML — AI Gateway for Developers", template: "%s | GateML" },
  description:
    "Route every LLM call through one gateway. Automatic fallback, real-time observability, and prompt versioning — change one line of code.",
  keywords: ["LLM gateway", "AI infrastructure", "OpenAI proxy", "Anthropic", "LLM routing", "AI observability"],
  authors: [{ name: "GateML" }],
  openGraph: {
    type: "website",
    siteName: "GateML",
    title: "GateML — AI Gateway for Developers",
    description: "Route every LLM call through one gateway. Automatic fallback, real-time observability, and prompt versioning.",
    url: "https://gateml.io",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GateML" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GateML — AI Gateway for Developers",
    description: "Route every LLM call through one gateway. Automatic fallback, real-time observability.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
