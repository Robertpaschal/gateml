"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams }                from "next/navigation";
import Link                               from "next/link";

type State = "loading" | "success" | "already" | "error";

function UnsubscribeContent() {
  const params = useSearchParams();
  const [state,   setState]   = useState<State>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const e = params.get("e");
    const t = params.get("t");

    if (!e || !t) {
      setState("error");
      setMessage("This unsubscribe link is missing required parameters.");
      return;
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    fetch(`${apiBase}/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`)
      .then(async res => {
        if (!res.ok) {
          setState("error");
          setMessage("This unsubscribe link is invalid or has expired.");
        } else {
          const text = await res.text();
          if (text.includes("Already")) {
            setState("already");
            setMessage("You are already opted out of GateML marketing emails.");
          } else {
            setState("success");
            setMessage("You have been removed from GateML marketing emails.");
          }
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Something went wrong. Please try again later.");
      });
  }, [params]);

  const heading = { loading: "Processing…", success: "Unsubscribed", already: "Already Unsubscribed", error: "Invalid Link" }[state];
  const isOk    = state === "success" || state === "already";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0d", padding: 24 }}>
      <div style={{ maxWidth: 440, width: "100%", background: "#111318", border: "1px solid #1e2430", borderRadius: 12, padding: "44px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".05em", color: "#7c3aed", marginBottom: 24 }}>GateML</div>

        <div style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          background: isOk ? "rgba(22,163,74,.12)" : "rgba(220,38,38,.12)",
          color: isOk ? "#16a34a" : "#dc2626",
        }}>
          {state === "loading" ? "…" : isOk ? "✓" : "✗"}
        </div>

        <h1 style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{heading}</h1>
        <p style={{ fontSize: 13, color: "#6b7a96", lineHeight: 1.65, marginBottom: 20 }}>
          {state === "loading" ? "Please wait…" : message}
        </p>

        {state !== "loading" && (
          <p style={{ fontSize: 12, color: "#6b7a96", marginBottom: 28 }}>
            You will still receive essential account emails like invoices, security alerts, and password resets.
          </p>
        )}

        <Link href="/" style={{ display: "inline-block", padding: "10px 22px", background: "#7c3aed", color: "#fff", borderRadius: 7, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
          Return to GateML
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0b0d", color: "#6b7a96", fontSize: 13 }}>
        Loading…
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
