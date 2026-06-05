import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign in — GateML",
  description: "Sign in or create your GateML account to get your API key.",
};

export default function AuthPage() {
  return <AuthForm />;
}
