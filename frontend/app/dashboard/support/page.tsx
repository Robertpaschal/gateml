import type { Metadata } from "next";
import { SupportPage } from "@/src/pages/SupportPage";

export const metadata: Metadata = { title: "Support" };

export default function Support() {
  return <SupportPage />;
}
