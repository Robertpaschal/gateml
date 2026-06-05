"use client";
import { useState, useEffect } from "react";

export function useToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(/gateml_token=([^;]+)/);
    const tok = match?.[1] ?? localStorage.getItem("gateml_token");
    setToken(tok ?? null);
  }, []);

  return token;
}
