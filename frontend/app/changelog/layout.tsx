import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — GateML",
  description: "What's new in GateML — release notes, new features, and improvements.",
  openGraph: {
    title: "GateML Changelog",
    description: "What's new in GateML — release notes, new features, and improvements.",
  },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
