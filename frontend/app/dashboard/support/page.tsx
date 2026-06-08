import type { Metadata } from "next";
import { SupportPage } from "@/src/views/SupportPage";

export const metadata: Metadata = { title: "Support" };

export default function Support() {
  return <SupportPage />;
}
