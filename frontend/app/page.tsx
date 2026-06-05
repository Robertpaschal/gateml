import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Hero } from "@/components/marketing/Hero";
import { Features } from "@/components/marketing/Features";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CodeShowcase } from "@/components/marketing/CodeShowcase";
import { Pricing } from "@/components/marketing/Pricing";
import { ChangelogPreview } from "@/components/marketing/ChangelogPreview";
import { Footer } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "GateML — AI Gateway for Developers",
  description:
    "Route every LLM call through one gateway. Automatic fallback, real-time observability, and prompt versioning — change one line of code.",
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CodeShowcase />
        <Pricing />
        <ChangelogPreview />
      </main>
      <Footer />
    </>
  );
}
